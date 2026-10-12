var exec = require("cordova/exec");
var channel = require("cordova/channel");

var PLUGIN_NAME = "WebEngagePlugin";

function WebEngagePlugin() {
	this.push = new WebEngagePushChannel();
	this.notification = new WebEngageNotificationChannel();
	this.user = new WebEngageUserChannel();
	this._options = {};
	this.jwtManager = new WebEngageJWTManager();

}

// Promise wrappers (@awesome-cordova-plugins) call fn(...args, resolve, reject). None of this
// plugin's data arguments are functions, so trailing functions are success/error callbacks.
// Direct calls without them get null callbacks, as before.
function _popTrailingCallbacks(argsArray) {
  var args = argsArray.slice();
  var success = null;
  var error = null;
  if (args.length > 0 && typeof args[args.length - 1] === "function") {
    error = args.pop();
    if (args.length > 0 && typeof args[args.length - 1] === "function") {
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

var _eventChannelRegistered = false;

// Android only, internal: opens the keep-callback channel native uses to deliver push/in-app/JWT events.
// engage() runs once per app launch but native drops the channel on every top-level navigation
// (CordovaPlugin.onReset), so the channel is also opened from onCordovaReady on every page load
// (bottom of this file). The flag makes repeated calls on the same page a no-op.
function _registerEventChannel(pluginInstance) {
  if (_eventChannelRegistered || cordova.platformId !== "android") {
    return;
  }
  _eventChannelRegistered = true;
  exec(
    function (payload) {
      if (!payload || !payload.channel) {
        return;
      }
      if (payload.channel === "push") {
        pluginInstance.push.onCallbackReceived(payload.type, payload.uri, payload.data);
      } else if (payload.channel === "notification") {
        pluginInstance.notification.onCallbackReceived(payload.type, payload.data, payload.actionId);
      } else if (payload.channel === "jwtManager") {
        pluginInstance.jwtManager.onCallbackReceived(payload.type, payload.data);
      }
    },
    null,
    PLUGIN_NAME,
    "registerEventChannel",
    []
  );
}

WebEngagePlugin.prototype.engage = function () {
  _registerEventChannel(this);
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var config = parsed.args[0];
  if (config) {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "engage", [config]);
  } else {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "engage", []);
  }
};

WebEngagePlugin.prototype.options = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var key = parsed.args[0];
  var value = parsed.args[1];
  this._options[key] = value;
  exec(parsed.success, parsed.error, PLUGIN_NAME, "globalOptions", [key, value]);
};

WebEngagePlugin.prototype.startGAIDTracking = function() {
	var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
	if(cordova.platformId === "android"){
		exec(parsed.success, parsed.error, PLUGIN_NAME, "startGAIDTracking",[]);
	} else if (parsed.success) {
		parsed.success();
	}
};


WebEngagePlugin.prototype.track = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var eventName = parsed.args[0];
  var attributes = parsed.args[1];
  if (attributes === undefined) {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "track", [eventName]);
  } else {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "track", [eventName, attributes]);
  }
};

WebEngagePlugin.prototype.screen = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var screenName = parsed.args[0];
  var screenData = parsed.args[1];
  if (
    screenName !== undefined &&
    (typeof screenName === "string" || screenName instanceof String)
  ) {
    if (screenData === undefined) {
      exec(parsed.success, parsed.error, PLUGIN_NAME, "screenNavigated", [screenName]);
    } else {
      exec(parsed.success, parsed.error, PLUGIN_NAME, "screenNavigated", [
        screenName,
        screenData,
      ]);
    }
  } else if (screenName !== undefined && isValidJavascriptObject(screenName)) {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "screenNavigated", [null, screenName]);
  } else {
    console.error("Invalid arguments provided to screen plugin call");
    if (parsed.error) {
      parsed.error("Invalid arguments provided to screen plugin call");
    }
  }
};

function WebEngagePushChannel() {
  // clickCallback must stay undefined until onClick() is called: iOS native uses that to decide
  // whether to open the push deep link itself.
  this._options = {};
}

WebEngagePushChannel.prototype.options = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var key = parsed.args[0];
  var value = parsed.args[1];
  this._options[key] = value;
  exec(parsed.success, parsed.error, PLUGIN_NAME, "pushOptions", [key, value]);
};

WebEngagePushChannel.prototype.onClick = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.clickCallback = callback;
  if (parsed.success) {
    parsed.success();
  }
};

WebEngagePushChannel.prototype.onMessageReceived = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var payload = parsed.args[0];
  if(cordova.platformId === "android"){
    exec(parsed.success, parsed.error, PLUGIN_NAME, "onMessageReceived", [payload]);
  } else if (parsed.success) {
    parsed.success();
  }
};

WebEngagePushChannel.prototype.sendFcmToken = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var token = parsed.args[0];
  if(cordova.platformId === "android"){
    exec(parsed.success, parsed.error, PLUGIN_NAME, "sendFcmToken", [token]);
  } else if (parsed.success) {
    parsed.success();
  }
};

WebEngagePushChannel.prototype.onCallbackReceived = function (
  type,
  uri,
  customData
) {
  if (type) {
    switch (type) {
      case "shown":
        break;
      case "click":
        if (typeof this.clickCallback === "function") {
          this.clickCallback(uri, customData);
        }
        break;
      case "dismiss":
        break;
    }
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
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var key = parsed.args[0];
  var value = parsed.args[1];
  this._options[key] = value;
  exec(parsed.success, parsed.error, PLUGIN_NAME, "inappOptions", [key, value]);
};

WebEngageNotificationChannel.prototype.onShown = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.shownCallback = callback;
  if (parsed.success) {
    parsed.success();
  }
};

WebEngageNotificationChannel.prototype.onClick = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.clickCallback = callback;
  if (parsed.success) {
    parsed.success();
  }
};

WebEngageNotificationChannel.prototype.onDismiss = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.dismissCallback = callback;
  if (parsed.success) {
    parsed.success();
  }
};
WebEngageNotificationChannel.prototype.onPrepared = function (callback) {
  var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
  this.preparedCallback = callback;
  if (parsed.success) {
    parsed.success();
  }
};

WebEngageNotificationChannel.prototype.onCallbackReceived = function (
  type,
  notificationData,
  actionId
) {
  if (type) {
    switch (type) {
      case "shown":
        this.shownCallback(notificationData);
        break;
      case "click":
        this.clickCallback(notificationData, actionId);
        break;
      case "dismiss":
        this.dismissCallback(notificationData);
        break;
      case "prepared":
        this.preparedCallback(notificationData);
        break;
    }
  }
};
function WebEngageUserChannel() {
}

WebEngageUserChannel.prototype.login = function() {
	var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
	var userId = parsed.args[0];
	var secureToken = parsed.args.length > 1 ? parsed.args[1] : null;
	exec(parsed.success, parsed.error, PLUGIN_NAME, "login", [userId, secureToken]);
};
WebEngageUserChannel.prototype.setSecureToken = function() {
	var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
	var userId = parsed.args[0];
	var jwtToken = parsed.args[1];
	exec(parsed.success, parsed.error, PLUGIN_NAME, "setSecureToken", [userId, jwtToken]);
}

WebEngageUserChannel.prototype.logout = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  exec(parsed.success, parsed.error, PLUGIN_NAME, "logout", []);
};

WebEngageUserChannel.prototype.setAttribute = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var key = parsed.args[0];
  var value = parsed.args[1];
  if (value === undefined && isValidJavascriptObject(key)) {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "setAttribute", [key]);
  } else if (key && isValidString(key) && value !== undefined) {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "setAttribute", [key, value]);
  } else if (parsed.success) {
    parsed.success();
  }
};

WebEngageUserChannel.prototype.setDevicePushOptIn = function () {
	var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
	var optIn = parsed.args[0];
	if(cordova.platformId === "android"){
    exec(parsed.success, parsed.error, PLUGIN_NAME, "setDevicePushOptIn", [optIn]);
  } else if (parsed.success) {
    parsed.success();
  }
}

WebEngageUserChannel.prototype.setUserOptIn = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var channel = parsed.args[0];
  var optIn = parsed.args[1];
  exec(parsed.success, parsed.error, PLUGIN_NAME, "setUserOptIn", [channel, optIn]);
};

WebEngageUserChannel.prototype.setLocation = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  var lat = parsed.args[0];
  var lng = parsed.args[1];
  exec(parsed.success, parsed.error, PLUGIN_NAME, "setLocation", [lat, lng]);
};

WebEngageUserChannel.prototype.presentInAppController = function () {
  var parsed = _popTrailingCallbacks(Array.prototype.slice.call(arguments));
  if (typeof cordova !== 'undefined' && cordova.platformId === 'ios') {
    exec(parsed.success, parsed.error, PLUGIN_NAME, "presentInAppController", []);
  } else {
    console.log("presentInAppController is not supported on this platform.");
    if (parsed.success) {
      parsed.success();
    }
  }
};

function WebEngageJWTManager () {
	this.invalidatedCallback = function () {};
	this._options = {};
}
WebEngageJWTManager.prototype.tokenInvalidatedCallback = function(callback) {
	var parsed = _popTrailingCallbacksAfter(Array.prototype.slice.call(arguments), 1);
	this.invalidatedCallback = callback;
	if (parsed.success) {
		parsed.success();
	}
};
	
WebEngageJWTManager.prototype.onCallbackReceived = function(type, errorMessage){
	if (type == 'expired'){
		if(this.invalidatedCallback) {
      console.log("Token invalidated!")
			this.invalidatedCallback(errorMessage);
		} else {
			console.log("WebEngage: tokenInvalidatedCallback is not defined")
		}
	}
}

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

if (typeof module != "undefined" && module.exports) {
  var WebEngagePlugin = new WebEngagePlugin();
  module.exports = WebEngagePlugin;

  // Runs on every page load (a top-level navigation creates a new JS context).
  channel.onCordovaReady.subscribe(function () {
    _registerEventChannel(WebEngagePlugin);
  });
}
