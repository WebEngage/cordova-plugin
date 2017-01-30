#import <WebEngage/WebEngage.h>
#import "AppDelegate+WebEngagePlugin.h"


@implementation AppDelegate (WebEngagePlugin)

+ (void)load {    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationFinishedLaunching:)
                                                 name:UIApplicationDidFinishLaunchingNotification object:nil];

    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationBecomesActive:)
                                                 name:UIApplicationDidBecomeActiveNotification object:nil];
    
}

+ (void) applicationFinishedLaunching:(NSNotification *) notification {    
    [[WebEngage sharedInstance] application:notification.object 
                                didFinishLaunchingWithOptions:notification.userInfo];
}

+ (void) applicationBecomesActive: (NSNotification*) notification {
	[[WebEngagePlugin webEngagePlugin] applicationActive:notification.object];
}

@end