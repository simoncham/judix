/**
 * api - the component to proxy the remote services 
 */

const util = require('./util')
const axios = require('axios')

/**
 * api - package the requests to the url as api calls
 */
const api = {}

/**
 * get array of dateCode (dateRange).
 * @returns [string] - dateRange
 */
api.getDateRange = async function() {
  let url = "https://e-services.judiciary.hk/dcl/index.jsp?lang=tc"
  try {
    let  res = await axios.get(url,util.axiosParams)
    let dateRange =  await util.htmlParser.dateRange(res.data) 
    return dateRange
  } catch(e) {
    console.log('!!(error): api.getDateRange:',e.toString())
    return {error:e}
  }
}

/**
 * get array of avail courts of a `dateCode`
 * @param {string} dateCode 
 * @returns {[object]}
 */
api.getAvailCourtsByDateCode = async function(dateCode) {
  let result = []
  if(!dateCode) { console.log('dateCode is require'); return result}
  let url = `https://e-services.judiciary.hk/dcl/index.jsp?lang=tc&date=${dateCode}&mode=view`

  try {
    let  res = await axios.get(url,util.axiosParams)
    let courts = await util.htmlParser.availCourts(res.data)//  parseCourtsArray(res.data)
    return courts
  } catch(e) {
    console.log('!!(error): api.getAvailCourtsByDateCode:',e.toString(),'url:',url)
    return {error:e}
  }
}

/**
 * get the result object of the causes list 
 * @param {*} dateCode 
 * @param {*} courtCode 
 * @returns 
 */
api.getCausesByDateCodeAndCourtCode = async function(dateCode,courtCode) {
  let result = {}
  if(!dateCode) {console.log('dateCode is required.');return result}
  if(!courtCode) {console.log('courtCode is required.');return result}

  let url =`https://e-services.judiciary.hk/dcl/view.jsp?lang=tc&date=${dateCode}&court=${courtCode}`
  try {
    let  res = await axios.get(url,util.axiosParams)
    let result = await util.htmlParser.causes(res.data,courtCode) //parseCauses(res.data)
    result.dateCode = dateCode
    result.courtCode = courtCode
    result.source = url
    return result
  } catch(e) {
    console.log('!!(error): api.getCausesByDateCodeAndCourtCode:',e,'url:',url)
    return {error:e}
  }
}


module.exports = api