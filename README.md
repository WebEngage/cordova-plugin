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

Open `we_config.xml` file within the `plugins\cordova-plugin-com-webengage` directory inside your app's root directory. All global configuration goes under the `config` tag.


1. **licenseCode**: Obtain your license code from the WebEngage dashboard and paste it within the `licenseCode` tag.



2. **debug** (optional) : Debug logs from SDK's are printed if the value of this tag is `true`. Default value of this tag is `false`.

```xml 
<config>
<licenseCode>~12345678</licenseCode>
<debug>false</debug>
...
...
</config>
```


### 2. Platform specific Configuration

#### Android

All android specific configuration goes under the `android` tag under the global `config` tag.

**packageName**: Insert your complete android application package name with `packageName` tag.

```xml
<config>
...
<android>
...
<packageName>com.hello.world</packageName>
...
</android>
</config>
```

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

webengage.engage();
}
``` 


## Push

### Android

All Android push related configurations goes under the `android` tag under the global `config` tag of `we_config.xml` file.

**1. autoPushRegister** : The allowed value for this tag is `false`(default) and `true`. Setting this tag as `true` means that WebEngage SDK will automatically handle the GCM/FCM push registration and messaging part provided that the corresponding GCM/FCM project number(sender id) is given under `pushProjectNumber` tag. 

Setting this tag as `false` means that WebEngage SDK will not handle push registration and messaging part in which case below mentioned `pushProjectNumber` tag should not be configured.

**2. pushProjectNumber** : Please insert your GCM/FCM project number (sender id) under this tag only if you have set `autoPushRegister` as `true`.

```xml
<pushProjectNumber>123456789012</pushProjectNumber>
```

**3. pushSmallIcon** : Please provide the path to your custom icon which will used as small icon while displaying push notification. If not provided then application default icon will be used as push small icon.

```xml
<pushSmallIcon>@drawable/ic_launcher</pushSmallIcon>
```

**4. pushLargeIcon** : Please provide the path to your custom icon which will used as large icon while displaying push notification. If not provided then application default icon will be used as push large icon.

```xml
<pushLargeIcon>@drawable/ic_launcher</pushLargeIcon>
```

**5. pushAccentColor** : This tag accepts a hex code of the color which will be used as push accent color.

```xml
<pushAccentColor>#FF0000</pushAccentColor>
```


### iOS


### Callback


## Other Configurations

### 1. Location Tracking

**Android**: To enable location tracking in android please insert `locationTracking` tag with value as `true` under `android` tag in `we_config.xml` file.
```xml
<config>
...
<android>
...
<locationTracking>true</locationTracking>
...
</android>
</config>
```
















