console.log('initialize ...')
const util = require('./lib/util')
const api = require('./lib/api')

var _start = Date.now()
var stat = {total:0,ok:0,failure:0,notimpl:0,ts:0}
var _out_dir = '' 
var _error = ''
let __flush = false
let __flush_only = false
let __date_range = false
let __show_detail = true
let __show_help = false
let __to_serialize_json = false
let __to_serialize_xlsx = true

/**
 * main autmation process
 * @returns 
 */
async function main() {
  _out_dir = await util.outputDir()
  if(__show_detail) console.log('loading available date-range from the source server ..')
  else console.log('processing ...')  
  let dateRange = await api.getDateRange()
  if(dateRange.error) {_error = dateRange.error; return }
  if(__show_detail) console.log('','available date-range:',dateRange)

  dateRange.map(async function(dateCode){
    await util.delay()
    let courts = await api.getAvailCourtsByDateCode(dateCode) 
    if(courts.error) return
    courts.map(async function(court) {
      stat.total++
      //if((court.code!='KTMAG')||(dateCode!='16042021')) return  //!debug use
      try {
        await util.delay()  
        let result = await api.getCausesByDateCodeAndCourtCode(dateCode,court.code)
        if(result.error) {
          if(result.error=='not-implemented') {
            stat.notimpl++
            if(__show_detail) console.log('processing',dateCode,`${util.padright(court.code)}`,['not-implemented'])
          } else {
            stat.failure++
            if(__show_detail) console.log('processing',dateCode,`${util.padright(court.code)}`,result.error)
          }
        } else {
          if(__to_serialize_json) await util.serializeJson(result)
          if(__to_serialize_xlsx) await util.serializeXls(result)
          stat.ok++
          if(__show_detail) console.log('processing',dateCode,`${util.padright(court.code)}`,`☑︎`)
        }
      } catch(e) {
        stat.failure++
        if(__show_detail) console.log('processing',dateCode,`${util.padright(court.code)}`, 'error',e.toString())
      }
    })
  })
}

/**
 * flush the output dir
 */
async function flush(){
  let _out_dir = await util.outputDir()
  console.log('flushing ... (',_out_dir,')')
  return await util.flush()
}

/**
 * show
 * @returns 
 */
async function show_help(){
  console.log(`[USAGE]`,`node judix`)
  console.log(``)
  console.log(`node judix --help \t help message`)
  console.log(`node judix <option>`)
  console.log('')
  console.log(`<option>:`)
  console.log(``,`--flush \t flush the output dir before any action`)
  console.log(``,`--flush-only \t only flush the output dir. No further actions.`)
  console.log(``,`--json \t generate the corresponding JSON.`)
  console.log(``,`--no-json \t doesn't generate the corresponding JSON. (default)`)
  console.log(``,`--xlsx \t generate the corresponding Xlsx. (default)`)
  console.log(``,`--no-xlsx \t doesn't generate the corresponding Xlsx.`)
  console.log(``,`--show-detail \t display process detail message. (default)`)
  console.log(``,`--hide-detail \t doesn't display process detail message.`)

  return
}

/**
 * entry point of the process 
 * @returns 
 */
async function start(){

  process.argv.map(a=>{
    if(a=='--help')  {__show_help = true}
    if(a=='--flush') { __flush = true}
    if(a=='--flush-only') { __flush_only = true}
    if(a=='--date-range-only') { __date_range = true }
    if(a=='--show-detail') { __show_detail = true }
    if(a=='--hide-detail') { __show_detail = false }
    if(a=='--json') { __to_serialize_json = true }
    if(a=='--no-json') { __to_serialize_json = false }
    if(a=='--xlsx') { __to_serialize_xlsx = true }
    if(a=='--no-xlsx') { __to_serialize_xlsx = false }
  })
  if(__show_help) {show_help()} 
  else if(__flush_only) {
    __to_serialize_json = false
    __to_serialize_xlsx = false
    await flush()
  } 
  else {
    if(__flush) await flush()
    if(__date_range) {
      let dateRange = await api.getDateRange()
      if(dateRange.error) return
      console.log('dateRange:',dateRange)
    } else {
      await main()
    }
  }
}

/**
 * before exit event
 */
process.on('beforeExit', async (code) => {
  if(__show_help){
    console.log();
  } else {
    if(!_error && __to_serialize_xlsx) console.log('saving the excel files in',[_out_dir])  
    if(!_error && __to_serialize_json) console.log('saving the json files in',[_out_dir])  
    let _end = Date.now()
    let ts = _end - _start
    if(ts<1000) stat.ts = `${ts} ms`
    else stat.ts = `${parseInt(ts/1000)} s`
    if(_error ) {
      console.log('terminated.', `(${stat.ts})`)
    } else {
      console.log('completed', stat)
    }
    console.log('')
  }
  
});

start()

