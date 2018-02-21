var fs = require('fs');
var xml2js = require('xml2js');
var debugLogEnabled = false;
var plist = require('plist');


function debugLog(text) {
	if (debugLogEnabled) {
		console.log(text);
	}
} 

debugLog('Executing WebEngage Hook');

var androidMetaDataKeys = ["com.webengage.sdk.android.key", "com.webengage.sdk.android.debug", "com.webengage.sdk.android.project_number", "com.webengage.sdk.android.location_tracking", "com.webengage.sdk.android.auto_gcm_registration", "com.webengage.sdk.android.environment", "com.webengage.sdk.android.alternate_interface_id","com.webengage.sdk.android.small_icon", "com.webengage.sdk.android.large_icon", "com.webengage.sdk.android.accent_color"];
var androidReceivers = ["com.webengage.sdk.android.WebEngageReceiver"];




var androidPushPermissions = [];
var androidLocationPermission = ['android.permission.ACCESS_FINE_LOCATION'];



function metaDataFilter(metaData)	{
	return !(metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1);
};

function constructNameValueTag(name, value){
	return { "$": { "android:name":name, "android:value":value} };
}

function constructNameResourceTag(name, resource) {
	return { "$": { "android:name":name, "android:resource":resource} };
}

function checkValidXml2jsNode(node) {
	return node && node instanceof Array && node.length > 0 ;
}

function addMetaData(manifest, config) {
	if(checkValidXml2jsNode(manifest.application)) {
		console.log("Adding meta datas");
		var metaData = manifest.application[0]['meta-data'];
		metaData = (checkValidXml2jsNode(metaData)) ? metaData.filter(metaDataFilter) : [];
		var licenseCode = getGlobalPropertyFromWEConfig('licenseCode', config);
		if(isString(licenseCode)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[0], licenseCode));
		}

		var debug = getGlobalPropertyFromWEConfig('debug', config);
		if(isString(debug)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[1], debug));
		}
		var pushProjectNumber = getPlatformPropertyFromWEConfig('android', 'pushProjectNumber', config);
		if(isString(pushProjectNumber)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[2], '$' + pushProjectNumber));
		}
		var locationTracking = getPlatformPropertyFromWEConfig('android', 'locationTracking', config);	
		if(isString(locationTracking)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[3], locationTracking));
		} else {
			metaData.push(constructNameValueTag(androidMetaDataKeys[3], "true"));
		}

		var autoPushRegister = getPlatformPropertyFromWEConfig('android', 'autoPushRegister', config);
		if(isString(autoPushRegister)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[4], autoPushRegister));
		} else {
			metaData.push(constructNameValueTag(androidMetaDataKeys[4], "false"));
		}

		var environment = getPlatformPropertyFromWEConfig('android', 'environment', config);
		if(isString(environment)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[5], environment));
		}

		var alternateInterfaceId = getPlatformPropertyFromWEConfig('android', 'alternateInterfaceId', config);
		if(isString(alternateInterfaceId)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[6], alternateInterfaceId));
		}

		var pushSmallIcon = getPlatformPropertyFromWEConfig('android', 'pushSmallIcon', config);
		if(isString(pushSmallIcon)) {
			metaData.push(constructNameResourceTag(androidMetaDataKeys[7], pushSmallIcon));
		}

		var pushLargeIcon = getPlatformPropertyFromWEConfig('android', 'pushLargeIcon', config);
		if(isString(pushLargeIcon)) {
			metaData.push(constructNameResourceTag(androidMetaDataKeys[8], pushLargeIcon));
		}

		var pushAccentColor = getPlatformPropertyFromWEConfig('android', 'pushAccentColor', config);
		if(isString(pushAccentColor)) {
			metaData.push(constructNameValueTag(androidMetaDataKeys[9], pushAccentColor));
		}
		
		manifest.application[0]['meta-data'] = metaData;
		console.log("meta data opeartions completed");
	}
	return manifest;
};


function receiverFilter(receiver) {
	return !(receiver && receiver['$'] && androidReceivers.indexOf(receiver['$']['android:name']) > -1);
}

function addReceivers(manifest, config) {
	if(checkValidXml2jsNode(manifest.application)) {
		console.log("Adding Receivers");
		var receivers = manifest.application[0].receiver;
		receivers = checkValidXml2jsNode(receivers) ? receivers.filter(receiverFilter) : [];
		

		
		var shouldDoAutoRegistration = getPlatformPropertyFromWEConfig('android', 'autoPushRegister', config);
		shouldDoAutoRegistration = isString(shouldDoAutoRegistration) ? (shouldDoAutoRegistration !== 'false') : false;
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
							"android:name":getPlatformPropertyFromWEConfig('android', 'packageName', config)
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
							"android:name":getPlatformPropertyFromWEConfig('android', 'packageName', config)
						}
					}]
				}]
			});
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
		
		var shouldDoAutoRegistration = getPlatformPropertyFromWEConfig('android', 'autoPushRegister', config);
		shouldDoAutoRegistration = isString(shouldDoAutoRegistration) ? (shouldDoAutoRegistration !== 'false') : false;
		if(shouldDoAutoRegistration) {
			usesPermissions = checkValidXml2jsNode(usesPermissions) ? usesPermissions.filter(pushPermissionFilter) : [];
			permisions = checkValidXml2jsNode(permisions) ? permisions.filter(pushPermissionFilter) : [];
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
		var shouldDoLocationTracking = getPlatformPropertyFromWEConfig('android', 'locationTracking', config);
		shouldDoLocationTracking = isString(shouldDoLocationTracking) ? (shouldDoLocationTracking !== 'false') : true;
		if(shouldDoLocationTracking) {
			usesPermissions = checkValidXml2jsNode(usesPermissions) ? usesPermissions.filter(locationPermissionFilter) : [];
			usesPermissions.push({
				"$":{
					"android:name":"android.permission.ACCESS_FINE_LOCATION"
				}
			});
		}
		manifest['uses-permission'] = usesPermissions;
		console.log("permissions opeartion completed");
		

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


	var licenseCode = getGlobalPropertyFromWEConfig('licenseCode', parsedConfig);
	if (licenseCode && isString(licenseCode)) {
		infoPlistObj['WEGLicenseCode'] = licenseCode;
	} else {
		console.log("License Code not found");
			    									//TODO: Possibly break the flow here
	}

	var debug = getGlobalPropertyFromWEConfig('debug', parsedConfig);

	if (debug !=  null && typeof debug === 'string') {
		debug = debug === 'true';
	}

	if (debug != null && typeof debug === 'boolean') {
		infoPlistObj['WEGLogLevel'] = debug?'VERBOSE':'DEFAULT';
	} else {
		infoPlistObj['WEGLogLevel'] = 'DEFAULT';
	}

	var apnsAutoRegister = getPlatformPropertyFromWEConfig('ios', 'apnsAutoRegister', parsedConfig);

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

	var backgroundLocationEnabled = getPlatformPropertyFromWEConfig('ios', 'backgroundLocation', parsedConfig) || false;

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
	var enableLocationAuthorizationRequest = getPlatformPropertyFromWEConfig('ios', 'WEGEnableLocationAuthorizationRequest', parsedConfig) || "NO";

	infoPlistObj['WEGEnableLocationAuthorizationRequest']
			    								= enableLocationAuthorizationRequest;
	//WEGEnableLocationAuthorizationRequest updated

	var nsLocationAlwaysUsageDescription = getPlatformPropertyFromWEConfig('ios',
			    							'NSLocationAlwaysUsageDescription', 
			    							parsedConfig);

	var nsLocationWhenInUseUsageDescription = getPlatformPropertyFromWEConfig('ios',
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
	
	fs.readFile('platforms/android/AndroidManifest.xml', function(err, manifestFile){

		if(err){
			console.log(err);
		} else {
			xml2js.parseString(manifestFile.toString(), function(err, result){
			
				if(err) {
					console.log(err);
				} else {
					console.log("Starting Android Operations");
					result.manifest = addMetaData(result.manifest, parsedConfig);
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

	});
}



function isString(value) {
	return value instanceof String || typeof value === 'string';
}

function getGlobalPropertyFromWEConfig(property, parsedConfig) {
	
	var propertyValue = null;
	if (checkValidXml2jsNode(parsedConfig[property])) {
    
    	propertyValue = parsedConfig[property][0];

    } else if (typeof parsedConfig[property] !== 'undefined' && parsedConfig[property] != null) {
    
    	propertyValue = parsedConfig[property];
    }
	return propertyValue;
}

function getPlatformPropertyFromWEConfig(platform, property, parsedConfig) {

	var propertyValue = null;

	var platformNode = null;
	if (parsedConfig[platform] && parsedConfig[platform] instanceof Array && parsedConfig[platform].length > 0) {
		platformNode = parsedConfig[platform][0];
	} else if(parsedConfig[platform] && (typeof parsedConfig[platform] === 'object')) {
		platformNode = parsedConfig[platform];
	}

	if (platformNode 
    	&& platformNode[property]
    	&& platformNode[property] instanceof Array
    	&& platformNode[property].length > 0) {

    	if (typeof platformNode[property][0] !== 'undefined' && platformNode[property][0] != null) {
    		propertyValue = platformNode[property][0];
    		
    	}

    } else if(platformNode && platformNode[property] !== 'undefined' && platformNode[property] != null) {
    	propertyValue = platformNode[property];
    }

    return propertyValue;
}


fs.readFile('plugins/cordova-plugin-webengage/we_config.xml', function(errFile, weConfig){
	if(errFile) {
		console.log(errFile);
	} else {
		xml2js.parseString(weConfig.toString(), function(err, result){
			if(err)	{
				console.log(err);
			} else {
				if(directoryExists('platforms/android')){
					androidPushPermissions = ["com.google.android.c2dm.permission.RECEIVE", getPlatformPropertyFromWEConfig('android', 'packageName', result.config) + '.permission.C2D_MESSAGE'];
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
	}
});



