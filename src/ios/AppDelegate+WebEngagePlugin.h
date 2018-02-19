#import "AppDelegate.h"
#import "WebEngagePlugin.h"
#import <WebKit/WebKit.h>

@interface AppDelegate (WebEngagePlugin)

-(BOOL) isFreshLaunch;
-(void) setFreshLaunch:(BOOL) freshLaunch;

@end
