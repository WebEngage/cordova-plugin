var fs = require('fs');
var xml2js = require('xml2js');

console.log('hook received');

var androidMetaDataKeys = ["com.webengage.sdk.android.key", "com.webengage.sdk.android.debug", "com.webengage.sdk.android.project_number", "com.webengage.sdk.android.location_tracking", "com.webengage.sdk.android.auto_gcm_registration", "com.webengage.sdk.android.environment", "com.webengage.sdk.android.alternate_interface_id"];
var androidReceivers = ["com.webengage.sdk.android.WebEngageReceiver"];


try {
	var config = fs.readFileSync('plugins/cordova-plugin-com-webengage/we_config.xml').toString();
}
catch (e) {
	process.stdout.write(e);
}


var androidPushPermissions = [];
var androidLocationPermission = ['android.permission.ACCESS_FINE_LOCATION'];



function metaDataFilter(metaData)	{
	return !(metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1);
};

function contructNameValueTag(name, value){
	return { "$": { "android:name":name, "android:value":value} };
}

function addMetaDatas(manifest, config) {
	if(manifest && manifest.application) {
		console.log("Adding meta datas");
		var metaDatas = manifest.application[0]['meta-data'];
		metaDatas = metaDatas ? metaDatas.filter(metaDataFilter) : [];
		if(config.licenseCode) {
			metaDatas.push(contructNameValueTag(androidMetaDataKeys[0], config.licenseCode[0]));
		}
		if(config.debug) {
			metaDatas.push(contructNameValueTag(androidMetaDataKeys[1], config.debug[0]));
		}
		if(config.android[0]) {
			if(config.android[0].pushProjectNumber) {
				metaDatas.push(contructNameValueTag(androidMetaDataKeys[2], '$' + config.android[0].pushProjectNumber[0]));
			}
			if(config.android[0].locationTracking) {
				metaDatas.push(contructNameValueTag(androidMetaDataKeys[3], config.android[0].locationTracking[0]));
			}
			if(config.android[0].autoPushRegister) {
				metaDatas.push(contructNameValueTag(androidMetaDataKeys[4], config.android[0].autoPushRegister[0]));
			}
			if(config.android[0].environment) {
				metaDatas.push(contructNameValueTag(androidMetaDataKeys[5], config.android[0].environment[0]));
			}
			if(config.android[0].alternateInterfaceId) {
				metaDatas.push(contructNameValueTag(androidMetaDataKeys[6], config.android[0].alternateInterfaceId[0]));
			}
		}
		manifest.application[0]['meta-data'] = metaDatas;
		console.log("meta data opeartions completed");
	}
	return manifest;
};


function receiverFilter(receiver) {
	return !(receiver && receiver['$'] && androidReceivers.indexOf(receiver['$']['android:name']) > -1);
}

function addReceivers(manifest, config) {
	if(manifest && manifest.application) {
		console.log("Adding Receivers");
		var receivers = manifest.application[0].receiver;
		receivers = receivers ? receivers.filter(receiverFilter) : [];
		

		if(config.android[0]) {
			var shouldDoAutoRegistration = config.android[0].autoPushRegister ? config.android[0].autoPushRegister[0]  === "true" : true;
			if(shouldDoAutoRegistration) {
				receivers.push({	
					"$" :{ 
						"android:name": androidReceivers[0], 
						"android:permission":"com.google.android.c2dm.permission.SEND"
					} , 
					"intent-filter":[{
						"action":[{
							"$":{
								"android:name":"com.google.android.c2dm.intent.RECEIVE"
							}
						},{
							"$":{
								"android:name":"com.webengage.sdk.android.intent.ACTION"
							}
						}],
						"category":[{
							"$":{
								"android:name":config.android[0].packageName
							}
						}]
					}]
				});
			}
			else   {
				receivers.push({
					"$":{
						"android:name":androidReceivers[0]
					},
					"intent-filter":[{
						"action":[{
							"$":{
								"android:name":"com.webengage.sdk.android.intent.ACTION"
							}
						}],
						"category":[{
							"$":{
								"android:name":config.android[0].packageName
							}
						}]
					}]
				});
			}
		}

		manifest.application[0].receiver = receivers;
		console.log("Receivers operations completed");
	}
	return manifest;
}

function pushPermissionFilter(permission) {
	return !(permission && permission['$'] && androidPushPermissions.indexOf(permission['$']['android:name']) > -1);
}

function locationPermissionFilter(permission) {
	return !(permission && permission['$'] && androidLocationPermission.indexOf(permission['$']['android:name']) > -1);
}


function addPermissions(manifest, config) {
	if(manifest) {
		console.log("Adding Permissions");
		var usesPermissions = manifest['uses-permission'];
		var permisions = manifest['permission'];
		if(config.android[0]) {
			var shouldDoAutoRegistration = config.android[0].autoPushRegister ? config.android[0].autoPushRegister[0]  === "true" : true;
			if(shouldDoAutoRegistration) {
				usesPermissions = usesPermissions ? usesPermissions.filter(pushPermissionFilter) : [];
				permisions = (permisions) ? permisions.filter(pushPermissionFilter) : [];
				usesPermissions.push({
					"$":{
						"android:name":androidPushPermissions[0]
					}
				});
				usesPermissions.push({
					"$":{
						"android:name":androidPushPermissions[1]
					}
				});
				permisions.push({
					"$":{
						"android:name":androidPushPermissions[1],
						"android:protectionLevel":"signature"
					}
				});
				manifest['permission'] = permisions;

			}
			var shoudlDoLocationTracking = config.android[0].locationTracking ? config.android[0].locationTracking[0]  === "true" : true;
			if(shoudlDoLocationTracking) {
				usesPermissions = (usesPermissions) ? usesPermissions.filter(locationPermissionFilter) : [];
				usesPermissions.push({
					"$":{
						"android:name":"android.permission.ACCESS_FINE_LOCATION"
					}
				});
			}
			manifest['uses-permission'] = usesPermissions;
			console.log("permissions opeartion completed");
		}

	}
	return manifest;
}

function directoryExists(path)	{
	try	{
		return fs.statSync(path).isDirectory();
	}
	catch (e) {
		return false;
	}
}

function performiOSOperations(parsedConfig)	{

}

function performedAndroidOperations(parsedConfig) {
	try {
		var androidManifest = fs.readFileSync('platforms/android/AndroidManifest.xml').toString();
	}
	catch (e) {
		process.stdout.write(e);
		return;
	}
	xml2js.parseString(androidManifest, function(err, result){
			
		if(err) {
			console.log(err);
		}
		else {
			console.log("Starting Android Operations");
			result.manifest = addMetaDatas(result.manifest, parsedConfig);
			result.manifest = addReceivers(result.manifest, parsedConfig);
			result.manifest = addPermissions(result.manifest, parsedConfig);
			var xml = new xml2js.Builder().buildObject(result);
			try {
				fs.writeFileSync('platforms/android/AndroidManifest.xml', xml);
			}
			catch (e) {
				process.stdout.write(e);
			}

		}
	});
}




xml2js.parseString(config, function(err, result){
	
	if(err)	{
		console.log(err);
	}
	else {
		if(directoryExists('platforms/android')){
			androidPushPermissions = ["com.google.android.c2dm.permission.RECEIVE", result.config.android[0].packageName[0] + '.permission.C2D_MESSAGE']
			performedAndroidOperations(result.config);
		}

		if(directoryExists('platforms/ios')){
			performiOSOperations(result.config);
		}
	}
});



