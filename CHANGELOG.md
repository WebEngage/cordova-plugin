# Changelog

## 2.0.0

### Breaking changes (read before upgrading from 1.3.x)
- **Host floor raised** from cordova-android >= 4.1 / cordova-ios >= 4 to **cordova-android >= 12.0.0 / cordova-ios >= 7.0.0**
  (`plugin.xml` `<engines>`, `package.json` `engines.cordovaDependencies["2.0.0"]`). Apps on older hosts stay on 1.3.2
  (pin it exactly; a `^1.3.2` range keeps resolving to 1.x only). Released as 2.0.0 so that `^1.x` ranges never pick this up silently.
  One verified technical reason: `android-sdk` 5.2.0 pulls `com.webengage:we-inspector`, which needs AndroidX libraries that require `compileSdk` 33 or higher. cordova-android 11 and older compile at 32 or lower, so the build fails in `checkDebugAarMetadata` (reproduced on cordova-android 11.0.0; 1.3.2 builds there). cordova-android 12.0.1 builds.
- **cordova-ios 8 now installs this plugin through Swift Package Manager** (`<platform name="ios" package="swift">` + `Package.swift`),
  not CocoaPods. The CocoaPods pod is kept for cordova-ios 7 and for hosts that use pods (`nospm="true"`). If your app also uses
  `we-notificationinbox-cordova`, upgrade it to the matching release at the same time; an old inbox release still pulls the WebEngage pod
  and can put a second copy of the SDK in the app.
- **Android native SDK moved from `com.webengage:android-sdk:4.+` to `5.+`.** The range is dynamic by design (it always resolves to the
  newest 5.x). Every SDK call the plugin makes was checked against 4.20.0 and 5.2.0 (the plugin compiles against both). SDK 5.x adds a
  transitive runtime dependency `com.webengage:we-inspector`; make sure your Maven mirror/allow-list can resolve it.
- **In-app `dismiss` no longer also fires the `prepared` callback.** A missing `break` made every dismissal re-fire `onPrepared`; an app that
  relied on that now only gets `onDismiss`.
- **Plugin methods accept optional trailing success/error callbacks.** A function passed as the last argument to a plugin method is now treated
  as a callback (this is how promise wrappers such as `@awesome-cordova-plugins` settle). Calls that never passed one are unaffected.
- **iOS:** the internal `AppDelegate (WebEngagePlugin)` category files were replaced by a plain `WEGAppDelegateHelper` class (see Changed).
  After upgrading in place, confirm no `AppDelegate+WebEngagePlugin.*` files remain in the iOS project.

### Added
- iOS: SPM support via a dual manifest (`Package.swift` + CocoaPods `nospm` fallback). The manifest links the Core **and Location** products
  (`WebEngageCore`, `WebEngageLocation`), so an app that moves from CocoaPods to SPM keeps automatic location tracking and geofencing.
- Android/iOS/www: every plugin action now resolves its JS callback (`callbackContext.success()`/`.error()` natively, `exec()` success/error
  wired in JS), so promise-wrapper libraries such as `@awesome-cordova-plugins` settle. This includes iOS `engage`, which sent no reply before.
- `plugin.xml` `<engines>` and `package.json` `engines.cordovaDependencies` declare the real host floor (cordova-android >=12.0.0,
  cordova-ios >=7.0.0), so old Cordova CLIs that do not pin a version select an older compatible release.
- `scripts/check-version.js` keeps package.json / plugin.xml / version.properties / `WEGPluginVersion` in sync (`npm run check-version`, `prepublishOnly`).
- `package.json` `files` allowlist pins the published tarball to the plugin's shipping files, so build artifacts (`.build/`, `.swiftpm/`,
  `Package.resolved`) can never leak into a release.
- iOS: no-op handlers for the Android-only actions (`pushOptions`, `inappOptions`, `globalOptions`, `setDevicePushOptIn`, `sendFcmToken`,
  `onMessageReceived`), so calling them on iOS resolves instead of hanging.
- README: Capacitor section, supported-versions table, and a note that `engage()` is called once at app launch.

### Changed
- Android: `com.webengage:android-sdk` `4.+` → `5.+` (dynamic by design, see Breaking changes).
- iOS: the WebEngage pod floor is now `>= 6.16.6` (was unpinned) and the SPM package floor is `from 2.0.0` (SDK core 7.x). This follows the
  react-native-webengage plugin. Apps locked on SDK 6.x keep their lock; new installs get the latest. There is no upper cap.
- Android: push/in-app/JWT events are delivered via `PluginResult` + `keepCallback(true)` instead of the deprecated `webView.sendJavascript()`.
  No change to the public JS callback API. The channel is opened by the plugin's own JS on **every page load** (not from `engage()`), because
  `engage()` runs once per app launch while Cordova drops the channel on every top-level navigation or reload.
- iOS: `AppDelegate` category replaced by a plain `WEGAppDelegateHelper` class, required for cordova-ios 8 SPM builds (the category's header cannot
  see the app's `AppDelegate.h` under SPM) and to drop the old code that operated on a fake, never-initialized `AppDelegate` instance.
- iOS: push-click URL opening runs on the main queue via `openURL:options:completionHandler:` (was a background queue with the deprecated call).
- iOS: in-app-controller presentation uses a UIScene-safe window lookup (falls back to the pre-UIScene lookup on iOS 11/12 / cordova-ios 7).
- `Package.swift` comments no longer contain the upstream organisation or Cordova platform repository names (see Fixed).
- Logging: removed output that was always on or noisy: the plugin Gradle script no longer prints `projectDir` on every build, the FCM token is no longer logged by `sendFcmToken`, the Android constructor/initialize/static-block messages and `printStackTrace` calls are gone, the JS "Token invalidated!" message is gone, and `hooks/clean.js` no longer dumps `android.json` to the console. Remaining plugin diagnostics go through the SDK `Logger` and show only when SDK debug logging is enabled (see `DEVELOPER_NOTES.md`). The `largeIcon` format hint no longer says `smallIcon`.
- Packaging: the dev-only `scripts/check-version.js` is no longer shipped in the npm tarball (it still runs on `prepublishOnly`); dead commented-out code was removed.

### Fixed
- **iOS: the app no longer terminates on wrongly typed arguments.** A `null`, number, boolean, array or object where a string is expected
  (`track(null)`, `screen(5)`, `login(5)`, `setSecureToken(null, null)`, `setUserOptIn(null, true)`) raised an uncaught exception, and Cordova's
  command queue does not catch it. This also affected 1.3.2 and earlier. Those calls now reply with an error and change nothing; every call that
  worked before behaves exactly as before. Two cases changed beyond "crash becomes error": `login(id, <non-string token>)` logs in without a token,
  as `login(id, null)` always did, and a `we_*` string attribute (`we_first_name`, `we_email`, `we_phone`, ...) set to a non-string value is
  ignored (the SDK threw on its own queue and terminated the app). `setUserOptIn(channel, null)` replies with an error instead of opting out.
- **iOS:** an exception raised inside any action (plugin or SDK) is logged and answered with an error instead of terminating the app; a push
  deep link or in-app payload that is missing or not JSON no longer raises.
- **Android:** callbacks that run on SDK threads no longer terminate the app: a non-boolean `webengage.push.options` / `webengage.notification.options` value
  (`sound`, `vibration`, `shouldRender`) threw `ClassCastException` when a push or in-app arrived; a push without call-to-action data threw
  `NullPointerException` on click; the event channel could be cleared between its null check and its use. Activity start/stop reporting is also guarded.
- **Capacitor 8 / 9 SPM:** Capacitor's CLI rewrites a plugin's `Package.swift` with a string replace that only changes the *first* occurrence of the
  upstream organisation name. A comment containing it was matched instead of the dependency URL, producing a non-existent repository URL
  (`apache/capacitor-swift-pm.git` on Capacitor 8, `apache/capacitor.git` on Capacitor 9). The comments were removed.
- **Android events lost after navigation:** the event channel was registered only inside `engage()`, so after a top-level navigation or reload
  events were dropped until `engage()` was called again (it is only called once per launch). The channel is now opened on every page load.
- **iOS `engage` never replied**, so `engage(success, error)` and promise wrappers never settled on iOS.
- **iOS:** a push deep link or in-app `actionId` containing a quote (or script text) broke, or could inject into, the JavaScript passed to the
  WebView. The values are now passed as escaped JavaScript string literals (Android already used structured data).
- Android: an unknown exec action no longer leaves its callback pending forever (the plugin now returns `false`, so Cordova reports `INVALID_ACTION`).
- Android: an in-app click with no action id delivers the string `"null"` again, as in 1.3.2.
- Android, Gradle 9 (Capacitor 9 / cordova-android >= 15): removed `jcenter()` / `buildscript` / `allprojects` from the plugin's gradle file.
- Android: removed redundant `compileSdkVersion` / `minSdkVersion` / `targetSdkVersion` overrides that could silently override the host module's values.
- Android: `mergeJson()` could throw an uncaught `NullPointerException` on a push with no `we_pushPayload` custom data.
- Android: a push URI or in-app `actionId` containing a single quote could corrupt the generated JavaScript (events are delivered as structured data).
- Android: `onReset()` clears the native event channel when the WebView reloads; null push `uri` / `data` keep the 1.3.2 shape (`"null"` / JSON `null`).
- iOS: `login` / `setSecureToken` read `objectAtIndex:1` after checking `count>0` (out-of-bounds risk for a 1-argument call); `setLocation` never replied;
  `BOOL`/`nil` mismatch in `setUserOptIn`.
- www: `console.err` (not a real method), a dead duplicate `screen()`, and a push click arriving before `push.onClick()` was registered throwing a
  TypeError. `push.clickCallback` stays undefined by default, as in 1.3.2, because iOS native uses it to decide whether to open the deep link itself.
- README: documented the cordova-ios 7.x `SwiftVersion` workaround.

### Docs
- README: removed the GCM integration and GCM-to-FCM migration sections (GCM was shut down in 2019).

### Documented, not implemented
- iOS `engage(config)` ignores its `config` argument (dynamic configuration is Android-only); this predates 2.0.0.
- A Core-only iOS variant without the Location module (RN uses `WEBENGAGE_USE_CORE`) is not offered; `plugin.xml` cannot read environment variables.

### Unverified / needs device or simulator testing
- Real `cap sync` + `xcodebuild` on Capacitor 8 and 9 SPM apps with this `Package.swift` (the CLI rewrite itself was verified against the installed
  CLI sources of 8.5.2 and 9.0.0-alpha.7; other 8.x versions were not checked).
- Android events after a page navigation, and a cold-start push click, on a real device (Cordova and Capacitor).
- Upgrade in place from 1.3.2 (stale iOS files, `Podfile.lock`), and the mixed-version case (new core with old inbox) for duplicate SDK copies.
- Runtime behavior on a UIScene + SPM host: SDK init path, in-app presentation, push click, location on SPM.

### Manual test checklist — `AppDelegate` category → `WEGAppDelegateHelper` (I2)
Covers the risk that a plugin update leaves stale generated files behind, and that
`WEGAppDelegateHelper`'s behavior (push-click routing, in-app presentation) matches the old
category on a real device/simulator, for both install paths:

**Plain Cordova app (no Capacitor)**
- [ ] Fresh install (`cordova platform add ios` on 1.4.0 from clean): confirm
      `platforms/ios/<App>/Plugins/cordova-plugin-webengage/` contains `WEGAppDelegateHelper.h/.m`
      and does **not** contain `AppDelegate+WebEngagePlugin.h/.m`.
- [ ] Upgrade path: start from an app already on the old plugin version (old category files
      present under `platforms/ios/.../Plugins/...`), then `cordova plugin rm
      cordova-plugin-webengage && cordova plugin add cordova-plugin-webengage`. Confirm the old
      `AppDelegate+WebEngagePlugin.h/.m` are actually removed from the generated Xcode project,
      not just left alongside the new files (Cordova's plugin-file removal on update has
      historically been unreliable).
- [ ] Push tapped from killed state (cold start): click callback fires with correct `uri`/data.
- [ ] Push tapped from background: same.
- [ ] Push arrives and is tapped while app is foregrounded: same.
- [ ] `presentInAppController` (iOS in-app message) re-parents the webview correctly.
- [ ] Build succeeds via CocoaPods (`pod install`, cordova-ios 7.x or `nospm` path on 8.x).
- [ ] Build succeeds via SPM (cordova-ios >= 8.0.0, `Package.swift` path) — this is the
      scenario the category could never build under.

**Capacitor app**
- [ ] Fresh `npx cap add ios` on an app already depending on plugin 1.4.0: same file-presence
      check as above, inside the Capacitor-generated iOS project.
- [ ] Upgrade path: app previously synced with the old plugin version, then bump the npm
      dependency and run `npx cap sync ios` (or `npx cap update ios`). Confirm old category files
      are gone from the Capacitor iOS project, not just the new ones added.
- [ ] Repeat the three push-tap scenarios (killed / background / foreground) and
      `presentInAppController` above, once with `npx cap add ios --packagemanager cocoapods` and
      once with the SPM package manager (`@capacitor/cli` >= 8.3.2 for the SPM path to actually
      pick up this plugin's own `Package.swift`, per the (I1) gap above).
- [ ] `presentInAppController` specifically on a UIScene-lifecycle host (Capacitor 8.5+): confirms
      `wegKeyWindow` finds the right window instead of the removed `.keyWindow`/
      `.windows.firstObject` lookup — this is a real behavior change on top of the class rewrite,
      not just a refactor, and is the one most likely to regress silently.
