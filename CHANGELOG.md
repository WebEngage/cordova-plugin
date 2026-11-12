# Changelog

## 2.0.0

### Breaking changes (read before upgrading from 1.3.x)
- **Minimum platform versions raised** from cordova-android >= 4.1 / cordova-ios >= 4 to **cordova-android >= 12.0.0 / cordova-ios >= 7.0.0**
  (`plugin.xml` `<engines>`, `package.json` `engines.cordovaDependencies["2.0.0"]`). Apps on older platforms stay on 1.3.2 and must
  install it with an explicit version (`cordova plugin add cordova-plugin-webengage@1.3.2`); a `^1.3.2` range keeps resolving to 1.x.
  Reason: `android-sdk` 5.2.0 pulls `com.webengage:we-inspector`, which needs AndroidX libraries that require `compileSdk` 33 or higher;
  cordova-android 11 and older compile at 32 or lower, so the build fails in `checkDebugAarMetadata`.
- **cordova-ios 8 installs the iOS SDK through Swift Package Manager** (`<platform name="ios" package="swift">` + `Package.swift`), not
  CocoaPods. cordova-ios 7 keeps using the CocoaPods pod. Upgrade `we-notificationinbox-cordova` to 2.0.0 at the same time: inbox 1.0.1 still
  pulls the WebEngage pod and can put a second copy of the SDK in the app. Remove any WebEngage framework or pod your app added itself.
- **Android native SDK moved from `com.webengage:android-sdk:4.+` to `5.+`.** The range is dynamic by design (always the newest 5.x).
  SDK 5.x adds the transitive runtime dependency `com.webengage:we-inspector`; make sure your Maven mirror or allow-list can resolve it.
- **Android Gradle script:** the plugin no longer adds `jcenter()` / `mavenCentral()` to every project and no longer sets
  `compileSdkVersion` / `minSdkVersion` / `targetSdkVersion` (`jcenter()` fails on Gradle 9). An app that relied on this plugin to add
  `jcenter()` for another dependency must declare the repository itself.
- **iOS WebEngage pod floor is `>= 6.16.6`** (was unpinned). Apps locked on an older WebEngage pod move to 6.16.6 or later.
- **In-app `dismiss` no longer also fires `onPrepared`.** A missing `break` made every dismissal re-fire the prepared callback; an app that
  relied on that now only gets `onDismiss`.
- **Success and error callbacks are now called.** Every method accepts optional callbacks as its last arguments:
  `method(...args, successCallback, errorCallback)`. One trailing function is the success callback; two are success and error. In 1.3.2 these
  callbacks were never called, so promise wrappers such as `@awesome-cordova-plugins/webengage` never settled. They now resolve on success
  and reject on error: code after `await` that never ran before now runs, and an unhandled rejection is logged if you don't add `.catch`.
  Calls without callbacks are unaffected. `user.setAttribute({ ... }, successFn)` (object form with a trailing function) now applies the
  attributes; in 1.3.2 the function landed in the value slot and nothing was sent.
- **Invalid arguments are rejected the same way on Android and iOS.** The arguments are checked once in the plugin's JavaScript: an invalid
  call runs the error callback with a message (`track: eventName must be a non-empty string`, ...), logs it with `console.error`, and sends
  nothing to the native SDK. Valid calls are unchanged. What changes:
  - Reported as errors on both platforms (Android used to accept them silently or send them): a missing, `null` or empty event name, screen
    name, user ID, secure token, FCM token or option key; `setUserOptIn` with an unknown channel or a non-boolean value; `setDevicePushOptIn`
    with a non-boolean value; `setLocation` with values that are not numbers; `onMessageReceived` with a payload that is not an object or its
    JSON text; `setAttribute` with neither a name and value nor one object; `login(userId, token)` with a token that is not a string (Android
    used to skip the login, iOS logged in without the token).
  - Accepted on both platforms (Android already accepted them; iOS replied with an error): numbers and booleans as event name, option key or
    FCM token are sent as text (`track(123)` tracks `"123"`); `setLocation` with numeric strings such as `"12.97"` (iOS used to reject
    them on devices whose locale uses a decimal comma, and when one coordinate was a number and the other a string).
  - No longer accepted on iOS (Android never accepted them): non-boolean opt-in values such as `setUserOptIn("sms", 1)`, and booleans as
    coordinates.
  - `login(userId, "")` and `login(userId, null)` log in without a token on both platforms.
- **iOS:** the internal `AppDelegate (WebEngagePlugin)` category files were replaced by a plain `WEGAppDelegateHelper` class (see Changed).
- **Upgrading needs `cordova plugin rm` + `cordova plugin add`** (see Upgrading from 1.3.x).

### Added
- iOS: Swift Package Manager support (`Package.swift`, plus the CocoaPods pod with `nospm` for cordova-ios 7). The package links the Core
  **and Location** products (`WebEngageCore`, `WebEngageLocation`), so an app that moves from CocoaPods to SPM keeps automatic location
  tracking and geofencing.
- Optional success and error callbacks on every method (see Breaking changes). This includes iOS `engage`, which sent no reply before.
- iOS: handlers for the Android-only actions (`pushOptions`, `inappOptions`, `globalOptions`, `setDevicePushOptIn`, `sendFcmToken`,
  `onMessageReceived`), so calling them on iOS succeeds instead of never replying.
- `plugin.xml` `<engines>` and `package.json` `engines.cordovaDependencies` declare the minimum platform versions, so `cordova plugin add`
  without a version selects 1.3.2 for projects whose installed platforms are older.
- `npm run check-version` (also run on `prepublishOnly`) keeps `package.json`, `plugin.xml`, `version.properties` and `WEGPluginVersion` in sync.
- `package.json` `files` allowlist: only the plugin's shipping files are published.

### Changed
- Android: push, in-app and JWT events are delivered through a Cordova plugin result channel instead of the deprecated
  `webView.sendJavascript()`, with the same callback arguments as 1.3.2. The plugin's JavaScript opens the channel on every page load,
  because Cordova drops it on every top-level navigation or reload while `engage()` runs only once per app launch.
- iOS: the `AppDelegate` category is replaced by `WEGAppDelegateHelper`, which also receives the SDK's in-app callbacks and forwards them to the
  plugin. Needed for cordova-ios 8 (the category cannot import the app's `AppDelegate.h` under SPM, and the plugin does not exist yet when the
  SDK starts on UIScene apps).
- iOS: push deep links are opened on the main queue with `openURL:options:completionHandler:`; the in-app controller uses a UIScene-safe
  window lookup.
- Hooks: the `xml2js` dependency is now `^0.6.2` (was `^0.4.17`, which `npm audit` reports for GHSA-776f-qx25-q3cc). The hooks produce
  byte-identical `config.xml`, `AndroidManifest.xml` and `android.json` output with both versions.
- Logging: always-on output was removed (Gradle `projectDir` lines, the FCM token, Android constructor/initialize lines, `printStackTrace`,
  the JS "Token invalidated!" message, `hooks/clean.js` dumps). Each platform logs one line when the plugin loads; Android diagnostics go
  through the SDK `Logger` (visible when SDK debug logging is on); iOS logs invalid input and caught exceptions with `NSLog`; invalid
  JavaScript calls are logged with `console.error`. The `largeIcon` format hint no longer says `smallIcon`.

### Fixed
- **iOS: the app no longer terminates on wrongly typed arguments.** A `null`, number, boolean, array or object where a string is expected
  raised an uncaught exception that Cordova's command queue does not catch (1.3.2 and earlier). An exception raised inside any action
  (plugin or SDK) is now logged and answered with an error, and a push deep link or in-app payload that is missing or not JSON no longer raises.
- **Android:** `setAttribute` skips one attribute that the SDK cannot apply (for example an unknown `we_gender`, or a non-string
  `we_hashed_email`) instead of failing the whole call; it applies the other attributes and replies success. The SDK decides which attributes
  it accepts.
- **Android:** callbacks that run on SDK threads, and the activity start/stop reporting, no longer terminate the app: a non-boolean
  push/in-app `options` value (`sound`, `vibration`, `shouldRender`) threw `ClassCastException`; a push without call-to-action data threw
  `NullPointerException` on click; an SDK method missing at runtime (`android-sdk` is the dynamic range `5.+`) would have thrown
  `NoSuchMethodError`.
- **iOS: `Info.plist` entries.** The plugin added its background modes (`fetch`, `remote-notification`) with `target="*Info.plist"`.
  Cordova resolves that target differently from `*-Info.plist`: on cordova-ios 7 the modes were written to `CordovaLib/Info.plist`, so they
  never reached the app; on cordova-ios 8 both targets point to the app's `Info.plist`, and Cordova could keep only one set of entries, dropping
  either these modes or the app's own `*-Info.plist` entries from `config.xml` (such as `WEGLicenseCode`). The plugin now uses `*-Info.plist`,
  so the modes are added to the app's `Info.plist` on both versions (cordova-ios 7 apps get them for the first time). Use `*-Info.plist` for
  your own `Info.plist` entries in `config.xml` too.
- **Android:** events are no longer lost after a top-level navigation or reload (the channel used to be registered only in `engage()`).
- **iOS:** in-app callbacks (`onPrepared`, `onShown`, `onClick`, `onDismiss`) are delivered on cordova-ios 8 and other UIScene apps.
- **iOS:** `engage` now replies, so `engage(success, error)` and promise wrappers settle on iOS.
- **iOS:** a push deep link or in-app `actionId` containing a quote (or script text) broke, or could inject into, the JavaScript passed to the
  WebView. The values are now passed as escaped JavaScript string literals.
- **JavaScript:** `console.err` (not a real method) made an invalid `screen()` call throw; a dead duplicate `screen()` was removed; a push
  click that arrived before `push.onClick()` was registered, or an event whose handler is not a function, threw a `TypeError`.
  `push.clickCallback` stays undefined until `push.onClick()` is called, as in 1.3.2, because iOS uses it to decide whether to open the deep
  link itself.
- Android: an unknown exec action no longer leaves its callback pending forever (Cordova now reports `INVALID_ACTION`).
- Android: an in-app click with no action ID delivers the string `"null"`, as in 1.3.2; a null push URI / data keeps the 1.3.2 shape
  (`"null"` / JSON `null`).
- Android: `mergeJson()` could throw a `NullPointerException` on a push with no `we_pushPayload` custom data.
- iOS: `login` / `setSecureToken` read the second argument after checking only for one (out-of-bounds risk); `setLocation` never replied;
  `BOOL`/`nil` mismatch in `setUserOptIn`.

### Capacitor
- The plugin works in Capacitor 6 to 9 apps through Capacitor's Cordova compatibility layer, including the `@awesome-cordova-plugins/webengage`
  wrapper. Capacitor does not read `<engines>` or `cordovaDependencies`: Capacitor 5 and older apps must pin `cordova-plugin-webengage@1.3.2`.
- Capacitor 8 / 9 with SPM use this plugin's `Package.swift`. The comments in that file no longer contain the upstream organisation or the
  Cordova platform repository name, because Capacitor's CLI rewrites only the first occurrence and used to produce a non-existent dependency
  URL. Capacitor 9 with SPM needs `@capacitor/cli` 9.0.0-beta.0 or later; with 9.0.0-alpha.7 add the iOS platform with CocoaPods
  (`npx cap add ios --packagemanager cocoapods`).
- Capacitor does not run Cordova hooks or read `config.xml`: add the WebEngage keys directly to `AndroidManifest.xml` and `Info.plist`.

### Not supported
- iOS `engage(config)` ignores its `config` argument (dynamic configuration is Android-only); this predates 2.0.0.

### Upgrading from 1.3.x
`cordova plugin add` does not update a plugin that is already installed. Remove the WebEngage plugins and add them again, in this order
(skip the plugins your app doesn't use):
```sh
cordova plugin rm we-notificationinbox-cordova
cordova plugin rm we-cordova-android-fcm
cordova plugin rm cordova-plugin-webengage

cordova plugin add cordova-plugin-webengage@2.0.0
cordova plugin add we-cordova-android-fcm@2.0.0
cordova plugin add we-notificationinbox-cordova@2.0.0
```
Then follow [Upgrading to 2.0.0](https://docs.webengage.com/docs/cordova-advanced#upgrading-to-200).
