var exec = require('cordova/exec');

exports.login = function(userId, success, error) {
    exec(success, error, "WebEngagePlugin", "login", [userId]);
};

exports.onActive = function(callback) {
	
	exec(function(){
		if (callback) {
			callback();
		}
	}, function(){
		console.log("error");
	}, "WebEngagePlugin", "onActive", [])
	
}