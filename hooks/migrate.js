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

function updateAndroidManifest() {
    var manifestPath = 'platforms/android/AndroidManifest.xml';

	// As of cordova android 7.0.0, manifest path has been changed
	if (!fs.existsSync(manifestPath)) {
		manifestPath = 'platforms/android/app/src/main/AndroidManifest.xml';
    }

    if (!fs.existsSync(manifestPath)) {
        return;
    }
    
    fs.readFile(manifestPath, function(err, manifestFile) {
		if (err) {
			console.log(err);
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

updateAndroidManifest();
