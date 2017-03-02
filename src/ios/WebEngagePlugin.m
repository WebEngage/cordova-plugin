#import <WebEngage/WebEngage.h>
#import "AppDelegate+WebEngagePlugin.h"


@interface WebEngagePluginUtils : NSObject

+(instancetype) sharedInstance;
@property (atomic, readwrite) BOOL freshLaunch;

@end

@implementation WebEngagePluginUtils

+(instancetype) sharedInstance {
    static WebEngagePluginUtils *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^ {
        sharedInstance = [[self alloc] init];
    });
    return sharedInstance;
}

@end

@implementation AppDelegate (WebEngagePlugin)

+ (void)load {    
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationFinishedLaunching:)
                                                 name:UIApplicationDidFinishLaunchingNotification object:nil];

    /*[[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationBecomesActive:)
                                                 name:UIApplicationDidBecomeActiveNotification object:nil];*/
    
}

+ (void) applicationFinishedLaunching:(NSNotification *) notification {  

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

}

-(void)WEGHandleDeeplink:(NSString*) deeplink userData:(NSDictionary*)pushData {
    
    /*NSDate* date = [[NSDate alloc] init];
    double d = [date timeIntervalSinceReferenceDate];
    NSNumber* refTime = [NSNumber numberWithDouble:d];
    UIWebView* aWebView = [[UIWebView alloc] init];
    CGSize screenSize = [UIScreen mainScreen].bounds.size;
    float width, height;
    width = screenSize.width;
    height = screenSize.height;
    CGRect frame = CGRectMake(0.0, height * 4.0/5.0, width, height/5.0);
    aWebView.frame = frame;
    [aWebView loadHTMLString:[NSString stringWithFormat:@"<h3>Deep Link at %@</h3>", refTime] baseURL:nil];
    UIWindow* window = [UIApplication sharedApplication].keyWindow;
    [window addSubview:aWebView];*/
    
    WebEngagePlugin* webEngagePlugin = [WebEngagePlugin webEngagePlugin];
    
    if (webEngagePlugin && webEngagePlugin.webView) {
        
        /*UIWebView* cWV = [[UIWebView alloc] init];
        CGSize screenSize = [UIScreen mainScreen].bounds.size;
        float width, height;
        width = screenSize.width;
        height = screenSize.height;
        CGRect frame = CGRectMake(0.0, height * 2.0/5.0, width, height/5.0);
        cWV.frame = frame;
        [cWV loadHTMLString:[NSString stringWithFormat:@"<h3>Plugin and webview present %@</h3>", refTime] baseURL:nil];
        UIWindow* window = [UIApplication sharedApplication].keyWindow;
        [window addSubview:cWV];*/
        
        
        AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;
        
        @synchronized (appDelegate) {
            
            WebEngagePluginUtils* webEngagePluginUtils = [WebEngagePluginUtils sharedInstance];
            //Case where push notification is clicked from App background
            if (!webEngagePluginUtils.freshLaunch) {
                
                NSString* res = [(UIWebView*)webEngagePlugin.webView stringByEvaluatingJavaScriptFromString:@"webEngage.push.callbacks.hasOwnProperty('click') && webEngage.push.callbacks.click.length > 0?true: false;"];
        
                //This is invocation from background. Check if the callback is registered.
                if ([res isEqualToString: @"true"]) {
                    
                    //case where app is invoked from background and click callback is registered
                    NSData* data = [NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil];
                    NSString* pushDataJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                    
                    [webEngagePlugin.commandDelegate evalJs:
                     [NSString stringWithFormat:@"webEngage.push.onCallbackReceived( 'click', %@, '%@')",
                      pushDataJSON, deeplink]];
                } else {
                    
                    // Test WebView //
                    /*UIWebView* bWebView = [[UIWebView alloc] init];
                    CGSize screenSize = [UIScreen mainScreen].bounds.size;
                    float width, height;
                    width = screenSize.width;
                    height = screenSize.height;
                    CGRect frame = CGRectMake(0.0, height * 3.0/5.0, width, height/5.0);
                    bWebView.frame = frame;
                    [bWebView loadHTMLString: [NSString stringWithFormat:
                                                @"<h3>%@: handler not present %@</h3>"
                                                , res, refTime]baseURL:nil];
                    UIWindow* window = [UIApplication sharedApplication].keyWindow;
                    [window addSubview:bWebView];*/
                    // Test WebView //
                
                    //Callback is not registered while the app is invoked from background state.
                    NSURL* url = [NSURL URLWithString:deeplink];
                    if (url) {
                        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                            [[UIApplication sharedApplication] openURL:url];
                        });
                    }

                }

            
            } else {
                
                webEngagePlugin.pendingDeepLinkCallback = [@{@"deepLink": deeplink,
                                                             @"info": pushData} mutableCopy];
            }
        }
    } /*else {
        
        // Test WebView //
        UIWebView* bWebView = [[UIWebView alloc] init];
        CGSize screenSize = [UIScreen mainScreen].bounds.size;
        
        float width, height;
        width = screenSize.width;
        height = screenSize.height;
        
        CGRect frame = CGRectMake(0.0, height * 2.0/5.0, width, height/5.0);
        
        bWebView.frame = frame;
        
        NSString* entity = webEngagePlugin?@"webview":@"webEngagePlugin";
        
        [aWebView loadHTMLString:[NSString stringWithFormat:@"<h3>%@ not registered %@</h3>", entity, refTime] baseURL:nil];
        
        UIWindow* window = [UIApplication sharedApplication].keyWindow;
        [window addSubview:bWebView];
        // Test WebView //

    
    }*/
}

-(BOOL) isFreshLaunch {
    return [WebEngagePluginUtils sharedInstance].freshLaunch;
}
-(void) setFreshLaunch:(BOOL) freshLaunch {
    [WebEngagePluginUtils sharedInstance].freshLaunch = freshLaunch;
}

@end
