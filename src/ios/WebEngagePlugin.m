/********* WebEngagePlugin.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import <WebEngage/WebEngage.h>
#import "WebEngagePlugin.h"

@implementation WebEngagePlugin

static WebEngagePlugin *webEngagePlugin;

+ (WebEngagePlugin*) webEngagePlugin {
    return webEngagePlugin;
}

- (void)pluginInitialize {

    [super pluginInitialize];
    webEngagePlugin = self;
    
    self.pendingDeepLinkCallback = nil;
}

-(void)handlePushNotificationPendingDeepLinks {
    
    /*NSDate* date = [[NSDate alloc] init];
    double d = [date timeIntervalSinceReferenceDate];
    NSNumber* refTime = [NSNumber numberWithDouble:d];
    UIWebView* aWebView = [[UIWebView alloc] init];
    CGSize screenSize = [UIScreen mainScreen].bounds.size;
    float width, height;
    width = screenSize.width;
    height = screenSize.height;
    CGRect frame = CGRectMake(0.0, 0.0, width, height/5.0);
    aWebView.frame = frame;
    NSString* htmlString = [NSString stringWithFormat:@"<h3>pendingDeepLink at engage:%@</h3>", self.pendingDeepLinkCallback? [self.pendingDeepLinkCallback description]: @"nil"];*/
    
    AppDelegate* appDelegate = [UIApplication sharedApplication].delegate;
    
    @synchronized (appDelegate) {
        
        if(self.pendingDeepLinkCallback && self.pendingDeepLinkCallback[@"deepLink"]) {
            
            //htmlString = @"Pending deep link present in engage";
            
            NSString* deeplink = self.pendingDeepLinkCallback[@"deepLink"];
            NSDictionary* pushData = self.pendingDeepLinkCallback[@"info"];
            
            BOOL shouldFireDeepLink = YES;
            
            if (webEngagePlugin && webEngagePlugin.webView) {
                
                
                NSString* res = [(UIWebView*)webEngagePlugin.webView stringByEvaluatingJavaScriptFromString:@"webEngage.push.callbacks.hasOwnProperty('click') && webEngage.push.callbacks.click.length > 0?true: false;"];
                
                if ([res isEqualToString: @"true"]) {
                    //If callback is registered fire the callback.
                    
                    shouldFireDeepLink = NO;
                    
                    NSData* data = [NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil];
                    NSString* pushDataJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                    
                    NSString* string = [NSString stringWithFormat:@"webEngage.push.onCallbackReceived( 'click', %@, '%@')", pushData? pushDataJSON: @"null", deeplink];
                    
                    //htmlString = [NSString stringWithFormat:@"callback in engage: %@", string];
                    
                    [self.commandDelegate evalJs:string];
                    
                } else {
                    
                    //htmlString = @"firing deep link in engage";
                    NSURL* url = [NSURL URLWithString:deeplink];
                    if (url) {
                        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                            [[UIApplication sharedApplication] openURL:url];
                        });
                    }
                    
                }
            }
            
            self.pendingDeepLinkCallback = nil;
            
        }
        
        if ([appDelegate isFreshLaunch]) {
            [appDelegate setFreshLaunch:NO];
        }

    }
    
    /*[aWebView loadHTMLString:[NSString stringWithFormat:@"%@ at %@", htmlString , [[NSDate date] description]] baseURL:nil];
    UIWindow* window = [UIApplication sharedApplication].keyWindow;
    [window addSubview:aWebView];*/
    
}

-(void) engage:(CDVInvokedUrlCommand*)command {
    [self handlePushNotificationPendingDeepLinks];
}


-(void) pushReceived:(CDVInvokedUrlCommand*)command {
    
    NSDate* date = [[NSDate alloc] init];
    
    double d = [date timeIntervalSinceReferenceDate];
    
    NSNumber* refTime = [NSNumber numberWithDouble:d];
    
    UIWebView* aWebView = [[UIWebView alloc] init];
    CGSize screenSize = [UIScreen mainScreen].bounds.size;
    
    float width, height;
    width = screenSize.width;
    height = screenSize.height;
    
    CGRect frame = CGRectMake(0.0, height/5.0, width, height/5.0);
    
    aWebView.frame = frame;
    
    [aWebView loadHTMLString:[NSString stringWithFormat:@"<h3>Push Received at %@</h3>", refTime] baseURL:nil];
    
    UIWindow* window = [UIApplication sharedApplication].keyWindow;
    [window addSubview:aWebView];
    
}

/*- (void)login:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* userId = [command.arguments objectAtIndex:0];

    if (userId != nil && [userId length] > 0) {

      [[WebEngage sharedInstance].user loggedIn: userId];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}*/

-(NSMutableDictionary *)notificationPrepared:(NSMutableDictionary *)inAppNotificationData 
                                  shouldStop:(BOOL *)stopRendering {
    
    NSData* data = [NSJSONSerialization dataWithJSONObject:inAppNotificationData options:0 error:nil];
    NSString* inAppJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    
    NSString* resultData = [(UIWebView*)self.webView stringByEvaluatingJavaScriptFromString:
                                [NSString stringWithFormat:
                                    @"JSON.stringify(webEngage.inapp.onCallbackReceived( 'prepared', %@))", 
                                        inAppJSON]];
    NSMutableDictionary* modifiedData = nil;
    if (resultData) {
        
        NSData* data = [resultData dataUsingEncoding:NSUTF8StringEncoding];
        if (data) {
            
            NSMutableDictionary* modifiedData = 
                [NSJSONSerialization JSONObjectWithData:data 
                                                options:NSJSONReadingMutableContainers 
                                                  error:nil];
            
            if ([modifiedData[@"stopRendering"] boolValue]) {
                *stopRendering = YES;
            }
            
        }
        
    }
    
    if (!modifiedData) {
        modifiedData = inAppNotificationData;
    }
    return modifiedData;
}

-(void)notificationShown:(NSMutableDictionary *)inAppNotificationData {
    
    NSString* inAppJson = [inAppNotificationData description];
    
    [self.commandDelegate evalJs:
        [NSString stringWithFormat:
            @"webEngage.inapp.onCallbackReceived( 'shown', %@)", inAppJson]];

}

-(void)notificationDismissed:(NSMutableDictionary *)inAppNotificationData {
    
    NSString* inAppJson = [inAppNotificationData description];
    
    [self.commandDelegate evalJs:
        [NSString stringWithFormat:
            @"webEngage.inapp.onCallbackReceived( 'dismiss', %@)", inAppJson]];

}

-(void)notification:(NSMutableDictionary *)inAppNotificationData 
                            clickedWithAction:(NSString *)actionId {
    
    NSString* inAppJson = [inAppNotificationData description];
    
    [self.commandDelegate evalJs:
        [NSString stringWithFormat:
            @"webEngage.inapp.onCallbackReceived( 'click', %@, '%@')", 
                inAppJson, actionId]];

}

@end
