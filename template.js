const getRequestHeader = require('getRequestHeader');
const getAllEventData = require('getAllEventData');
const parseUrl = require('parseUrl');
const setCookie = require('setCookie');
const getCookieValues = require('getCookieValues');
const makeString = require('makeString');
const sendHttpRequest = require('sendHttpRequest');
const encodeUriComponent = require('encodeUriComponent');
const JSON = require('JSON');
const createRegex = require('createRegex');
const testRegex = require('testRegex');
const getType = require('getType');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');

const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = isLoggingEnabled ? getRequestHeader('trace-id') : undefined;

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

const url = eventData.page_location || getRequestHeader('referer');

if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
  return data.gtmOnSuccess();
}

switch (data.type) {
  case 'pageView':
    handlePageViewEvent();
    data.gtmOnSuccess();
    break;
  case 'conversion':
    handleConversionEvent();
    if (data.useOptimisticScenario) {
      data.gtmOnSuccess();
    }
    break;
  default:
    data.gtmOnSuccess();
}

/**********************************************************************************************/
// Vendor related functions

function handlePageViewEvent() {
  const url = eventData.page_location || getRequestHeader('referer');
  if (url) {
    const searchParams = parseUrl(url).searchParams;
    const cidParamName = data.clickIdParameterName || 'at_gd';
    if (searchParams[cidParamName]) {
      const options = {
        domain: data.overridenCookieDomain || 'auto',
        path: '/',
        secure: true,
        httpOnly: false,
        'max-age': 31536000 // 365 days
      };
      setCookie('at_gd', searchParams[cidParamName], options, false);
    }
  }
}

function handleConversionEvent() {  
  const requestParameters = getRequestParameters();
  
  if (areThereRequiredFieldsMissing(requestParameters)) {
    if (isLoggingEnabled) {
      logToConsole({
        Name: 'Adtraction',
        Type: 'Message',
        TraceId: traceId,
        EventName: data.type,
        Message: 'Conversion event was not sent.',
        Reason: 'One or more fields are missing: Currency, Order Reference, Click ID Value, or Order Value (if Transaction Type is Sale).'
      });
    }
    return data.gtmOnFailure();
  }

  const requestUrl = getRequestUrl(requestParameters);
  
  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'Adtraction',
        Type: 'Request',
        TraceId: traceId,
        EventName: data.type,
        RequestMethod: 'GET',
        RequestUrl: requestUrl
      })
    );
  }

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'Adtraction',
            Type: 'Response',
            TraceId: traceId,
            EventName: data.type,
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

      if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    { method: 'GET' }
  );
}

function getRequestParameters() {
  const requestParameters = {};

  // Required (static) parameters

  requestParameters.ap = data.programId;
  requestParameters.t = data.transactionType;
  requestParameters.tp = data.transactionTypeId;

  // Required (dynamic) parameters
  
  const currency = data.currency || eventData.currencyCode || eventData.currency;
  requestParameters.c = currency;
    
  const orderReference = data.orderReference || eventData.orderId || eventData.order_id || eventData.transaction_id;
  requestParameters.ti = orderReference;
    
  const orderValue = data.orderValue || eventData.value;
  requestParameters.am = orderValue;

  const clickId = data.clickId || getCookieValues('at_gd')[0];
  requestParameters.at_gd = clickId;
  
  // Optional parameters
  
  const coupon = data.coupon || eventData.coupon;
  if (coupon) requestParameters.cpn = coupon;
  
  const emailMd5Hashed = data.md5HashedEmail || eventData.md5HashedEmail;
  if (emailMd5Hashed && getType(emailMd5Hashed) === 'string' && isMD5Hash(emailMd5Hashed)) requestParameters.xd = emailMd5Hashed;
  
  const channel = data.channel;
  if (channel) requestParameters.ch = channel;
  
  let newCustomer = data.newCustomer;
  if (['false', false, '0', 0].indexOf(newCustomer) !== -1) {
    newCustomer = '0';
  } else if (['true', true, '1', 1].indexOf(newCustomer) !== -1) {
    newCustomer = '1';  
  }
  if (newCustomer) requestParameters.ct = newCustomer;
  
  return requestParameters;
}

function getRequestUrl(requestParameters) {
  let requestUrl = 'https://track.adtraction.com/t/t?trt=4&ss=1&tk=1';

  for (const key in requestParameters) {
    const value = requestParameters[key];
    if (isValidValue(value)) requestUrl += '&' + enc(key) + '=' + enc(value);
  }
  
  return requestUrl;
}

function areThereRequiredFieldsMissing(requestParameters) {  
  const missingCommonRequiredFields = 
        ['c', 'ti', 'at_gd'].some(p => !isValidValue(requestParameters[p]));
  if (missingCommonRequiredFields) return true;
  
  const missingSaleOrderValueField = 
        data.transactionType === 3 && !isValidValue(requestParameters.am);
  if (missingSaleOrderValueField) return true;

  return false;
}

/**********************************************************************************************/
// Helpers

function isMD5Hash(str) {
  const md5Regex = createRegex('^[a-f0-9]{32}$', 'i');
  return testRegex(md5Regex, str);
}

function isValidValue(value) {
  const valueType = getType(value);
  return valueType !== 'null' && valueType !== 'undefined' && value !== '';
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(makeString(data));
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}
