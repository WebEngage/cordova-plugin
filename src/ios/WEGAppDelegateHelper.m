#import "WEGAppDelegateHelper.h"
#import "WebEngagePlugin.h"
#import "WEGJSString.h"
#import "WEGConstants.h"
#import <WebKit/WebKit.h>

@implementation WEGAppDelegateHelper

+ (instancetype)sharedInstance {
    static WEGAppDelegateHelper *sharedInstance = nil;
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
    WEGAppDelegateHelper *helper = [WEGAppDelegateHelper sharedInstance];
    @synchronized (helper) {
        helper.freshLaunch = YES;
    }

    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];

    id apnsRegistration = [[NSBundle mainBundle] objectForInfoDictionaryKey:WEG_INFO_PLIST_APNS_AUTO_REGISTER];

    BOOL autoRegister = YES;
    if ([apnsRegistration respondsToSelector:@selector(boolValue)]) {
        autoRegister = [apnsRegistration boolValue];
    }
    [[WebEngage sharedInstance] application:notification.object
              didFinishLaunchingWithOptions:notification.userInfo
                       notificationDelegate:webEngagePlugin
                               autoRegister:autoRegister];

    [[WebEngage sharedInstance] setPushNotificationDelegate:helper];
}

- (void)WEGHandleDeeplink:(NSString *)deeplink userData:(NSDictionary *)pushData {
    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];
    if (webEngagePlugin && webEngagePlugin.webView) {

        @synchronized (self) {

            //Case where push notification is clicked from App background
            if (!self.freshLaunch) {
                [WebEngagePlugin evaluateJavaScript:WEG_JS_PUSH_CLICK_CALLBACK_REGISTERED onWebView:webEngagePlugin.webView completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {

                    //This is invocation from background. Check if the callback is registered.
                    if ([response isEqualToString: @"1"]) {

                        //case where app is invoked from background and click callback is registered
                        NSString* pushDataJSON = [NSJSONSerialization isValidJSONObject:pushData] ? [[NSString alloc] initWithData:[NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil] encoding:NSUTF8StringEncoding] : nil;

                        [webEngagePlugin.commandDelegate evalJs:
                         [NSString stringWithFormat:WEG_JS_PUSH_CLICK_FORMAT,
                           WEGJSStringLiteral(deeplink), pushDataJSON ?: @"null"]];
                    } else {
                        NSURL* url = [NSURL URLWithString:deeplink];
                        if (url) {
                            dispatch_async(dispatch_get_main_queue(), ^{
                                [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
                            });
                        }
                    }
                }];
            } else {
                // a nil deep link or payload cannot be stored in a dictionary literal (it raises)
                NSMutableDictionary *pending = [NSMutableDictionary dictionary];
                if (deeplink) {
                    pending[WEG_KEY_DEEP_LINK] = deeplink;
                }
                if (pushData) {
                    pending[WEG_KEY_PUSH_INFO] = pushData;
                }
                webEngagePlugin.pendingDeepLinkCallback = pending;
            }

        }
    }
}

- (void)presentInAppController {

    dispatch_async(dispatch_get_main_queue(), ^{
        UIWindow *window = [WEGAppDelegateHelper wegKeyWindow];

        if (window) {
            WKWebView *lastSubview = (WKWebView *)window.subviews.lastObject;
            UIViewController *topViewController = [WEGAppDelegateHelper topViewController];

            if ([lastSubview isKindOfClass:[WKWebView class]] && topViewController) {
                [topViewController.view addSubview:lastSubview];
                [topViewController.view bringSubviewToFront:lastSubview];
            }
        }
    });

}

// UIScene-safe window lookup; falls back to the pre-UIScene lookup on iOS 11/12 (cordova-ios 7).
+ (nullable UIWindow *)wegKeyWindow {
    if (@available(iOS 13.0, *)) {
        for (UIScene *scene in [UIApplication sharedApplication].connectedScenes) {
            if ([scene isKindOfClass:[UIWindowScene class]] && scene.activationState == UISceneActivationStateForegroundActive) {
                for (UIWindow *window in ((UIWindowScene *)scene).windows) {
                    if (window.isKeyWindow) {
                        return window;
                    }
                }
            }
        }
        // No foreground-active scene yet (e.g. very early launch): fall back to any window.
        for (UIScene *scene in [UIApplication sharedApplication].connectedScenes) {
            if ([scene isKindOfClass:[UIWindowScene class]] && ((UIWindowScene *)scene).windows.count > 0) {
                return ((UIWindowScene *)scene).windows.firstObject;
            }
        }
    }
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    return [UIApplication sharedApplication].windows.firstObject;
#pragma clang diagnostic pop
}

+ (nullable UIViewController *)topViewController {
    UIViewController *rootViewController = [WEGAppDelegateHelper wegKeyWindow].rootViewController;

    while (rootViewController.presentedViewController) {
        rootViewController = rootViewController.presentedViewController;
    }

    return rootViewController;
}

@end
