var exec = require('cordova/exec');

function WebEngagePlugin() {

}


WebEngagePlugin.prototype.engage = function() {
	exec(null, null, "WebEngagePlugin", "engage",[]);
};

WebEngagePlugin.prototype.login = function(userId, success, error) {
    exec(success, error, "WebEngagePlugin", "login", [userId]);
};

WebEngagePlugin.prototype.onActive = function(callback) {
	
	exec(function(){
		if (callback) {
			callback();
		}
	}, function(){
		console.log("error");
	}, "WebEngagePlugin", "onActive", [])
	
}
if(typeof module != 'undefined' && module.exports) {
	var WebEngagePlugin = new WebEngagePlugin();
	module.exports = WebEngagePlugin;
}