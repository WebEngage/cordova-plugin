#import "AppDelegate+WebEngagePlugin.h"
@interface WebEngagePluginUtils : NSObject

+ (instancetype)sharedInstance;
@property (atomic, readwrite) BOOL freshLaunch;

@end

@implementation WebEngagePluginUtils

+ (instancetype)sharedInstance {
    static WebEngagePluginUtils *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^ {
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

@end

@implementation AppDelegate (WebEngagePlugin)

+ (instancetype)sharedInstance {
    static AppDelegate *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^ {
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

+ (void)load {
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationFinishedLaunching:)
                                                 name:UIApplicationDidFinishLaunchingNotification object:nil];
}

+ (void)applicationFinishedLaunching:(NSNotification *)notification {
    AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;
    @synchronized (appDelegate) {
        [WebEngagePluginUtils sharedInstance].freshLaunch = YES;
    }

    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];

    id apnsRegistration = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"WEGApnsAutoRegister"];

    BOOL autoRegister = YES;
    if (apnsRegistration != nil) {
        autoRegister = [apnsRegistration boolValue];
    }
    [[WebEngage sharedInstance] application:notification.object
              didFinishLaunchingWithOptions:notification.userInfo
                       notificationDelegate:webEngagePlugin
                               autoRegister:autoRegister];

    [[WebEngage sharedInstance] setPushNotificationDelegate:[AppDelegate sharedInstance]];
}


- (void)WEGHandleDeeplink:(NSString *)deeplink userData:(NSDictionary *)pushData {
    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];
    if (webEngagePlugin && webEngagePlugin.webView) {

        AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;

        @synchronized (appDelegate) {

            WebEngagePluginUtils* webEngagePluginUtils = [WebEngagePluginUtils sharedInstance];

                //Case where push notification is clicked from App background
                if (!webEngagePluginUtils.freshLaunch) {
                    [WebEngagePlugin evaluateJavaScript:@"webengage.push.clickCallback !== undefined && webengage.push.clickCallback != null?true: false;" onWebView:webEngagePlugin.webView completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {

                        //This is invocation from background. Check if the callback is registered.
                        if ([response isEqualToString: @"1"]) {

                            //case where app is invoked from background and click callback is registered
                            NSData* data = [NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil];
                            NSString* pushDataJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

                            [webEngagePlugin.commandDelegate evalJs:
                             [NSString stringWithFormat:@"webengage.push.onCallbackReceived('click', '%@', %@)",
                               deeplink, pushDataJSON]];
                        } else {
                            NSURL* url = [NSURL URLWithString:deeplink];
                            if (url) {
                                [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
                            }
                        }
                    }];
                } else {
                    webEngagePlugin.pendingDeepLinkCallback = [@{@"deepLink": deeplink,
                                                                 @"info": pushData} mutableCopy];
                }

        }
    }
}

- (BOOL)isFreshLaunch {
    return [WebEngagePluginUtils sharedInstance].freshLaunch;
}

- (void)setFreshLaunch:(BOOL)freshLaunch {
    [WebEngagePluginUtils sharedInstance].freshLaunch = freshLaunch;
}



- (void)presentInAppController {
    
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        UIWindow *window = [UIApplication sharedApplication].windows.firstObject;

        if (window) {
            WKWebView *lastSubview = (WKWebView *)window.subviews.lastObject;
            UIViewController *topViewController = [self topViewController];
            
            if ([lastSubview isKindOfClass:[WKWebView class]] && topViewController) {
                [topViewController.view addSubview:lastSubview];
                [topViewController.view bringSubviewToFront:lastSubview];
            }
        }
    });

}

- (UIViewController *)topViewController {
    UIViewController *rootViewController = [UIApplication sharedApplication].keyWindow.rootViewController;
    
    while (rootViewController.presentedViewController) {
        rootViewController = rootViewController.presentedViewController;
    }
    
    return rootViewController;
}



@end
