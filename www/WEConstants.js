module.exports = {
  PLUGIN: "WebEngagePlugin",

  PLATFORM_ANDROID: "android",
  PLATFORM_IOS: "ios",

  REGISTER_EVENT_CHANNEL: "registerEventChannel",
  ENGAGE: "engage",
  GLOBAL_OPTIONS: "globalOptions",
  START_GAID_TRACKING: "startGAIDTracking",
  TRACK: "track",
  SCREEN_NAVIGATED: "screenNavigated",
  PUSH_OPTIONS: "pushOptions",
  ON_MESSAGE_RECEIVED: "onMessageReceived",
  SEND_FCM_TOKEN: "sendFcmToken",
  INAPP_OPTIONS: "inappOptions",
  LOGIN: "login",
  SET_SECURE_TOKEN: "setSecureToken",
  LOGOUT: "logout",
  SET_ATTRIBUTE: "setAttribute",
  SET_DEVICE_PUSH_OPT_IN: "setDevicePushOptIn",
  SET_USER_OPT_IN: "setUserOptIn",
  SET_LOCATION: "setLocation",
  PRESENT_IN_APP_CONTROLLER: "presentInAppController",

  CHANNEL_PUSH: "push",
  CHANNEL_NOTIFICATION: "notification",
  CHANNEL_JWT_MANAGER: "jwtManager",

  EVENT_SHOWN: "shown",
  EVENT_CLICK: "click",
  EVENT_DISMISS: "dismiss",
  EVENT_PREPARED: "prepared",
  EVENT_EXPIRED: "expired",

  // Channels accepted by setUserOptIn (compared case-insensitively, as the native code does)
  OPT_IN_CHANNELS: ["push", "sms", "email", "in_app", "whatsapp", "viber"],

  LOG_PREFIX: "WebEngage: ",

  ERROR_OPTIONS_KEY: "options: key must be a non-empty string",
  ERROR_TRACK_EVENT_NAME: "track: eventName must be a non-empty string",
  ERROR_SCREEN: "screen: pass a non-empty screen name, screen data as an object, or both",
  ERROR_PUSH_PAYLOAD: "onMessageReceived: payload must be an object or its JSON text",
  ERROR_FCM_TOKEN: "sendFcmToken: token must be a non-empty string",
  ERROR_LOGIN_USER_ID: "login: userId must be a non-empty string",
  ERROR_LOGIN_SECURE_TOKEN: "login: secureToken must be a string",
  ERROR_SECURE_TOKEN: "setSecureToken: userId and secureToken must be non-empty strings",
  ERROR_SET_ATTRIBUTE: "setAttribute: pass an attribute name and a value, or one object of attributes",
  ERROR_DEVICE_PUSH_OPT_IN: "setDevicePushOptIn: optIn must be true or false",
  ERROR_USER_OPT_IN: "setUserOptIn: channel must be one of push, sms, email, in_app, whatsapp, viber and optIn must be true or false",
  ERROR_SET_LOCATION: "setLocation: latitude and longitude must be numbers"
};
