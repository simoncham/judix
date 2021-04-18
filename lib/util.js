/**
 * util lib
 */
const package = require("./../package.json") 
const LinkeDom = require('linkedom')
const parseHTML = LinkeDom.parseHTML
const fs = require('fs/promises')
const path = require('path')
const exceljs = require('exceljs')

var __delay = 0   // accumunitive delay timespan


/**
 * internal helper to parse the TD element and return `{time,publicity}`
 * @param {object} elTD HTML TD element containing time info 
 * @returns {object}
 */
function parseTimePublicityFromTd(elTD) {
  let p = elTD.querySelectorAll("p")
  let tb = {time:'',publicity:''}
  tb.time = (p[1])?p[1].innerText.trim():''
  tb.publicity = (p[2])?p[2].innerText.trim():''
  if(p[3]) tb.publicity +=  ` ${p[3].innerText.trim()}`
  if(p[4]) tb.publicity +=  ` ${p[4].innerText.trim()}`
  if(p[5]) tb.publicity +=  ` ${p[5].innerText.trim()}`
  tb.publicity= tb.publicity.trim()
  return tb
}

/**
 * internal helper (method 2) to parse the TD element and return `{time,publicity}`
 * @param {object} elTD HTML TD element containing time info 
 * @returns {object}
 */

function parseTimePublicityFromTd2(elTD){
  let t = elTD.textContent //.split("\n")
  let tb = {time:'',publicity:''}
  //tb.time = (t[1])?t[1].innerText.trim():''
  tb.time = t.trim().replace("上午","").replace("下午","")
  return tb
}

/**
 * internal helper for `util.delay()` 
 * @param {number} ms 
 * @returns 
 */
const timeout = ms => new Promise(res => setTimeout(res, ms))


const util = {}

/**
 * 
 * @param {string} s the string to be padded
 * @param {number} i the length of the width of the string with padding 
 * @returns 
 */
util.padright = function(s,i) {
  if(!i) i = 7
  if(!s) s=""
  s = s.trim()
  if(s.length <i) {
    s = s + " ".repeat(i-s.length)
  }
  return s
}

/**
 * get the absolute path of output dir which is defined at the property `_output` in `package.json`.
 * @returns {string} the absolute path of the output directory
 */
util.outputDir = async function() {
  let _out_dir = path.resolve(path.resolve(__dirname, "./../"), package._output)
  try { await fs.mkdir(_out_dir) } 
  catch(e) { /* do nothing */ }
  return _out_dir
}

/**
 * flush (empty) the `output` dir.
 */
util.flush = async function(){
  let _out_dir = await util.outputDir()
  //console.log('removing',_out_dir)
  try {
    await fs.rm(_out_dir,{recursive:true})
    return true
  } catch(e) {
    console.log('uitl.flush error:',e.toString())
    return false
  }
  

}

/**
 * delay an action follows.
 * @param {number} ms The number of ms to delay. if `ms` is `undefined`, default `_delay` value in `package.json` will be applied.  
 * @returns 
 */
util.delay = async function (ms) {
  let _default_delay = (package._delay||0) // default delay in ms
  if(!ms) ms= _default_delay
  
  if(ms) { // set delay
    __delay += ms
    await timeout(__delay)
    return true
  } else { // not set delay
    return true
  }
}


/**
 * user agent string (google chrome)
 */
util.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.128 Safari/537.36"

/**
 * default axios params for get request 
 */
util.axiosParams = {headers:{'User-Agent':util.ua}}

/**
 * time pattern
 */
util.patternTime = /[0-9]?[0-9]:[0-9][0-9]/


/**
 * Convert the `dateCode` to `SDate` format
 * @param {string} dateCode 
 * @returns {string} SDate 
 */
util.dateCodeToSDate = function(dateCode){
  let dd = dateCode.substr(0,2)
  let mm = dateCode.substr(2,2)
  let yyyy = dateCode.substr(-4)
  return (`${yyyy}-${mm}-${dd}`) 
}

/**
 * Reserve the `dateaCode`
 * @param {string} dateCode 
 * @returns {string} revered date code
 */
util.dateCodeReverse = function(dateCode) {
  let dd = dateCode.substr(0,2)
  let mm = dateCode.substr(2,2)
  let yyyy = dateCode.substr(-4)
  return (`${yyyy}${mm}${dd}`) 
}



util.htmlParser = {}

/**
 * parse the html to extract date range array
 * @param {string} html 
 * @returns {[string]} dateRange 
 */
util.htmlParser.dateRange = async function(html) {
  let dom = parseHTML(html)
  let document =  dom.document
  let dateRange = []
  let elDateTD = document.querySelectorAll("#dclDateOptions td")
  if(elDateTD) {
    elDateTD.forEach((el,i)=>{
      let dateCode = el.id.replace("dclDate","")
      dateRange.push(dateCode)
    })
  }
  return dateRange
}

/**
 * parse the html to extract the list of available Court ({code,name})
 * @param {string} html 
 * @returns {[object]} Courts
 */
util.htmlParser.availCourts = async function (html) {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = []
  doc.querySelectorAll('select#dclCourt option').forEach((e,i)=>{
    if(i>0) {
      let court = {code:e.getAttribute('value'),name:e.innerText.trim()}
      if(court.name.indexOf('☑︎')>=0) {
        result.push(court)
      }
    }
  })
  return result
}

/**
 * parse the html to extrct the causes list
 
 * @param {string} html 
 * @param {string} courtCode
 * @returns
 * 
 *  CLPI 高等法院 (內庭聆訊表 (人身傷亡案件))  
 *  CRC 死因裁判法庭 
 */
util.htmlParser.causes = async function(html,courtCode) {
  switch (courtCode) {
    case 'CLPI': case 'MCL': 
      return _causesFormatOne(html) 
      break;
    case 'BP':
        return _causesFormatOneVariant2(html) 
        break;
    case 'DC': case 'DCMC': // DCMC has minor bug
      return _causesFormatTwo(html)  
      break;
    case 'HCMC':
      return _causesFormatTwoVariant2(html)  
      break;
    case 'CRC':
      return _causesFormatThree(html) 
      break;
    case 'KTMAG': case 'TMMAG': case 'FLMAG': case 'WKMAG': case 'STMAG': case 'ETNMAG': case 'KCMAG':
      return _causesFormatFour(html) 
      break;
    //case 'LANDS': // FormatTwo with multiple table
    //case: 'ETNMAG' // FormatOne with multiple table
    //case: 'KTMAG' // FormatOne with multiple table
    default:
      return {error:'not-implemented'}
      break;
  }
}

/**
 * tabularize result object to another representation which is easily put into excel.
 * @param {object} result 
 * @returns {object}
 */
util.tabularize = async function(result) {
  let table = [] 
  let cols = result.detail.columns
  cols = cols.sort((a,b)=>{
    return (a.seq<b.seq)?-1:1
  })

  // add first row as header 
  let headerRow = []
  if(result.header.count_no) { headerRow.push(result.header.count_no.name||"")}
  if(result.header.master) { headerRow.push(result.header.master.name||"") }
  cols.map(col=>{ headerRow.push(col.name||"") })
  table.push(headerRow)

  // manipulate rows, merge the master data into details  
  let rows = result.detail.rows
  rows.map(row=>{
    let tr = []
    // master data 
    let masterRow = []
    if(result.header.count_no) { tr.push(result.header.count_no.value||"") }
    if(result.header.master) {tr.push(result.header.master.value||"") }
    // row data
    cols.map(col=>{ tr.push(row[col.key]||"") })
    table.push(tr)
  })
  return table
}


/**
 * serialize the `result` object into JSON file and store it in `output` dir.
 * @param {object} result Result object. 
 * @returns 
 */
util.serializeJson = async function(result) {
  if(!result) return
  if(!result.dateCode) return
  if(!result.courtCode) return
  
  let output_dir = await util.outputDir()
  let json_filename = `${util.dateCodeReverse(result.dateCode)}-${result.courtCode}.json`
  let json_filepath = path.resolve(output_dir,json_filename)
  
  let text = JSON.stringify(result,null,'  ')
  let err = await fs.writeFile(json_filepath,text,{encoding:'utf8',flag:'w'})
  
}

/**
 * serialize the `result` object into `xlsx` file and store it in the `output` dir.
 * @param {object} result 
 * @returns 
 */
util.serializeXls = async function (result) {
  if(!result) return
  if(!result.dateCode) return
  if(!result.courtCode) return
    
  let output_dir = await util.outputDir()
  let xls_filename = `${util.dateCodeReverse(result.dateCode)}-${result.courtCode}.xlsx`
  let xls_filepath = path.resolve(output_dir,xls_filename)
 
  let workbook = new exceljs.Workbook();
  let sheet = workbook.addWorksheet()
  let rows = await util.tabularize(result)
  sheet.addRows(rows)

  // format the first row 
  let xRow = sheet.getRow(1)
  for(let i = 1;i<=xRow.cellCount;i++) {
    xRow.getCell(i).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFFF00'}, bgColor:{argb:'FFFF00'}}  
  }
  sheet.views = [{state:'frozen',ySplit:1}]
  
  await workbook.xlsx.writeFile(xls_filepath);
}

/**
 * internal helper to parse the html with `Format One` layout and convert to `result` object`
 * @param {string} html 
 * @returns {object} Result object
 */
const _causesFormatOne = async function(html)  {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'time',name:'Time',seq:0},
    {key:'publicity',name:'Publicity',seq:1},
    {key:'case_no',name:'Case No',seq:2},
    {key:'parties',name:'Parties',seq:3},
    {key:'offences',name:'Offences/Nature',seq:4},
    {key:'representative',name:'Representative',seq:5} 
  ]

  let table = doc.querySelector("table") // the first table
  var t = [];
  let lastTimePublicity = {time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows

    // parsed line text
    let pattern = /Court No.:/i
    let pattern2 = /聆案官 :/i
    let sublines = e.textContent.trim().split('\n')
    sublines.map(subline=>{
      let m = subline.match(pattern)
      let m2 = subline.match(pattern2)
      if(m) {
        result.header.count_no={
          key:'court_no',
          name:'Court No',
          value:subline.trim(),
          seq:0
        }
      }
      if(m2) {
        result.header.master={
          key:'master',
          name:'Master',
          value:subline.trim(),
          seq:1
        }
      }
    })
    //console.log(i,result.header)

    let tds = e.querySelectorAll("td"); // columns
    let row = {time:'', publicity:'',case_no:'',parties:'',offences:'',representative:''}

    if(tds[1] && tds[1].innerText.trim()){

      let hasTime =  util.patternTime.test(tds[0].innerText)

      let hasLastTime = (lastTimePublicity.time)?true:false
      
      if(!hasTime && !hasLastTime) return
      if(hasTime) {
        let tb = parseTimePublicityFromTd(tds[0])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
      }
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[1].innerText.trim()
      row.parties = tds[2].innerText.trim()
      row.offences = tds[3].innerText.trim()
      row.representative = tds[4].innerText.trim()
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}

const _causesFormatOneVariant2 = async function(html)  {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'time',name:'Time',seq:0},
    {key:'publicity',name:'Publicity',seq:1},
    {key:'case_no',name:'Case No',seq:2},
    {key:'parties',name:'Parties',seq:3},
    {key:'representative',name:'Representative',seq:4} 
  ]

  let table = doc.querySelector("table") // the first table
  var t = [];
  let lastTimePublicity = {time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows

    // parsed line text
    let pattern = /Court No.:/i
    let pattern2 = /聆案官 :/i
    let sublines = e.textContent.trim().split('\n')
    sublines.map(subline=>{
      let m = subline.match(pattern)
      let m2 = subline.match(pattern2)
      if(m) {
        result.header.count_no={
          key:'court_no',
          name:'Court No',
          value:subline.trim(),
          seq:0
        }
      }
      if(m2) {
        result.header.master={
          key:'master',
          name:'Master',
          value:subline.trim(),
          seq:1
        }
      }
    })
    //console.log(i,result.header)

    let tds = e.querySelectorAll("td"); // columns
    let row = {time:'', publicity:'',case_no:'',parties:'',offences:'',representative:''}

    if(tds[1] && tds[1].innerText.trim()){

      let hasTime =  util.patternTime.test(tds[0].innerText)

      let hasLastTime = (lastTimePublicity.time)?true:false
      
      if(!hasTime && !hasLastTime) return
      if(hasTime) {
        let tb = parseTimePublicityFromTd(tds[0])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
      }
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[1].innerText.trim()
      row.parties = tds[2].innerText.trim()
      row.representative = tds[3].innerText.trim()
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}

/**
 * internal helper to parse the html with `Format Two` layout and convert to `result` object`
 * @param {string} html 
 * @returns {object} Result object
 */
const _causesFormatTwo = async function(html) {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'court_no',name:'Court No',seq:0},
    {key:'master',name:'Judge',seq:1},
    {key:'time',name:'Time',seq:2},
    {key:'publicity',name:'Publicity',seq:3},
    {key:'case_no',name:'Case No',seq:4},
    {key:'parties',name:'Parties',seq:5},
    {key:'offences',name:'Offences/Nature',seq:6},
    {key:'representative',name:'Representative',seq:7} 
  ]

  
  let table = doc.querySelector("table") // the first table
  var t = [];
  let lastTimePublicity = {court_no:'', master:'', time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows
    //console.log(e.textContent)
    let tds = e.querySelectorAll("td"); // columns
    //console.log(i,tds.length)
    if(tds.legnth<7) return
    let row = {court_no:'',master:'',time:'', publicity:'',case_no:'',parties:'',offences:'',representative:''}

    if(tds[3] && tds[3].innerText.trim()){
      //tds.map((td,j)=>{
      ///  console.log(i,j,td.innerText)
      //})
      let hasCourtNo = (tds[0]&&tds[0].innerText.trim())?true:false
      let hasMaster = (tds[1]&&tds[1].innerText.trim())?true:false
      let hasTime =  (tds[2])?(util.patternTime.test(tds[2].innerText)):false
      let hasLastTime = (lastTimePublicity.time)?true:false
      let hasCaseNo = (tds[3]&&tds[3].innerText.trim())?true:false
      //console.log(i,hasCourtNo,hasMaster,hasTime,hasLastTime,hasCaseNo)

      if(!hasTime && !hasLastTime) return
      if(hasCourtNo)  lastTimePublicity.court_no = tds[0].innerText.trim()
      if(hasMaster)  lastTimePublicity.master = tds[1].innerText.trim()
      if(hasTime) {
        let tb = parseTimePublicityFromTd(tds[2])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
        //console.log(i,lastTimePublicity)
      }
      row.court_no = lastTimePublicity.court_no
      row.master  = lastTimePublicity.master
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[3].innerText.trim()
      row.parties = tds[4].innerText.trim()
      row.offences = tds[5].innerText.trim()
      row.representative = tds[6].innerText.trim()
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}

const _causesFormatTwoVariant2 = async function(html) {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'court_no',name:'Court No',seq:0},
    {key:'master',name:'Judge',seq:1},
    {key:'time',name:'Time',seq:2},
    {key:'publicity',name:'Publicity',seq:3},
    {key:'case_no',name:'Case No',seq:4},
    {key:'parties',name:'Parties',seq:5},
    {key:'offences',name:'Offences/Nature',seq:6},
    {key:'representative',name:'Representative',seq:7} 
  ]

  
  let table = doc.querySelectorAll("table")[1] // the 2nd table
  var t = [];
  let lastTimePublicity = {court_no:'', master:'', time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows
    //console.log(e.textContent)
    let tds = e.querySelectorAll("td"); // columns
    //console.log(i,tds.length)
    if(tds.legnth<7) return
    let row = {court_no:'',master:'',time:'', publicity:'',case_no:'',parties:'',offences:'',representative:''}

    if(tds[3] && tds[3].innerText.trim()){
      //tds.map((td,j)=>{
      ///  console.log(i,j,td.innerText)
      //})
      let hasCourtNo = (tds[0]&&tds[0].innerText.trim())?true:false
      let hasMaster = (tds[1]&&tds[1].innerText.trim())?true:false
      let hasTime =  (tds[2])?(util.patternTime.test(tds[2].innerText)):false
      let hasLastTime = (lastTimePublicity.time)?true:false
      let hasCaseNo = (tds[3]&&tds[3].innerText.trim())?true:false
      //console.log(i,hasCourtNo,hasMaster,hasTime,hasLastTime,hasCaseNo)

      if(!hasTime && !hasLastTime) return
      if(hasCourtNo)  lastTimePublicity.court_no = tds[0].innerText.trim()
      if(hasMaster)  lastTimePublicity.master = tds[1].innerText.trim()
      if(hasTime) {
        let tb = parseTimePublicityFromTd(tds[2])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
        //console.log(i,lastTimePublicity)
      }
      row.court_no = lastTimePublicity.court_no
      row.master  = lastTimePublicity.master
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[3].innerText.trim()
      row.parties = tds[4].innerText.trim()
      row.offences = tds[5].innerText.trim()
      row.representative = tds[6].innerText.trim()
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}

const _causesFormatThree = async function(html) {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'court_no',name:'Court No',seq:0},
    {key:'master',name:'Coroner',seq:1},
    {key:'time',name:'Time',seq:2},
    {key:'publicity',name:'Publicity',seq:3},
    {key:'case_no',name:'Case No',seq:4},
    {key:'deceased',name:'Name of Deceased',seq:5},
    {key:'nature',name:'Nature',seq:6}
  ]

  
  let table = doc.querySelectorAll("table")[1] // the second table
  //console.log(table)
  var t = [];
  let lastTimePublicity = {court_no:'', master:'', time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows
    //console.log(i,e.textContent)
    let tds = e.querySelectorAll("td"); // columns
    if(tds.length<6) return
    //console.log(i,tds[0].textContent,tds[1].textContent,tds[2].textContent)
    
    let row = {court_no:'',master:'',time:'', publicity:'',case_no:'',deceased:'',nature:''}

    if(tds[3] && tds[3].innerText.trim()){
      //tds.map((td,j)=>{
      ///  console.log(i,j,td.innerText)
      //})
      let hasCourtNo = (tds[0]&&tds[0].innerText.trim())?true:false
      let hasMaster = (tds[1]&&tds[1].innerText.trim())?true:false
      let hasTime =  (tds[2])?(util.patternTime.test(tds[2].innerText)):false
      let hasLastTime = (lastTimePublicity.time)?true:false
      let hasCaseNo = (tds[3]&&tds[3].innerText.trim())?true:false
      //console.log(i,hasCourtNo,hasMaster,hasTime,hasLastTime,hasCaseNo)

      if(!hasTime && !hasLastTime) return

      if(hasCourtNo) lastTimePublicity.court_no = tds[0].innerText.trim()
      if(hasMaster)  lastTimePublicity.master = tds[1].innerText.trim()
      if(hasTime) {
        let tb = parseTimePublicityFromTd(tds[2])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
        //console.log(i,lastTimePublicity)
      }
      row.court_no = lastTimePublicity.court_no
      row.master  = lastTimePublicity.master
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[3].innerText.trim()
      row.deceased = tds[4].innerText.trim()
      row.nature = tds[5].innerText.trim()
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      //console.log(i,row)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}

const _causesFormatFour = async function(html) {
  let dom = parseHTML(html)
  let doc =  dom.document
  let result = {header:{},detail:{},cdate:new Date()}
  result.detail.columns = []
  result.detail.rows=[]

  result.detail.columns = [
    {key:'court_no',name:'Court No',seq:0},
    {key:'master',name:'Magistrate',seq:1},
    {key:'time',name:'Time',seq:2},
    {key:'publicity',name:'Publicity',seq:3},
    {key:'case_no',name:'Case No',seq:4},
    {key:'parties',name:'Defendant/Respondent',seq:5},
    {key:'offences',name:'Offences/Nature',seq:6},
    {key:'hearing',name:'Hearing',seq:7} 
  ]

  
  let table = doc.querySelector("table") // the first table
  var t = [];
  let lastTimePublicity = {court_no:'', master:'', time:'',publicity:''}

  table.querySelectorAll("tr").forEach((e,i)=>{ // loop for rows
    let tds = e.querySelectorAll("td"); // columns
    
    if(tds.length<4) return
    //console.log(i,tds.length,tds[3].innerText.trim())

    // parsed line text
    let pattern = /法庭 Court/i
    let pattern2 = /裁判官/i
    let subline = e.textContent.trim()
    
    let m = subline.match(pattern)
    let m2 = subline.match(pattern2)
    if(m) {
      lastTimePublicity.court_no = subline.split('\n')[1].trim()
    }
    if(m2) {
      lastTimePublicity.master = subline.split('\n')[1].trim()
    }
    

    let row = {court_no:'',master:'',time:'', publicity:'',case_no:'',parties:'',offences:'',hearing:''}

    if(tds[4] && tds[4].innerText.trim()){
      
      //let hasCourtNo = (tds[0]&&tds[0].innerText.trim())?true:false
      //let hasMaster = (tds[1]&&tds[1].innerText.trim())?true:false
      let hasTime =  (tds[3])?(util.patternTime.test(tds[3].innerText)):false
      let hasLastTime = (lastTimePublicity.time)?true:false
      let hasCaseNo = (tds[4]&&tds[4].innerText.trim())?true:false
      //console.log(i,hasTime,hasLastTime,hasCaseNo)

      if(!hasTime && !hasLastTime) return
      //if(hasCourtNo)  lastTimePublicity.court_no = tds[0].innerText.trim()
      //if(hasMaster)  lastTimePublicity.master = tds[1].innerText.trim()
      if(hasTime) {
        let tb = parseTimePublicityFromTd2(tds[3])
        lastTimePublicity.time = tb.time
        lastTimePublicity.publicity = tb.publicity
        //console.log(i,lastTimePublicity)
      }
      row.court_no = lastTimePublicity.court_no
      row.master  = lastTimePublicity.master
      row.time = lastTimePublicity.time
      row.publicity = lastTimePublicity.publicity
      row.case_no = tds[4].innerText.trim()
      row.parties = tds[5].textContent.trim().replace(/[\s][\s]+/g,' ')
      row.offences = tds[6].textContent.trim().replace(/[\s][\s]+/g,' ')
      row.hearing = tds[7].textContent.trim().replace(/[\s][\s]+/g,' ')
      //console.log(i,hasTime, hasLastTime, tds[0].innerText,tds[1].innerText)
      t.push(row)
    } 
    //console.log('-------------')
    //console.log(t)
  })
  result.detail.rows = t
  return result 
}
  

module.exports = util