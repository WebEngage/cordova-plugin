# iOS Rich Push for Cordova apps (images, carousels, rating notifications)

Rich push on iOS needs two extra Xcode targets in your app: a Notification Service Extension and a Notification Content Extension.
Xcode targets cannot be created by a Cordova plugin, so this setup is done by hand in Xcode. This folder contains the source file for each
extension, so you don't have to type it.

Follow [iOS Push Messaging → Rich Push Notifications](https://docs.webengage.com/docs/ios-push-messaging#6-rich-push-notifications) for the
full steps and screenshots. The Cordova-specific points are below.

## 1. Open the Cordova Xcode workspace

- `cordova-ios` 8: `platforms/ios/App.xcworkspace`
- `cordova-ios` 7: `platforms/ios/<YourAppName>.xcworkspace`

## 2. Create the two extension targets

In Xcode: **File → New → Target**

- **Notification Service Extension**, named `NotificationService`
- **Notification Content Extension**, named `NotificationContent`

## 3. Replace the generated source

- Copy [`NotificationService.swift`](./NotificationService.swift) into the `NotificationService` target, replacing the file Xcode generated.
- Copy [`NotificationViewController.swift`](./NotificationViewController.swift) into the `NotificationContent` target, replacing the file
  Xcode generated. Leave `MainInterface.storyboard` as Xcode generated it.

## 4. Add the WebEngage extension libraries to the extension targets

Add `WEServiceExtension` to the `NotificationService` target and `WEContentExtension` to the `NotificationContent` target, with Swift
Package Manager (**File → Add Package Dependencies**) as described in the iOS guide. Add them to the extension targets only, not to the app
target: the plugin already adds the WebEngage SDK to the app.

## 5. Finish the setup from the iOS guide

Configure each extension's `Info.plist` (including the rich push categories for the Content Extension) and add the same App Group,
`group.<your-bundle-id>.WEGNotificationGroup`, to the app target and both extension targets.

Then build, and send an image or carousel push from the WebEngage dashboard to test it. A text-only push working does not show that rich
push works.

> **Note:** Cordova recreates `platforms/ios` when you run `cordova platform rm ios` and `cordova platform add ios`. The extension targets and
> their settings are lost then; repeat this setup afterwards.
