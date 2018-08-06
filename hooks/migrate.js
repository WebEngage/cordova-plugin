var fs = require('fs');
var xml2js = require('xml2js');

var androidMetaDataKeys = ["com.webengage.sdk.android.key", 
	"com.webengage.sdk.android.debug", 
	"com.webengage.sdk.android.project_number", 
	"com.webengage.sdk.android.location_tracking", 
	"com.webengage.sdk.android.auto_gcm_registration", 
	"com.webengage.sdk.android.environment", 
	"com.webengage.sdk.android.alternate_interface_id", 
	"com.webengage.sdk.android.small_icon", 
	"com.webengage.sdk.android.large_icon", 
	"com.webengage.sdk.android.accent_color"];

var androidReceivers = ["com.webengage.sdk.android.WebEngageReceiver"];

function checkValidXml2jsNode(node) {
	return node && node instanceof Array && node.length > 0 ;
}

function getAndroidManifestPath() {
	var manifestPath = 'platforms/android/AndroidManifest.xml';

	// As of cordova android 7.0.0, manifest path has been changed
	if (!fs.existsSync(manifestPath)) {
		manifestPath = 'platforms/android/app/src/main/AndroidManifest.xml';
	}
	
	return manifestPath;
}

function webengageMetaDataFilter(metaData) {
	return (metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1);
};

function androidPlatformFilter(platform) {
    return (platform && platform['$'] && platform['$']['name'] === "android");
}

function configFileFilter(configFile) {
    return (configFile && configFile['$'] && configFile['$']['parent'] === "/manifest/application");
}

function manifestFilter(configFile) {
	return (configFile && configFile['$'] && configFile['$']['parent'] === "/manifest");
}

var configMetaDataNames = [];

function metaDataDedupingFilter(webengageMetaData) {
	return !(webengageMetaData && webengageMetaData['$'] && configMetaDataNames.indexOf(webengageMetaData['$']['android:name']) > -1);
}

function getAutoGcmRegistration(metaData) {
	if (metaData == null || metaData.length == 0) {
		return false;
	}
	for (var i = 0; i < metaData.length; i++) {
		if (metaData[i]['$'] && metaData[i]['$']['android:name'] == "com.webengage.sdk.android.auto_gcm_registration") {
			if (metaData[i]['$']['android:value'] == "true") {
				return true;
			} else {
				return false;
			}
		}
	}
	return false;
}

function pushReceiverFilter(receiver) {
	return (receiver && receiver['$'] && receiver['$']['android:name'] == "com.webengage.sdk.android.WebEngagePushReceiver");
}

function migrateMetaData(manifest, config) {
	try {
		if (manifest["application"] && manifest["application"] instanceof Array && manifest["application"].length > 0) {
			var metaData = manifest.application[0]['meta-data'];
			if (metaData == null || metaData.length == 0) {
				return config;
			}

			var webengageMetaData = metaData.filter(webengageMetaDataFilter);
			if (webengageMetaData != null && webengageMetaData.length > 0) {
				if (!config['$']) {
					config['$'] = {"xmlns:android": "http://schemas.android.com/apk/res/android"};
				}

				if (!config['$']['xmlns:android']) {
					config['$']['xmlns:android'] = "http://schemas.android.com/apk/res/android";
				}

				var platforms = config.platform;
				var androidPlatform = platforms.filter(androidPlatformFilter);
				if (androidPlatform == null || androidPlatform.length == 0) {
					androidPlatform[0] = {"platform": []};
					androidPlatform[0]['$'] = {"name": "android"};
					platforms.push(androidPlatform[0]);
				}

				var platformConfigFiles = androidPlatform[0]['config-file'];
				if (platformConfigFiles == null) {
					platformConfigFiles = new Array();
					androidPlatform[0]['config-file'] = platformConfigFiles;
				}

				var configFile = platformConfigFiles.filter(configFileFilter);
				if (configFile == null) {
					configFile = new Array();
				}

				if (configFile.length == 0) {
					configFile[0] = {"meta-data": []};
					configFile[0]['$'] = {"parent": "/manifest/application", "target": "AndroidManifest.xml"};
					platformConfigFiles.push(configFile[0]);
				}

				var configMetaData = configFile[0]['meta-data'];
				if (configMetaData == null || configMetaData.length == 0) {
					configMetaData = new Array();
					for (var i = 0; i < webengageMetaData.length; i++) {
						configMetaData.push(webengageMetaData[i]);
					}
					configFile[0]['meta-data'] = configMetaData;
				} else {
					for (var i = 0; i < configMetaData.length; i++) {
						if (configMetaData[i]['$']) {
							configMetaDataNames.push(configMetaData[i]['$']['android:name']);
						}
					}
					webengageMetaData = webengageMetaData.filter(metaDataDedupingFilter);
					for (var i = 0; i < webengageMetaData.length; i++) {
						configMetaData.push(webengageMetaData[i]);
					}
				}
				
				var registerAutoGcm = getAutoGcmRegistration(configMetaData);
				if (registerAutoGcm) {
					// Add push permissions
					var manifestConfigFile = platformConfigFiles.filter(manifestFilter);
					if (manifestConfigFile == null || manifestConfigFile.length == 0) {
						manifestConfigFile = [];
						manifestConfigFile[0] = {"uses-permission": [], "permission": []};
						manifestConfigFile[0]['$'] = {"parent": "/manifest", "target": "AndroidManifest.xml"};
						androidPlatform[0]['config-file'].push(manifestConfigFile[0]);
					}
					var usesPermissions = manifestConfigFile[0]['uses-permission'];
					if (usesPermissions == null) {
						usesPermissions = new Array();
						manifestConfigFile[0]['uses-permission'] = usesPermissions;
					}
					
					var permissions = manifestConfigFile[0]['permission'];
					if (permissions == null) {
						permissions = new Array();
						manifestConfigFile[0]['permission'] = permissions;
					}

					var hasReceivePermission = false;
					var hasMessagePermission = false;
					var hasSignatureMessagePermission = false;
					for (var i = 0; i < usesPermissions.length; i++) {
						if (usesPermissions[i] && usesPermissions[i]['$']) {
							if (usesPermissions[i]['$']['android:name'] == "com.google.android.c2dm.permission.RECEIVE") {
								hasReceivePermission = true;
							} else if (usesPermissions[i]['$']['android:name'] == "${applicationId}.permission.C2D_MESSAGE") {
								hasMessagePermission = true;
							}
						}
					}
					for (var i = 0; i < permissions.length; i++) {
						if (permissions[i] && permissions[i]['$'] && permissions[i]['$']['android:name'] == "${applicationId}.permission.C2D_MESSAGE" && permissions[i]['$']['android:protectionLevel'] && permissions[i]['$']['android:protectionLevel'] == "signature") {
							hasSignatureMessagePermission = true;
						}
					}
					if (!hasReceivePermission) {
						var receiverPermission = {};
						receiverPermission['$'] = {"android:name": "com.google.android.c2dm.permission.RECEIVE"};
						manifestConfigFile[0]['uses-permission'].push(receiverPermission);
					}
					if (!hasMessagePermission) {
						var messagePermission = {};
						messagePermission['$'] = {"android:name": "${applicationId}.permission.C2D_MESSAGE"};
						manifestConfigFile[0]['uses-permission'].push(messagePermission);
					}
					if (!hasSignatureMessagePermission) {
						var signatureMessagePermission = {};
						signatureMessagePermission['$'] = {"android:name": "${applicationId}.permission.C2D_MESSAGE", "android:protectionLevel": "signature"};
						manifestConfigFile[0]['permission'].push(signatureMessagePermission);
					}

					// Add PushReceiver
					var receivers = configFile[0]['receiver'];
					if (receivers == null || receivers.length == 0) {
						receivers = new Array();
						receivers[0] = {"intent-filter": []};
						receivers[0]['$'] = {"android:name": "com.webengage.sdk.android.WebEngagePushReceiver", "android:permission": "com.google.android.c2dm.permission.SEND"};
						var action = {};
						action['$'] = {"android:name": "com.google.android.c2dm.intent.RECEIVE"};
						var category = {};
						category['$'] = {"android:name": "${applicationId}"};
						receivers[0]['intent-filter'] = {"action": [], "category": []};
						receivers[0]['intent-filter']['action'] = action;
						receivers[0]['intent-filter']['category'] = category;
						configFile[0]['receiver'] = receivers;
					} else {
						var prevReceiver = receivers.filter(pushReceiverFilter);
						if (prevReceiver == null || prevReceiver.length == 0) {
							var receiver = {"intent-filter": []};
							receiver['$'] = {"android:name": "com.webengage.sdk.android.WebEngagePushReceiver", "android:permission": "com.google.android.c2dm.permission.SEND"};
							var action = {};
							action['$'] = {"android:name": "com.google.android.c2dm.intent.RECEIVE"};
							var category = {};
							category['$'] = {"android:name": "${applicationId}"};
							receiver['intent-filter'] = {"action": [], "category": []};
							receiver['intent-filter']['action'] = action;
							receiver['intent-filter']['category'] = category;
							receivers.push(receiver);
						}
					}
				}
			}
		}
	} catch(e) {
		console.log("Error migrating meta-data");
	}
    return config;
}

function metaDataFilter(metaData) {
	return !(metaData && metaData['$'] && androidMetaDataKeys.indexOf(metaData['$']['android:name']) > -1);
};

function removeMetaData(manifest) {
	if (checkValidXml2jsNode(manifest.application)) {
		var metaData = manifest.application[0]['meta-data'];
		metaData = (checkValidXml2jsNode(metaData)) ? metaData.filter(metaDataFilter) : [];
		manifest.application[0]['meta-data'] = metaData;
	}
	return manifest;
}

function receiverFilter(receiver) {
	return !(receiver && receiver['$'] && androidReceivers.indexOf(receiver['$']['android:name']) > -1);
}

function removeReceivers(manifest) {
	if (checkValidXml2jsNode(manifest.application)) {
		var receivers = manifest.application[0].receiver;
		receivers = checkValidXml2jsNode(receivers) ? receivers.filter(receiverFilter) : [];
		manifest.application[0].receiver = receivers;
	}
	return manifest;
}

function updateAndroidManifest() {
    var manifestPath = getAndroidManifestPath();
    if (!fs.existsSync(manifestPath)) {
        return;
    }
    
    fs.readFile(manifestPath, function(readError, manifestFile) {
		if (readError) {
			console.log(readError);
		} else {
            xml2js.parseString(manifestFile.toString(), function(err, result) {
				if (err) {
					console.log(err);
				} else {
					result.manifest = removeMetaData(result.manifest);
					result.manifest = removeReceivers(result.manifest);
					var xml = new xml2js.Builder().buildObject(result);
					try {
						fs.writeFileSync(manifestPath, xml);
					} catch(e) {
						process.stdout.write(e);
					}
				}
			});
        }
    });
}

function updateConfig() {
	var manifestPath = getAndroidManifestPath();
	if (!fs.existsSync(manifestPath)) {
        return;
    }

	fs.readFile(manifestPath, function(manifestReadError, manifest) {
		if (manifestReadError) {
			console.log("Error reading AndroidManifest file: " + manifestReadError);
		} else {
			xml2js.parseString(manifest.toString(), function(manifestParseError, manifestResult) {
				if (manifestParseError) {
					console.log("Error parsing AndroidManifest file: " + manifestParseError);
				} else {
					var configPath = "config.xml";

					if (!fs.existsSync(configPath)) {
						return;
					}

					fs.readFile(configPath, function(configReadError, config) {
						if (configReadError) {
							console.log("Error reading config.xml file: " + configReadError);
						} else {
							xml2js.parseString(config.toString(), function(configParseError, configResult) {
								if (configParseError) {
									console.log("Error parsing config.xml file: " + configParseError);
								} else {
									// Move all meta-data tags from AndroidManifest.xml to config.xml
									configResult.widget = migrateMetaData(manifestResult.manifest, configResult.widget);
									
									var xml = new xml2js.Builder().buildObject(configResult);
									try {
										fs.writeFileSync("config.xml", xml);
									} catch(e) {
										process.stdout.write(e);
									}

									// Remove all meta-data and receiver tags from AndroidManifest.xml
									updateAndroidManifest();
								}
							});
						}
					});
				}
			});
		}
	});
}

updateConfig();
