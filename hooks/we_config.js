var fs = require('fs');
var xml2js = require('xml2js');
var debugLogEnabled = true;
var plist = require('plist');


function debugLog(text) {
	if (debugLogEnabled) {
		console.log(text);
	}
} 

debugLog('Executing WebEngage Hook');

var androidMetaDataKeys = ["com.webengage.sdk.android.key", "com.webengage.sdk.android.debug", "com.webengage.sdk.android.project_number", "com.webengage.sdk.android.location_tracking", "com.webengage.sdk.android.auto_gcm_registration", "com.webengage.sdk.android.environment", "com.webengage.sdk.android.alternate_interface_id"];
var androidReceivers = ["com.webengage.sdk.android.WebEngageReceiver"];


try {

	we_config = fs.readFileSync('plugins/cordova-plugin-com-webengage/we_config.xml').toString();

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

	debugLog("Reading App's config.xml for App Name");
	fs.readFile("config.xml", function(errFile, appConfigResult) {

		if (errFile) {
			console.log(errFile);
		} else {
			debugLog("Parsing App's config.xml");
			xml2js.parseString(appConfigResult, function(errParsing, appConfig) {

				if(errParsing) {
					console.log(errParsing);
				} else {
					var name = appConfig.widget.name;

					if (name) {
						debugLog("App's Name Found in config.xml: "+ name);
						var iOSDir = "platforms/ios/"+name;
						if ( directoryExists(iOSDir) ) {
							
							debugLog("Searching for Info.plist file in App directory");
							fs.readdir(iOSDir, function(err, files) {
    							
    							files.filter(function(file) { 
    								return file.endsWith("Info.plist");
    							}).forEach(function(file) { 

    								debugLog("Editing "+file+" for WebEngage's SDK configuration");
    								
									fs.readFile(iOSDir+"/"+file, 'utf8', function(err, infoPlistFileData) {
    									if (err) {
											console.log("Error in opening "+file+ " file");
										} else {
    										updateInfoPList(infoPlistFileData, {
    											"iOSDirectory": iOSDir,
    											"fileName": file,
    											"config": parsedConfig
    										});
    									}
    								});
								});
							});

						} else {
							console.log("iOS project directory not found");
						}
					}
				}
			});
		}	

	});

}

function updateInfoPList(infoPlistFileData, context) {

	var fileName = context['fileName'];
	var iOSDir = context['iOSDirectory'];
	var parsedConfig = context['config'];

	debugLog(fileName + " data:\n", infoPlistFileData);
	var infoPlistObj = plist.parse(infoPlistFileData, 'utf8');

	debugLog("Parsed "+fileName+ "\n:" + JSON.stringify(infoPlistObj));


	var licenseCode = getGlobalPropertyFromWeConfig('licenseCode', parsedConfig);
	if (licenseCode && isString(licenseCode)) {
		infoPlistObj['WEGLicenseCode'] = licenseCode;
	} else {
		console.log("License Code not found");
			    									//TODO: Possibly break the flow here
	}

	var debug = getGlobalPropertyFromWeConfig('debug', parsedConfig);

	if (debug !=  null && typeof debug === 'string') {
		debug = debug === 'true';
	}

	if (debug != null && typeof debug === 'boolean') {
		infoPlistObj['WEGLogLevel'] = debug?'VERBOSE':'DEFAULT';
	} else {
		infoPlistObj['WEGLogLevel'] = 'DEFAULT';
	}

	var apnsAutoRegister = getIOSPropertyFromWEConfig('apnsAutoRegister', parsedConfig);

	if (apnsAutoRegister !=  null && typeof apnsAutoRegister === 'string') {
		apnsAutoRegister = apnsAutoRegister !== 'false';
	}

	if (apnsAutoRegister != null && typeof apnsAutoRegister === 'boolean') {
		infoPlistObj['WEGApnsAutoRegister'] = apnsAutoRegister;
	} else {
		infoPlistObj['WEGApnsAutoRegister'] = true;
	}
			    								
	//Adding UIBackgroundModes
	var uiBackgroundModes = infoPlistObj['UIBackgroundModes'];

	var backgroundLocationEnabled = getIOSPropertyFromWEConfig(
									'backgroundLocation', parsedConfig) || false;

	if (isString(backgroundLocationEnabled)) {
		backgroundLocationEnabled = backgroundLocationEnabled === 'true';
	}
			    								
	if (uiBackgroundModes) {

		var fetchEntry = false;
		var remoteNotificationEntry = false;
		var locationEntry = false;

		uiBackgroundModes.forEach(function(value) {
			if (value === 'fetch') {
			    fetchEntry = true;
			} else if (value === 'remote-notification') {
				remoteNotificationEntry = true;
			} else if(value === 'location') {
			    locationEntry = true;
			}
		});

		if (!fetchEntry) {
			uiBackgroundModes.push('fetch');
		}

		if (!remoteNotificationEntry) {
			uiBackgroundModes.push('remote-notification');
		}

		if (!locationEntry && backgroundLocationEnabled) {
			uiBackgroundModes.push('location');
		}


	} else {

		uiBackgroundModes = ['fetch', 'remote-notification'];
		if (backgroundLocationEnabled) {
			uiBackgroundModes.push('location');
		}

	}

	infoPlistObj['UIBackgroundModes'] = uiBackgroundModes;
	//UIBackgroundProperties Added

	//Updating WEGEnableLocationAuthorizationRequest
	var enableLocationAuthorizationRequest = getIOSPropertyFromWEConfig(
			    									'WEGEnableLocationAuthorizationRequest', 
			    									parsedConfig) 
			    								|| "NO";

	infoPlistObj['WEGEnableLocationAuthorizationRequest']
			    								= enableLocationAuthorizationRequest;
	//WEGEnableLocationAuthorizationRequest updated

	var nsLocationAlwaysUsageDescription = getIOSPropertyFromWEConfig(
			    							'NSLocationAlwaysUsageDescription', 
			    							parsedConfig);

	var nsLocationWhenInUseUsageDescription = getIOSPropertyFromWEConfig(
			    								'NSLocationWhenInUseUsageDescription', 
			    								parsedConfig);

	if (nsLocationAlwaysUsageDescription) {
		infoPlistObj['NSLocationAlwaysUsageDescription'] 
		= nsLocationAlwaysUsageDescription;
	}

	if (nsLocationWhenInUseUsageDescription) {
		infoPlistObj['NSLocationWhenInUseUsageDescription'] 
		= nsLocationWhenInUseUsageDescription;
	}

	var nullRemovedJSON = JSON.stringify(infoPlistObj, function(key, value){

		return value == null? "":value;

	});

	var nullRemovedInfoPlistObj = JSON.parse(nullRemovedJSON);

	var infoPlistFileContent = plist.build(nullRemovedInfoPlistObj);

	debugLog("Updating "+fileName+" with following configuration: \n"+
		JSON.stringify(nullRemovedInfoPlistObj, null, 2));

	fs.writeFile(iOSDir+"/"+fileName, infoPlistFileContent, function(err) {

		if (err) {
			console.log('Error in updating '+ fileName +' file');
		} else {
			console.log(fileName + ' file updated for WebEngage SDK');
		}
	});

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




xml2js.parseString(we_config, function(err, result){
	
	if(err)	{
		console.log(err);
	} else {
		if(directoryExists('platforms/android')){
			androidPushPermissions = ["com.google.android.c2dm.permission.RECEIVE", 
										result.config.android[0].packageName[0] + '.permission.C2D_MESSAGE'];
			performedAndroidOperations(result.config);
		}

		if(directoryExists('platforms/ios')) {

			debugLog("Preparing iOS build configuration");
			performiOSOperations(result.config);
		} else {
			console.log("ios platform directory is not present");
		}
	}
});

function isString(value) {
	return value instanceof String || typeof value === 'string';
}

function getGlobalPropertyFromWeConfig(property, parsedConfig) {
	
	var propertyValue = null;
	if (parsedConfig[property] 
    	&& parsedConfig[property] instanceof Array 
    	&& parsedConfig[property].length > 0) {
    
    	propertyValue = parsedConfig[property][0];

    } else if (typeof parsedConfig[property] !== 'undefined' && parsedConfig[property] != null) {
    
    	propertyValue = parsedConfig[property];
    }
	return propertyValue;
}

function getIOSPropertyFromWEConfig(property, parsedConfig) {

	var propertyValue = null;

	var iosNode = null;
	if (parsedConfig.ios && parsedConfig.ios instanceof Array && parsedConfig.ios.length > 0) {
		iosNode = parsedConfig.ios[0];
	} else if(parsedConfig.ios && (typeof parsedConfig.ios === 'object')) {
		iosNode = parsedConfig.ios;
	}

	if (iosNode 
    	&& iosNode[property]
    	&& iosNode[property] instanceof Array
    	&& iosNode[property].length > 0) {

    	if (typeof iosNode[property][0] !== 'undefined' && iosNode[property][0] != null) {
    		propertyValue = iosNode[property][0];
    		
    	}

    } else if(iosNode && iosNode[property] !== 'undefined' && iosNode[property] != null) {
    	propertyValue = iosNode[property];
    }

    return propertyValue;
}



