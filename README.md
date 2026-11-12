# WebEngage Plugin for Cordova

The WebEngage Cordova plugin connects your Cordova app to the WebEngage Android and iOS SDKs, so that you can track users and events and engage users with push and in-app messages.

Read the complete documentation at [WebEngage Cordova Documentation](https://docs.webengage.com/docs/cordova).


## Supported versions

| Platform          | Supported versions                    |
| ----------------- | ------------------------------------- |
| `cordova-android` | 12.0.0 or later (tested up to 15.1.0) |
| `cordova-ios`     | 7.0.0 or later (tested up to 8.1.1)   |

If your app uses `cordova-android` 11 or lower, or `cordova-ios` 6 or lower, install version 1.3.2 explicitly:

```
cordova plugin add cordova-plugin-webengage@1.3.2
```


## Installation

```
cordova plugin add cordova-plugin-webengage
```

The plugin adds the WebEngage Android and iOS SDKs to your app. With `cordova-ios` 7 the iOS SDK is installed through CocoaPods, so CocoaPods must be installed on your Mac; with `cordova-ios` 8 it is installed through Swift Package Manager.


## Upgrading from 1.x

Upgrade all WebEngage Cordova plugins your app uses together. `cordova plugin add` does not update a plugin that is already installed, so remove the plugins and add them again in this order (skip the plugins your app doesn't use):

```
cordova plugin rm we-notificationinbox-cordova
cordova plugin rm we-cordova-android-fcm
cordova plugin rm cordova-plugin-webengage

cordova plugin add cordova-plugin-webengage@2.0.0
cordova plugin add we-cordova-android-fcm@2.0.0
cordova plugin add we-notificationinbox-cordova@2.0.0
```

Then follow the checks in [Upgrading to 2.0.0](https://docs.webengage.com/docs/cordova-advanced#upgrading-to-200). The full list of changes is in the [CHANGELOG](./CHANGELOG.md).


## Quick start

Add your license code to `config.xml`:

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            <meta-data android:name="com.webengage.sdk.android.key" android:value="YOUR_WEBENGAGE_LICENSE_CODE" />
        </config-file>
    </platform>

    <platform name="ios">
        <config-file parent="WEGLicenseCode" target="*-Info.plist">
            <string>YOUR_WEBENGAGE_LICENSE_CODE</string>
        </config-file>
    </platform>
</widget>
```

Initialize the SDK once, when the app starts, after registering your callbacks:

```javascript
onDeviceReady: function() {
    webengage.push.onClick(function(deeplink, customData) {
        ...
    });

    webengage.engage();
}
```

Track users and events:

```javascript
webengage.user.login("user-id");
webengage.user.setAttribute("we_email", "john@doe.com");
webengage.track("Added To Cart", { "Price": 39.80 });
```


## Documentation

| Topic | Page |
| --- | --- |
| Integration (installation, `config.xml`, region, initialization) | [Cordova](https://docs.webengage.com/docs/cordova) |
| Users, user attributes and channel opt-in | [Tracking Users](https://docs.webengage.com/docs/cordova-tracking-users) |
| Custom events | [Tracking Events](https://docs.webengage.com/docs/cordova-tracking-events) |
| Push notifications (Android FCM and iOS) | [Push Messaging](https://docs.webengage.com/docs/cordova-push-messaging) |
| In-app messages and screens | [In-app Messaging](https://docs.webengage.com/docs/cordova-in-app-messaging) |
| Push and in-app callbacks, handling errors | [Callbacks](https://docs.webengage.com/docs/cordova-callbacks) |
| Location tracking, upgrading, troubleshooting | [Advanced](https://docs.webengage.com/docs/cordova-advanced) |


## Sample project

Refer to our [Cordova Sample Project](https://github.com/WebEngage/cordova-sample) for sample usage.

Please feel free to drop in a few lines at support@webengage.com in case you have any further queries.
