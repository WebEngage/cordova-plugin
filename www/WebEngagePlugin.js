var exec = require('cordova/exec');

function WebEngagePlugin() {
	this.push = new WebEngagePushChannel();
	this.inapp = new WebEngageInAppChannel();
	this.user = new WebEngageUserChannel();
	this.analytics = new WebEngageAnalyticsChannel();
	this._options = {};
}

WebEngagePlugin.prototype.engage = function() {
	exec(null, null, "WebEngagePlugin", "engage",[]);
};

WebEngagePlugin.prototype.options = function(key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "globalOptions", [key, value]);
};

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
	this.callbacks = {};
	this._options = {};
}

WebEngagePushChannel.prototype.options = function (key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "pushOptions", [key, value]);
};

WebEngagePushChannel.prototype.onShown = function (callback) {
	
	if(!this.callbacks.hasOnProperty('shown')) {
		this.callbacks.shown = [];
	}

	this.callbacks.shown.push(callback);
};

WebEngagePushChannel.prototype.onClick = function (callback) {
	if(!this.callbacks.hasOnProperty('click')) {
		this.callbacks.click = [];
	}

	this.callbacks.click.push(callback);
}

WebEngagePushChannel.prototype.onDismiss = function(callback) {
	if(!this.callbacks.hasOnProperty('dismiss')) {
		this.callbacks.dismiss = [];
	}

	this.callbacks.dismiss.push(callback);
};

WebEngagePushChannel.prototype.onCallbackReceived = function(type, data, id) {
	if(type) {
		switch(type) {
			case 'shown' :
				for(i = 0; i < this.callbacks.shown.length; i++) {
					this.callbacks.shown[i](data);
				}
				break;

			case 'click' :
				for(i = 0; i < this.callbacks.click.length; i++) {
					this.callbacks.click[i](data, id);
				}
				break;

			case 'dismiss' :
				for(i = 0; i < this.callbacks.dismiss.length; i++) {
					this.callbacks.dismiss[i](data);
				}
				break;
		}
	}
};

function WebEngageInAppChannel () {
	this.callbacks = {};
	this._options = {};
}

WebEngageInAppChannel.prototype.options = function(key, value) {
	this._options.key = value;
	exec(null, null, "WebEngagePlugin", "inappOptions", [key, value]);
};

WebEngageInAppChannel.prototype.onShown = function (callback) {
	
	if(!this.callbacks.hasOnProperty('shown')) {
		this.callbacks.shown = [];
	}

	this.callbacks.shown.push(callback);
};

WebEngageInAppChannel.prototype.onClick = function (callback) {
	if(!this.callbacks.hasOnProperty('click')) {
		this.callbacks.click = [];
	}

	this.callbacks.click.push(callback);
}

WebEngageInAppChannel.prototype.onDismiss = function(callback) {
	if(!this.callbacks.hasOnProperty('dismiss')) {
		this.callbacks.dismiss = [];
	}

	this.callbacks.dismiss.push(callback);
};

WebEngageInAppChannel.prototype.onCallbackReceived = function(type, data, id) {
	if(type) {
		switch(type) {
			case 'shown' :
				for(i = 0; i < this.callbacks.shown.length; i++) {
					this.callbacks.shown[i](data);
				}
				break;

			case 'click' :
				for(i = 0; i < this.callbacks.click.length; i++) {
					this.callbacks.click[i](data, id);
				}
				break;

			case 'dismiss' :
				for(i = 0; i < this.callbacks.dismiss.length; i++) {
					this.callbacks.dismiss[i](data);
				}
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