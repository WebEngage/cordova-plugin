var exec = require("cordova/exec");
var channel = require("cordova/channel");

var Constants = require("./WEConstants");

function WebEngagePlugin() {
  this.push = new WebEngagePushChannel();
  this.notification = new WebEngageNotificationChannel();
  this.user = new WebEngageUserChannel();
  this._options = {};
  this.jwtManager = new WebEngageJWTManager();
}

// Optional callbacks come last: fn(...args, successCallback, errorCallback). One trailing function is the
// success callback; two are success and error. Promise wrappers (@awesome-cordova-plugins) call
// fn(...args, resolve, reject) the same way. None of this plugin's data arguments are functions.
function _popTrailingCallbacks(argsArray) {
  var args = argsArray.slice();
  var success = null;
  var error = null;
  if (args.length > 0 && typeof args[args.length - 1] === "function") {
    success = args.pop();
    if (args.length > 0 && typeof args[args.length - 1] === "function") {
      error = success;
      success = args.pop();
    }
  }
  return { args: args, success: success, error: error };
}

// For methods whose first argument is itself a callback (onClick, onShown, onDismiss, onPrepared,
// tokenInvalidatedCallback): keep it, and treat only what follows as success/error.
function _popTrailingCallbacksAfter(argsArray, keepCount) {
  var kept = argsArray.slice(0, keepCount);
  var popped = _popTrailingCallbacks(argsArray.slice(keepCount));
  return { args: kept, success: popped.success, error: popped.error };
}

// Invalid arguments are rejected here, before anything reaches native code, so Android and iOS reply the same way.
function _rejectInvalid(parsed, message) {
  console.error(Constants.LOG_PREFIX + message);
  if (parsed.error) {
    parsed.error(message);
  }
}

function _succeed(parsed) {
  if (parsed.success) {
    parsed.success();
  }
}

function _invoke(callback) {
  if (typeof callback === "function") {
    callback.apply(null, Array.prototype.slice.call(arguments, 1));
  }
}

var _eventChannelRegistered = false;

// Android only, internal: opens the keep-callback channel native uses to deliver push/in-app/JWT events.
// engage() runs once per app launch but native drops the channel on every top-level navigation
// (CordovaPlugin.onReset), so the channel is also opened from onCordovaReady on every page load
// (bottom of this file). The flag makes repeated calls on the same page a no-op.
function _registerEventChannel(pluginInstance) {
  if (_eventChannelRegistered || cordova.platformId !== Constants.PLATFORM_ANDROID) {
    return;
  }
  _eventChannelRegistered = true;
  exec(
    function (payload) {
      if (!payload || !payload.channel) {
        return;
      }
      if (payload.channel === Constants.CHANNEL_PUSH) {
        pluginInstance.push.onCallbackReceived(payload.type, payload.uri, payload.data);
      } else if (payload.channel === Constants.CHANNEL_NOTIFICATION) {
        pluginInstance.notification.onCallbackReceived(payload.type, payload.data, payload.actionId);
      } else if (payload.channel === Constants.CHANNEL_JWT_MANAGER) {
        pluginInstance.jwtManager.onCallbackReceived(payload.type, payload.data);
      }
    },
    null,
    Constants.PLUGIN, Constants.REGISTER_EVENT_CHANNEL,
    []
  );
}

// Shared by webengage.options, webengage.push.options and webengage.notification.options.
function _setOption(owner, action, argsArray) {
  var parsed = _popTrailingCallbacks(argsArray);
  var key = toText(parsed.args[0]);
  if (!key) {
    _rejectInvalid(parsed, Constants.ERROR_OPTIONS_KEY);
    return;
  }
  var value = parsed.args[1];
  owner._options[key] = value;
  exec(parsed.success, parsed.error, Constants.PLUGIN, action, [key, value]);
}

WebEngagePlugin.prototype.engage = function () {
  _registerEventChannel(this);
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var config = parsed.args[0];
  if (config) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.ENGAGE, [config]);
  } else {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.ENGAGE, []);
  }
};

WebEngagePlugin.prototype.options = function () {
  _setOption(this, Constants.GLOBAL_OPTIONS, Array.prototype.slice.call(arguments));
};

WebEngagePlugin.prototype.startGAIDTracking = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  if (cordova.platformId === Constants.PLATFORM_ANDROID) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.START_GAID_TRACKING, []);
  } else {
    _succeed(parsed);
  }
};

WebEngagePlugin.prototype.track = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var eventName = toText(parsed.args[0]);
  if (!eventName) {
    _rejectInvalid(parsed, Constants.ERROR_TRACK_EVENT_NAME);
    return;
  }
  var attributes = parsed.args[1];
  if (attributes === undefined) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.TRACK, [eventName]);
  } else {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.TRACK, [eventName, attributes]);
  }
};

WebEngagePlugin.prototype.screen = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var screenName = parsed.args[0];
  var screenData = parsed.args[1];
  if (isValidString(screenName) && screenName.length > 0) {
    if (screenData === undefined) {
      exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SCREEN_NAVIGATED, [screenName]);
    } else {
      exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SCREEN_NAVIGATED, [
        screenName,
        screenData,
      ]);
    }
  } else if (isValidJavascriptObject(screenName)) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SCREEN_NAVIGATED, [null, screenName]);
  } else {
    _rejectInvalid(parsed, Constants.ERROR_SCREEN);
  }
};

function WebEngagePushChannel() {
  // clickCallback must stay undefined until onClick() is called: iOS native uses that to decide
  // whether to open the push deep link itself.
  this._options = {};
}

WebEngagePushChannel.prototype.options = function () {
  _setOption(this, Constants.PUSH_OPTIONS, Array.prototype.slice.call(arguments));
};

WebEngagePushChannel.prototype.onClick = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.clickCallback = callback;
  _succeed(parsed);
};

WebEngagePushChannel.prototype.onMessageReceived = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var payload = parsed.args[0];
  if (!isPushPayload(payload)) {
    _rejectInvalid(parsed, Constants.ERROR_PUSH_PAYLOAD);
    return;
  }
  if (cordova.platformId === Constants.PLATFORM_ANDROID) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.ON_MESSAGE_RECEIVED, [payload]);
  } else {
    _succeed(parsed);
  }
};

WebEngagePushChannel.prototype.sendFcmToken = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var token = toText(parsed.args[0]);
  if (!token) {
    _rejectInvalid(parsed, Constants.ERROR_FCM_TOKEN);
    return;
  }
  if (cordova.platformId === Constants.PLATFORM_ANDROID) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SEND_FCM_TOKEN, [token]);
  } else {
    _succeed(parsed);
  }
};

WebEngagePushChannel.prototype.onCallbackReceived = function (type, uri, customData) {
  if (type === Constants.EVENT_CLICK) {
    _invoke(this.clickCallback, uri, customData);
  }
};

function WebEngageNotificationChannel() {
  this.shownCallback = function () {};
  this.clickCallback = function () {};
  this.dismissCallback = function () {};
  this.preparedCallback = function () {};
  this._options = {};
}

WebEngageNotificationChannel.prototype.options = function () {
  _setOption(this, Constants.INAPP_OPTIONS, Array.prototype.slice.call(arguments));
};

WebEngageNotificationChannel.prototype.onShown = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.shownCallback = callback;
  _succeed(parsed);
};

WebEngageNotificationChannel.prototype.onClick = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.clickCallback = callback;
  _succeed(parsed);
};

WebEngageNotificationChannel.prototype.onDismiss = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.dismissCallback = callback;
  _succeed(parsed);
};

WebEngageNotificationChannel.prototype.onPrepared = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.preparedCallback = callback;
  _succeed(parsed);
};

WebEngageNotificationChannel.prototype.onCallbackReceived = function (type, notificationData, actionId) {
  switch (type) {
    case Constants.EVENT_SHOWN:
      _invoke(this.shownCallback, notificationData);
      break;
    case Constants.EVENT_CLICK:
      _invoke(this.clickCallback, notificationData, actionId);
      break;
    case Constants.EVENT_DISMISS:
      _invoke(this.dismissCallback, notificationData);
      break;
    case Constants.EVENT_PREPARED:
      _invoke(this.preparedCallback, notificationData);
      break;
  }
};

function WebEngageUserChannel() {
}

WebEngageUserChannel.prototype.login = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var userId = parsed.args[0];
  if (!isValidString(userId) || userId.length === 0) {
    _rejectInvalid(parsed, Constants.ERROR_LOGIN_USER_ID);
    return;
  }
  // No token (missing, null or empty) means a plain login on both platforms.
  var secureToken = parsed.args[1];
  if (secureToken === undefined || secureToken === null || secureToken === "") {
    secureToken = null;
  } else if (!isValidString(secureToken)) {
    _rejectInvalid(parsed, Constants.ERROR_LOGIN_SECURE_TOKEN);
    return;
  }
  exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.LOGIN, [userId, secureToken]);
};

WebEngageUserChannel.prototype.setSecureToken = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var userId = parsed.args[0];
  var jwtToken = parsed.args[1];
  if (!isValidString(userId) || userId.length === 0 || !isValidString(jwtToken) || jwtToken.length === 0) {
    _rejectInvalid(parsed, Constants.ERROR_SECURE_TOKEN);
    return;
  }
  exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_SECURE_TOKEN, [userId, jwtToken]);
};

WebEngageUserChannel.prototype.logout = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.LOGOUT, []);
};

WebEngageUserChannel.prototype.setAttribute = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var key = parsed.args[0];
  var value = parsed.args[1];
  if (value === undefined && isValidJavascriptObject(key)) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_ATTRIBUTE, [key]);
  } else if (isValidString(key) && key.length > 0 && value !== undefined) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_ATTRIBUTE, [key, value]);
  } else {
    _rejectInvalid(parsed, Constants.ERROR_SET_ATTRIBUTE);
  }
};

WebEngageUserChannel.prototype.setDevicePushOptIn = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var optIn = parsed.args[0];
  if (typeof optIn !== "boolean") {
    _rejectInvalid(parsed, Constants.ERROR_DEVICE_PUSH_OPT_IN);
    return;
  }
  if (cordova.platformId === Constants.PLATFORM_ANDROID) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_DEVICE_PUSH_OPT_IN, [optIn]);
  } else {
    _succeed(parsed);
  }
};

WebEngageUserChannel.prototype.setUserOptIn = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var channelName = parsed.args[0];
  var optIn = parsed.args[1];
  if (!isOptInChannel(channelName) || typeof optIn !== "boolean") {
    _rejectInvalid(parsed, Constants.ERROR_USER_OPT_IN);
    return;
  }
  exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_USER_OPT_IN, [channelName, optIn]);
};

WebEngageUserChannel.prototype.setLocation = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var latitude = toCoordinate(parsed.args[0]);
  var longitude = toCoordinate(parsed.args[1]);
  if (latitude === null || longitude === null) {
    _rejectInvalid(parsed, Constants.ERROR_SET_LOCATION);
    return;
  }
  exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.SET_LOCATION, [latitude, longitude]);
};

WebEngageUserChannel.prototype.presentInAppController = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  if (cordova.platformId === Constants.PLATFORM_IOS) {
    exec(parsed.success, parsed.error, Constants.PLUGIN, Constants.PRESENT_IN_APP_CONTROLLER, []);
  } else {
    console.log("presentInAppController is not supported on this platform.");
    _succeed(parsed);
  }
};

function WebEngageJWTManager() {
  this.invalidatedCallback = function () {};
  this._options = {};
}

WebEngageJWTManager.prototype.tokenInvalidatedCallback = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.invalidatedCallback = callback;
  _succeed(parsed);
};

WebEngageJWTManager.prototype.onCallbackReceived = function (type, errorMessage) {
  if (type === Constants.EVENT_EXPIRED) {
    if (typeof this.invalidatedCallback === "function") {
      this.invalidatedCallback(errorMessage);
    } else {
      console.log("WebEngage: tokenInvalidatedCallback is not defined");
    }
  }
};

function isValidJavascriptObject(val) {
  return (
    val !== undefined &&
    val != null &&
    typeof val === "object" &&
    Object.prototype.toString.call(val) === "[object Object]"
  );
}

function isValidString(val) {
  return (
    val !== undefined &&
    val != null &&
    (typeof val === "string" || val instanceof String)
  );
}

// Text accepted for event names, option keys and FCM tokens: a non-empty string, or a number or boolean
// sent as its text (Android has always converted these; iOS now does the same). Anything else is null.
function toText(val) {
  var text = null;
  if (isValidString(val)) {
    text = String(val);
  } else if ((typeof val === "number" && isFinite(val)) || typeof val === "boolean") {
    text = String(val);
  }
  return text && text.length > 0 ? text : null;
}

// A finite number, or a string holding one ("12.97"). Anything else is null.
function toCoordinate(val) {
  if (typeof val === "number") {
    return isFinite(val) ? val : null;
  }
  if (isValidString(val) && String(val).trim().length > 0) {
    var number = Number(val);
    return isFinite(number) ? number : null;
  }
  return null;
}

function isOptInChannel(val) {
  return isValidString(val) && Constants.OPT_IN_CHANNELS.indexOf(String(val).toLowerCase()) !== -1;
}

// A push payload as an object, or as JSON text of an object.
function isPushPayload(val) {
  if (isValidJavascriptObject(val)) {
    return true;
  }
  if (isValidString(val)) {
    try {
      return isValidJavascriptObject(JSON.parse(String(val)));
    } catch (e) {
      return false;
    }
  }
  return false;
}

if (typeof module != "undefined" && module.exports) {
  var WebEngagePlugin = new WebEngagePlugin();
  module.exports = WebEngagePlugin;

  // Runs on every page load (a top-level navigation creates a new JS context).
  channel.onCordovaReady.subscribe(function () {
    _registerEventChannel(WebEngagePlugin);
  });
}
