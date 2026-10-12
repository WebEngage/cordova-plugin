# WebEngage Plugin for Cordova/Phonegap


Read the complete documentation at [WebEngage Cordova/PhoneGap Plugin Documentation](http://docs.webengage.com/docs/cordova-integration)


## Supported versions

| Host | Floor | Ceiling |
|---|---|---|
| Capacitor | 6.x | 9.x |
| cordova-android | 12.x | 15.1.0 |
| cordova-ios | 7.x (CocoaPods only) | 8.1.1 (CocoaPods or SPM) |

- Version 2.0.0 raised the Cordova floor to cordova-android 12 / cordova-ios 7. Apps on older hosts should stay on 1.3.2 (pin it exactly).
- The Android native SDK is `com.webengage:android-sdk:5.+` (always the newest 5.x).
- iOS native SDK: CocoaPods `WebEngage` `>= 6.16.6`; SPM package `webengage-ios-sdk` from 2.0.0 (SDK core 7.x), linking both
  `WebEngageCore` and `WebEngageLocation` so CocoaPods and SPM builds have the same capabilities.
- iOS SPM support requires cordova-ios >= 8.0.0. Under Capacitor, SPM apps use this plugin's own `Package.swift`
  (checked against the Capacitor CLI sources of 8.5.2 and 9.0.0-alpha.7). If SPM does not work for your Capacitor version, add the iOS
  platform with `npx cap add ios --packagemanager cocoapods`.
- Deployment target: this plugin's `Package.swift` targets iOS 13 (the WebEngage SPM package also requires iOS 13). The CocoaPods pod for SDK 7.0.4 declares iOS 10.
- cordova-ios 7.x with a current Xcode can fail with `SWIFT_VERSION '' is unsupported`, because the
  WebEngage iOS SDK is Swift and the app target's Swift version is left empty. Fix it by adding
  `<preference name="SwiftVersion" value="5.0" />` inside `<platform name="ios">` in `config.xml`.
- CocoaPods trunk is scheduled to become read-only on 2026-12-02; new integrations should prefer
  SPM where the host supports it.


## Installation

```
cordova plugin add cordova-plugin-webengage --fetch
```


## Integration

Add the following details in your `config.xml` file.

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.key" android:value="YOUR-LICENSE-CODE" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="WEGLicenseCode" target="*-Info.plist">
            <string>YOUR-LICENSE-CODE</string>
        </config-file>
    </platform>

</widget>
```

**Note:** Replace 'YOUR-LICENSE-CODE' with your WebEngage License Code.


## Initialization

Initialize WebEngage SDK in your `wwww/js/index.js` file. Call `webengage.engage()` **once, at app launch**. Register your callbacks
(`webengage.push.onClick`, `webengage.notification.onShown`, ...) before it. You do not need to call `engage()` again on other pages:
push, in-app and JWT callbacks are delivered on every page that registers a handler.

```javascript
var app = {
    ...
    onDeviceReady: function() {
        ...

        // WebEngage initialization
        webengage.engage();
    }
}
```


## Configurations

### 1. Enable/Disable SDK Logs

Add the following tags in your `config.xml` file.

```xml
<widget ... >
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.debug" android:value="true" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="WEGLogLevel" target="*-Info.plist">
            <string>VERBOSE</string>
        </config-file>
    </platform>

</widget>
```

**Note:** Supported values for 'WEGLogLevel': 'VERBOSE', 'DEFAULT'.


### 2. Location Tracking

Add the following tags in your `config.xml` file. 

```xml
<widget ... >
    ...
    <!-- For Android -->
    <platform name="android">
        <config-file parent="/manifest/application" target="AndroidManifest.xml">
            ...
            <meta-data android:name="com.webengage.sdk.android.location_tracking" android:value="true" />
        </config-file>
        <config-file parent="/manifest" target="AndroidManifest.xml">
            ...
            <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
        </config-file>
    </platform>

    <!-- For iOS -->
    <platform name="ios">
        ...
        <config-file parent="UIBackgroundModes" target="*Info.plist">
            <array>
                <string>location</string>
            </array>
        </config-file>
    </platform>

</widget>
```


## Tracking Users

You can set user attributes as shown in below example.

```javascript
// User login
webengage.user.login("user-id");

// User logout
webengage.user.logout();

// Set system user attributes
webengage.user.setAttribute("we_first_name", "John");
webengage.user.setAttribute("we_last_name", "Doe");
webengage.user.setAttribute("we_email", "john.doe@gmail.com");
webengage.user.setAttribute("we_birth_date", "1986-08-19");
webengage.user.setAttribute("we_phone", "+551155256325");
webengage.user.setAttribute("we_gender", "male");  // Supported values: 'male', 'female', 'other'
webengage.user.setAttribute("we_company", "Alphabet Inc.");
webengage.user.setAttribute("we_hashed_email", "144e0424883546e07dcd727057fd3b62");
webengage.user.setAttribute("we_hashed_phone", "e0ec043b3f9e198ec09041687e4d4e8d");

// Set custom user attributes
webengage.user.setAttribute("Category", "GOLD");
webengage.user.setAttribute("Value Index", 5.06);
webengage.user.setAttribute("Inactive", false);
webengage.user.setAttribute("Registered On", new Date("2015-11-09T10:01:11.000Z"));
```

**Note:** WebEngage SDK only supports the following data-types: String, Number, Boolean and Date.


## Tracking Events

You can track events as shown in the following example.

```javascript
// Simple event
webengage.track("Added to cart");

// Event with attributes
webengage.track("Purchased", {"product-id": "123", "product-name": "wrist-watch", "product-price": 25.65});
```

**Note:** WebEngage SDK only supports the following data-types: String, Number, Boolean and Date.


## Push Notifications

### 1. Android Push Notification Integration

#### FCM Integration

**1. Add this plugin to your Cordova project.**

```
cordova plugin add https://github.com/WebEngage/cordova-plugin-android-fcm.git --fetch
```

**2. Add google-services.json file.**

Follow the steps at [Android FCM Documentation](https://firebase.google.com/docs/android/setup) to get the google-services.json file from Firebase Cloud.

Save google-services.json file in the root of your project directory.

**3. Update FCM token on app launch.**

Send FCM token to WebEngage SDK in your `wwww/js/index.js` file.

```javascript
var app = {
    ...
    onDeviceReady: function() {
        ...

        androidfcm.updateToken();
    }
}
```

Done. Run and test push notifications from WebEngage dashboard on your Android app.

#### GCM (removed)

Google shut down GCM (Google Cloud Messaging) in 2019; GCM no longer delivers notifications,
so there is no supported GCM integration path. **Use the FCM integration above.** If your app
still has the old GCM `config.xml` entries (`com.webengage.sdk.android.project_number`,
`com.webengage.sdk.android.auto_gcm_registration`, the `WebEngagePushReceiver` receiver, and the
`com.google.android.c2dm.*` / `${applicationId}.permission.C2D_MESSAGE` permissions), remove them
and follow the [FCM Integration](#fcm-integration) steps instead.

### 2. iOS Push Notification Integration

Enable 'Push Notifications' under capabilities tab in your XCode and then add 'WEGApnsAutoRegister' to info.plist with value true in `config.xml` file as shown below.

```xml
<widget ...>
    ...
    <platform name="ios">
        ...
        <config-file parent="WEGApnsAutoRegister" target="*-Info.plist">
            <true />
        </config-file>
    </platform>
</widget>
```

### iOS Rich Push (images, carousels, rating widgets — optional)

Rich push needs two additional Xcode targets (a Notification Service Extension and a Notification
Content Extension). No plugin tooling — this plugin's `plugin.xml`, Capacitor's CLI, or React
Native's autolinking — can create an Xcode target automatically; across every one of our hybrid
wrappers, that step is always done by hand in Xcode. This plugin ships the small amount that *can*
be shared (the two extension source files and full setup steps) at
[`templates/ios-rich-push/`](./templates/ios-rich-push/README.md).

Applies identically to Cordova and Capacitor apps (same plugin, same native SDK) except for which
`.xcworkspace` you open and one regeneration caveat — see that folder's README for both paths. The
short version: Capacitor's `ios/App` persists across `npx cap sync`, so manually-added extension
targets survive there; Cordova's `platforms/ios` does not survive `cordova platform remove && add`,
so redo this setup if you ever do that.

### 3. Push Notification Callbacks

```javascript
webengage.push.onClick(function(deeplink, customData) {
    console.log("Push notification clicked");
    ...
});
```


## In-App Notifications

No additional changes are required to show in-app notifications.

### In-App Notification Callbacks

```javascript
webengage.notification.onShown(function(inAppData) {
    console.log("In-app notification shown");
    ...
});

webengage.notification.onClick(function(inAppData, actionId) {
    console.log("In-app notification clicked");
    ...
});

webengage.notification.onDismiss(function(inAppData) {
    console.log("In-app notification dismissed");
    ...
});
```


## Capacitor

This plugin is a Cordova plugin, consumed by Capacitor through its Cordova-compatibility layer.
Installation and the JS API above are identical; a few things work differently because Capacitor
does not run Cordova's own project-configuration machinery.

### Setup

```
npm install cordova-plugin-webengage
npx cap sync
```

For iOS, `npx cap sync ios` (not a manual `pod install`) is what generates and installs this
plugin's dependencies for both CocoaPods and SPM projects.

### Capacitor does not apply these automatically

Capacitor does not run Cordova hooks, and it does not read the app's `config.xml` at all - so
everything this README's **Integration** and **Configurations** sections describe as a
`config.xml` `<config-file>` entry must instead be added directly to the app's own native project
files:

- **Android** - add the same `<meta-data>` tags shown above directly inside
  `android/app/src/main/AndroidManifest.xml`'s `<application>` element: the license code
  (`com.webengage.sdk.android.key`), and any of the optional ones you use (`...debug`,
  `...location_tracking`, `...project_number`, `...auto_gcm_registration`, `...small_icon`,
  `...large_icon`, `...accent_color`).
- **iOS** - add the corresponding keys directly to `ios/App/App/Info.plist`: `WEGLicenseCode`
  (String), `WEGLogLevel` (String), `WEGApnsAutoRegister` (Boolean), and the `UIBackgroundModes`
  array (`fetch`, `remote-notification`) this plugin normally adds via `config-file` - Capacitor
  only prints a reminder for that last one instead of adding it.

### Known limitations

- Dynamic config (passing a config object to `webengage.engage(config)`) is only implemented on
  Android; on iOS, `engage()` always reads static configuration from the native project files
  above.
- See **Supported versions** above for the Capacitor/SPM version range where this plugin's own
  `Package.swift` is honored.


## Troubleshooting

### 1. Manifest merger failed

```
Error: Element meta-data#com.webengage.sdk.android... at AndroidManifest.xml:... duplicated with element declared at AndroidManifest.xml:...
...
Error:
	Validation failed, exiting
```

This error is caused when there are duplicate meta-data tags in your AndroidManifest.xml file. To resolve this problem, simply run the command `cordova clean`.

### 2. AAPT: Error: unbound prefix

```
A problem occurred configuring project ':app'.
> org.xml.sax.SAXParseException; systemId: file:/.../AndroidManifest.xml; lineNumber: ...; columnNumber: ...; The prefix "android" for attribute "..." associated with an element type "manifest" is not bound.
```

This error is caused when AAPT cannot identify the prefix 'android' from your AndroidManifest.xml. To resolve this error, just add the android namespace attribute to the widget tag in your `config.xml` file as shown below.

```xml
<widget ... xmlns:android="http://schemas.android.com/apk/res/android">
    ...
</widget>
```


## Cordova Sample Project

Refer our [Cordova Sample Project](https://github.com/WebEngage/cordova-sample) for sample usage.
