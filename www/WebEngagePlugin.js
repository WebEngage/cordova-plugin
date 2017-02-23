var exec = require('cordova/exec');

function WebEngagePlugin() {
	this.push = new WebEngagePushChannel();
	this.notification = new WebEngageNotificationChannel();
	this.user = new WebEngageUserChannel();
	this._options = {};
}

WebEngagePlugin.prototype.engage = function() {
	exec(null, null, "WebEngagePlugin", "engage",[]);
};

WebEngagePlugin.prototype.options = function(key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "globalOptions", [key, value]);
};

WebEngagePlugin.prototype.track = function(eventName, attributes) {
	exec(null, null, "WebEngagePlugin", "track", [eventName, attributes]);
}

WebEngagePlugin.prototype.onActive = function(callback) {
	
	exec(function(){
		if (callback) {
			callback();
		}
	}, function(){
		console.log("error");
	}, "WebEngagePlugin", "onActive", [])
	
};


function WebEngagePushChannel () {
	this.clickCallback = function(){};
	this._options = {};
}

WebEngagePushChannel.prototype.options = function (key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "pushOptions", [key, value]);
};

WebEngagePushChannel.prototype.onClick = function (callback) {
	this.clickCallback = callback;
}

WebEngagePushChannel.prototype.onCallbackReceived = function(type, uri, customData) {
	if(type) {
		switch(type) {
			case 'shown' :
				
				break;

			case 'click' :
				this.clickCallback(uri, customData);
				break;

			case 'dismiss' :
			
				break;
		}
	}
};

function WebEngageNotificationChannel () {
	this.shownCallback = function(){};
	this.clickCallback = function(){};
	this.dismissCallback = function(){};
	this._options = {};
}

WebEngageNotificationChannel.prototype.options = function(key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "inappOptions", [key, value]);
};

WebEngageNotificationChannel.prototype.onShown = function (callback) {
	this.shownCallback = callback;
};

WebEngageNotificationChannel.prototype.onClick = function (callback) {
	this.clickCallback = callback;
}

WebEngageNotificationChannel.prototype.onDismiss = function(callback) {
	this.dismissCallback = callback;
};

WebEngageNotificationChannel.prototype.onCallbackReceived = function(type, notificationData, actionId) {
	if(type) {
		switch(type) {
			case 'shown' :
				this.shownCallback(notificationData);
				break;

			case 'click' :
				this.clickCallback(notificationData, actionId);
				break;

			case 'dismiss' :
				this.dismissCallback(notificationData);
				break;
		}
	}
};

function WebEngageUserChannel() {

}

WebEngageUserChannel.prototype.login = function(userId) {
	exec(null, null, "WebEngagePlugin", "login", [userId]);
};

WebEngageUserChannel.prototype.logout = function() {
	exec(null, null, "WebEngagePushChannel", "logout",[]);
};



if(typeof module != 'undefined' && module.exports) {
	var WebEngagePlugin = new WebEngagePlugin();
	module.exports = WebEngagePlugin;
}