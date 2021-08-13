#import "AppDelegate.h"
#import "WebEngagePlugin.h"

@interface AppDelegate (WebEngagePlugin)<WEGAppDelegate>
+ (instancetype)sharedInstance;
- (BOOL)isFreshLaunch;
- (void)setFreshLaunch:(BOOL)freshLaunch;

@end
