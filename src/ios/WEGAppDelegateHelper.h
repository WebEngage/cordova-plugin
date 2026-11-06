#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebEngage/WebEngage.h>

NS_ASSUME_NONNULL_BEGIN

// Plain helper instead of an AppDelegate category: under cordova-ios 8 SPM this target cannot import the app's
// AppDelegate.h. Starts the SDK on launch and routes push deep links.
// Conforms to WEGInAppNotificationProtocol so it can be the SDK's in-app delegate at launch, before the plugin
// exists. On UIScene hosts (cordova-ios 8 / Capacitor 8+) the plugin is created after
// UIApplicationDidFinishLaunchingNotification, so passing it as the delegate at launch gives nil to the SDK.
@interface WEGAppDelegateHelper : NSObject <WEGAppDelegate, WEGInAppNotificationProtocol>

+ (instancetype)sharedInstance;
@property (atomic, readwrite) BOOL freshLaunch;

- (void)presentInAppController;

@end

NS_ASSUME_NONNULL_END
