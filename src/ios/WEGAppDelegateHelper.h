#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebEngage/WebEngage.h>

NS_ASSUME_NONNULL_BEGIN

// Plain helper instead of an AppDelegate category: under cordova-ios 8 SPM this target cannot import the app's
// AppDelegate.h. Starts the SDK on launch and routes push deep links.
@interface WEGAppDelegateHelper : NSObject <WEGAppDelegate>

+ (instancetype)sharedInstance;
@property (atomic, readwrite) BOOL freshLaunch;

- (void)presentInAppController;

@end

NS_ASSUME_NONNULL_END
