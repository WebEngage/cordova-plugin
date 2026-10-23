#ifndef WEGConstants_h
#define WEGConstants_h

// Names follow WE_CORE_CONSTANTS (Android) and www/WEConstants.js. Macros, not variables, so that the
// literals stay identical at every use and nothing is exported from this target.

#define WEG_LOG_TAG @"WebEngage-Cordova"

// System user attributes
#define WEG_SYSTEM_ATTRIBUTE_PREFIX @"we_"
#define WEG_FIRST_NAME @"we_first_name"
#define WEG_LAST_NAME @"we_last_name"
#define WEG_EMAIL @"we_email"
#define WEG_BIRTH_DATE @"we_birth_date"
#define WEG_PHONE @"we_phone"
#define WEG_GENDER @"we_gender"
#define WEG_COMPANY @"we_company"
#define WEG_HASHED_EMAIL @"we_hashed_email"
#define WEG_HASHED_PHONE @"we_hashed_phone"

// Opt-in channel names (compared case-insensitively)
#define WEG_OPT_IN_PUSH @"push"
#define WEG_OPT_IN_SMS @"sms"
#define WEG_OPT_IN_EMAIL @"email"
#define WEG_OPT_IN_IN_APP @"in_app"
#define WEG_OPT_IN_WHATSAPP @"whatsapp"
#define WEG_OPT_IN_VIBER @"viber"

// Date formats and locale
#define WEG_DATE_TIME_FORMAT @"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
#define WEG_BIRTH_DATE_FORMAT @"yyyy-MM-dd"
#define WEG_TIME_ZONE_UTC @"UTC"
#define WEG_LOCALE_ID @"gb"

// Pending push deep link (kept until the page registers its click callback)
#define WEG_KEY_DEEP_LINK @"deepLink"
#define WEG_KEY_PUSH_INFO @"info"

// Info.plist
#define WEG_INFO_PLIST_APNS_AUTO_REGISTER @"WEGApnsAutoRegister"

// JWT callback payload
#define WEG_KEY_ERROR_RESPONSE @"errorResponse"
#define WEG_ERROR_RESPONSE_UNAUTHORIZED @"401"

// Error messages sent to JS
#define WEG_ERROR_SET_LOCATION_INVALID_NUMBER_FORMAT @"setLocation: invalid number format"
#define WEG_ERROR_SET_LOCATION_INVALID_ARGUMENTS @"setLocation: invalid arguments"
#define WEG_ERROR_SET_LOCATION_ARGUMENT_COUNT @"setLocation: invalid number of arguments"
#define WEG_ERROR_UNEXPECTED @"Unexpected error"

// JavaScript evaluated in the WebView (the JS API surface of www/WebEngagePlugin.js)
#define WEG_JS_PUSH_CLICK_CALLBACK_REGISTERED @"webengage.push.clickCallback !== undefined && webengage.push.clickCallback != null?true: false;"
#define WEG_JS_PUSH_CLICK_FORMAT @"webengage.push.onCallbackReceived('click', %@, %@)"
#define WEG_JS_NOTIFICATION_PREPARED_FORMAT @"webengage.notification.onCallbackReceived( 'prepared', %@)"
#define WEG_JS_NOTIFICATION_SHOWN_FORMAT @"webengage.notification.onCallbackReceived( 'shown', %@)"
#define WEG_JS_NOTIFICATION_DISMISS_FORMAT @"webengage.notification.onCallbackReceived( 'dismiss', %@)"
#define WEG_JS_NOTIFICATION_CLICK_FORMAT @"webengage.notification.onCallbackReceived( 'click', %@, %@)"
#define WEG_JS_JWT_EXPIRED_FORMAT @"webengage.jwtManager.onCallbackReceived('expired', %@)"

#endif /* WEGConstants_h */
