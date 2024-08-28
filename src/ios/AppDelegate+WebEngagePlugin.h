#import "AppDelegate.h"
#import "WebEngagePlugin.h"
#import <WebEngage/WebEngage.h>

@interface AppDelegate (WebEngagePlugin)<WEGAppDelegate>
+ (instancetype)sharedInstance;
- (BOOL)isFreshLaunch;
- (void)setFreshLaunch:(BOOL)freshLaunch;
- (void)presentInAppController;
@end
