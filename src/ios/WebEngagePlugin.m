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
            
            if (webEngagePlugin && webEngagePlugin.webView) {
                
                
                NSString* res = [(UIWebView*)webEngagePlugin.webView stringByEvaluatingJavaScriptFromString:@"webEngage.push.callbacks.hasOwnProperty('click') && webEngage.push.callbacks.click.length > 0?true: false;"];
                
                if ([res isEqualToString: @"true"]) {
                    //If callback is registered fire the callback.
                    
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

-(id) modifyObject: (id) obj modification: (id (^)(id val))modificationHandler {
    
    if ([obj isKindOfClass:[NSDictionary class]]) {
        
        NSMutableDictionary* resultDictionary = [obj mutableCopy];
        [obj enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL* stop) {
            
            resultDictionary[key] = [self modifyObject:obj modification:modificationHandler];
        }];
        
        return resultDictionary;
        
    } else if([obj isKindOfClass:[NSArray class]]) {
        
        NSMutableArray* resultArray = [obj mutableCopy];
        [obj enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL* stop) {
            resultArray[idx] = [self modifyObject:obj modification:modificationHandler];
        }];
        
        return resultArray;
    }
    
    return modificationHandler(obj);
}

-(NSDictionary*) convertISODateStringValuesToNSDate: (NSDictionary*) dictionary {
    
    return [self modifyObject:dictionary modification:^id(id obj) {
        
        if (obj && [obj isKindOfClass:[NSString class]]) {
            
            NSDateFormatter* formatter = [[NSDateFormatter alloc] init];
            [formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
            [formatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"UTC"]];
            
            NSDate* date = [formatter dateFromString:obj];
            
            if (date) {
                return date;
            } else {
                return obj;
            }
        }
        
        return obj;
    }];
}

-(void) engage:(CDVInvokedUrlCommand*)command {
    
    [self handlePushNotificationPendingDeepLinks];
}

-(void) track:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* eventName = command.arguments && command.arguments.count>0?[command.arguments objectAtIndex:0]: nil;
    
    if (eventName != nil && eventName.length > 0) {
        
        id eventData = command.arguments && command.arguments.count>1?[command.arguments objectAtIndex:1]: nil;
        
        if (eventData && [eventData isKindOfClass:[NSDictionary class]]) {
            
            [[WebEngage sharedInstance].analytics
                trackEventWithName:eventName
                          andValue:[self convertISODateStringValuesToNSDate:eventData]];
        } else {
            
            [[WebEngage sharedInstance].analytics trackEventWithName:eventName];
        }
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        
    } else {
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

-(void) screenNavigated:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* screenName = command.arguments && command.arguments.count>0?[command.arguments objectAtIndex:0]: nil;
    
    if (screenName != nil && screenName.length > 0) {
        
        id screenData = command.arguments && command.arguments.count>1?[command.arguments objectAtIndex:1]: nil;
        
        if (screenData && [screenData isKindOfClass:[NSDictionary class]]) {
            
            [[WebEngage sharedInstance].analytics
                trackEventWithName:screenName
                          andValue:[self convertISODateStringValuesToNSDate:screenData]];
        } else {
            
            [[WebEngage sharedInstance].analytics trackEventWithName:screenName];
        }
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        
    } else {

        id screenData = command.arguments && command.arguments.count>1?[command.arguments objectAtIndex:1]: nil;
        
        if (screenData && [screenData isKindOfClass:[NSDictionary class]]) {
            
            [[WebEngage sharedInstance].analytics 
                updateCurrentScreenData:[self convertISODateStringValuesToNSDate:screenData]];

            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];

        } else {
            
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
        }
                
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)login:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* userId = command.arguments && command.arguments.count>0?[command.arguments objectAtIndex:0]: nil;
    
    if (userId != nil && userId.length > 0) {
        
        [[WebEngage sharedInstance].user login: userId];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)logout:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    [[WebEngage sharedInstance].user logout];
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}


/*-(void) pushReceived:(CDVInvokedUrlCommand*)command {
    
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
    
}*/

/** In-App Callbacks **/
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
