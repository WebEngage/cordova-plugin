WebEngage for PhoneGap/Cordova
========

## Supported Versions

The Cordova SDK was tested on Cordova v6.4.0

## Installation

	cordova plugin add cordova-plugin-webengage

## Integration

To install WebEngage for your Cordova App, you'll need to take three basic steps.

1. Add global configuration to the plugin's we_config.xml file.

2. Add platform specific configuration to we_config.xml file

3. Initialise the plugin.



### 1. Global Configuration

1. Open `we_config.xml` file within the `plugins\cordova-plugin-webengage` directory inside your app's root directory.
2. Obtain your license code from the WebEngage dashboard and paste it within the `licenseCode` tag in the xml file.


### 2. Platform specific Configuration

#### Android



#### iOS

All the iOS specific configuration goes under the `ios` tag under the global `config` tag. The following properties can be used to configure the SDK of the behaviour as documented below:

1. **backgroundLocation** : The allowed values for this property are `true` and `false`(default). If `true` WebEngage SDK will track location updates in the background for the user.

2. **apnsAutoRegister** : The allowed values for this property are `true`(default) and `false`. If the property is missing or the value is anything other than `false`, WebEngage SDK will handle automatic registration of the device with Apple Push Notification Service. 

In case your app handles the APNS registration, or uses some other third party tool for the same, `false` value should be used for this property.

3. **WEGEnableLocationAuthorizationRequest** : The allowed values are `NO`(default), `IN_USE` and `ALWAYS`. 
If the value of the property is `IN_USE` or `ALWAYS`, WebEngage SDK will launch location permission pop up at the initial launch of the app, seeking permission to use location either: 
 - when the app is in use only(IN_USE),
 - always(ALWAYS)

If the property is not present, or the value is anything other than `IN_USE` or `ALWAYS`, WebEngage SDK will not launch the location permission pop up and the onus of seeking the location permission would completely lie on your App.

P.S: 
 - Location based features will work as long as the App has requisite permissions, whether those permissions were triggered by WebEngage SDK or the App itself. 
 - The `ALWAYS` permission is required for campaigns based on geo-fenced segments.

4. **NSLocationWhenInUseUsageDescription** : This is a standard iOS App Info.plist property. This property is optional but is required if the value for `WEGEnableLocationAuthorizationRequest` property is `IN_USE`. If you do not provide this property, iOS will restrict launching the location permission dialog.

5. **NSLocationAlwaysUsageDescription** : This is a standard iOS App Info.plist property. This property is optional but is required if the value for `WEGEnableLocationAuthorizationRequest` property is `ALWAYS`. If you do not provide this property, iOS will restrict launching the location permission dialog.

### 3. Initialise the plugin

In your `onDeviceReady` callback call:


```
onDeviceReady: function() {

		/**
		 Additional WebEngage options and callbacks to be 
		 registered here before calling webEngage.engage()
		**/
        
        webEngage.engage();
}
``` 












