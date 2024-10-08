var exec = require("cordova/exec");

function WebEngagePlugin() {
	this.push = new WebEngagePushChannel();
	this.notification = new WebEngageNotificationChannel();
	this.user = new WebEngageUserChannel();
	this._options = {};
	this.jwtManager = new WebEngageJWTManager();

}

WebEngagePlugin.prototype.engage = function (config) {
  if (config) {
    exec(null, null, "WebEngagePlugin", "engage", [config]);
  } else {
    exec(null, null, "WebEngagePlugin", "engage", []);
  }
};

WebEngagePlugin.prototype.options = function (key, value) {
  this._options[key] = value;
  exec(null, null, "WebEngagePlugin", "globalOptions", [key, value]);
};

WebEngagePlugin.prototype.startGAIDTracking = function() {
	if(cordova.platformId === "android"){
		exec(null, null, "WebEngagePlugin", "startGAIDTracking",[]);
	}
};


WebEngagePlugin.prototype.screen = function(screenName, screenData) {
	if (screenName !== undefined && (typeof screenName === 'string' || screenName instanceof String)) {
		if (screenData === undefined) {
			exec(null, null, "WebEngagePlugin", "screenNavigated", [screenName]);
		} else {
			exec(null, null, "WebEngagePlugin", "screenNavigated", [screenName, screenData]);
		}
	} else if (screenName !== undefined && isValidJavascriptObject(screenName)) {
		exec(null, null, "WebEngagePlugin", "screenNavigated", [null, screenName]);
	} else {
		console.err("Invalid arguments provided to screen plugin call");
	}
}

WebEngagePlugin.prototype.track = function (eventName, attributes) {
  if (attributes === undefined) {
    exec(null, null, "WebEngagePlugin", "track", [eventName]);
  } else {
    exec(null, null, "WebEngagePlugin", "track", [eventName, attributes]);
  }
};

WebEngagePlugin.prototype.screen = function (screenName, screenData) {
  if (
    screenName !== undefined &&
    (typeof screenName === "string" || screenName instanceof String)
  ) {
    if (screenData === undefined) {
      exec(null, null, "WebEngagePlugin", "screenNavigated", [screenName]);
    } else {
      exec(null, null, "WebEngagePlugin", "screenNavigated", [
        screenName,
        screenData,
      ]);
    }
  } else if (screenName !== undefined && isValidJavascriptObject(screenName)) {
    exec(null, null, "WebEngagePlugin", "screenNavigated", [null, screenName]);
  } else {
    console.err("Invalid arguments provided to screen plugin call");
  }
};

function WebEngagePushChannel() {
  //this.clickCallback = function(){};
  this._options = {};
}

WebEngagePushChannel.prototype.options = function (key, value) {
  this._options[key] = value;
  exec(null, null, "WebEngagePlugin", "pushOptions", [key, value]);
};

WebEngagePushChannel.prototype.onClick = function (callback) {
  this.clickCallback = callback;
};

WebEngagePushChannel.prototype.onMessageReceived = function (payload) {
  if(cordova.platformId === "android"){
    exec(null, null, "WebEngagePlugin", "onMessageReceived", [payload]);
  }
};

WebEngagePushChannel.prototype.sendFcmToken = function (token) {
  if(cordova.platformId === "android"){
    exec(null, null, "WebEngagePlugin", "sendFcmToken", [token]);
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
        this.clickCallback(uri, customData);
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

WebEngageNotificationChannel.prototype.options = function (key, value) {
  this._options[key] = value;
  exec(null, null, "WebEngagePlugin", "inappOptions", [key, value]);
};

WebEngageNotificationChannel.prototype.onShown = function (callback) {
  this.shownCallback = callback;
};

WebEngageNotificationChannel.prototype.onClick = function (callback) {
  this.clickCallback = callback;
};

WebEngageNotificationChannel.prototype.onDismiss = function (callback) {
  this.dismissCallback = callback;
};
WebEngageNotificationChannel.prototype.onPrepared = function (callback) {
  this.preparedCallback = callback;
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
      case "prepared":
        this.preparedCallback(notificationData);
        break;
    }
  }
};
function WebEngageUserChannel() {
}

WebEngageUserChannel.prototype.login = function(userId, secureToken = null) {
	exec(null, null, "WebEngagePlugin", "login", [userId, secureToken]);
};
WebEngageUserChannel.prototype.setSecureToken = function(userId, jwtToken) {
	exec(null, null, "WebEngagePlugin", "setSecureToken", [userId, jwtToken]);
}

WebEngageUserChannel.prototype.logout = function () {
  exec(null, null, "WebEngagePlugin", "logout", []);
};

WebEngageUserChannel.prototype.setAttribute = function (key, value) {
  if (value === undefined && isValidJavascriptObject(key)) {
    exec(null, null, "WebEngagePlugin", "setAttribute", [key]);
  } else if (key && isValidString(key) && value !== undefined) {
    exec(null, null, "WebEngagePlugin", "setAttribute", [key, value]);
  }
};

WebEngageUserChannel.prototype.setDevicePushOptIn = function (optIn) {
	if(cordova.platformId === "android"){
    exec(null, null, "WebEngagePlugin", "setDevicePushOptIn", [optIn]);
  }
}

WebEngageUserChannel.prototype.setUserOptIn = function (channel, optIn) {
  exec(null, null, "WebEngagePlugin", "setUserOptIn", [channel, optIn]);
};

WebEngageUserChannel.prototype.setLocation = function (lat, lng) {
  exec(null, null, "WebEngagePlugin", "setLocation", [lat, lng]);
};

function WebEngageJWTManager () {
	this.invalidatedCallback = function () {};
	this._options = {};
}
WebEngageJWTManager.prototype.tokenInvalidatedCallback = function(callback) {
	this.invalidatedCallback = callback;
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
}

WebEngageUserChannel.prototype.presentInAppController = function () {
	if (typeof cordova !== 'undefined' && cordova.platformId === 'ios') {
		exec(null, null, "WebEngagePlugin", "presentInAppController", []);
	} else {
		console.log("presentInAppController is not supported on this platform.");
	}
}