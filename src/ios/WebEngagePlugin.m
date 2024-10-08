/********* WebEngagePlugin.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import "WebEngagePlugin.h"
#import <WebKit/WebKit.h>

#define WE_FIRST_NAME @"we_first_name"
#define WE_LAST_NAME @"we_last_name"
#define WE_EMAIL @"we_email"
#define WE_BIRTH_DATE @"we_birth_date"
#define WE_PHONE @"we_phone"
#define WE_GENDER @"we_gender"
#define WE_COMPANY @"we_company"
#define WE_HASHED_EMAIL @"we_hashed_email"
#define WE_HASHED_PHONE @"we_hashed_phone"
#define PUSH @"push"
#define SMS @"sms"
#define EMAIL @"email"
#define IN_APP @"in_app"
#define WHATSAPP @"whatsapp"
#define VIBER @"viber"
#define WEGPluginVersion @"1.3.2"

@interface WebEngagePlugin()

@property (strong, readwrite) NSDateFormatter* dateFormatter;
@property (strong, readwrite) NSDateFormatter* birthDateFormatter;

@end

@implementation WebEngagePlugin

static WebEngagePlugin *webEngagePlugin;

+ (WebEngagePlugin*) webEngagePlugin {
    return webEngagePlugin;
}

- (void)pluginInitialize {
    [super pluginInitialize];
    webEngagePlugin = self;
    self.pendingDeepLinkCallback = nil;
    [webEngagePlugin initialiseWEGVersions];

    NSDateFormatter* dateFormatter = [[NSDateFormatter alloc] init];
    [dateFormatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"];
    [dateFormatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"UTC"]];
    [dateFormatter setLocale:[[NSLocale alloc] initWithLocaleIdentifier:@"gb"]];
    
    self.dateFormatter = dateFormatter;
    
    NSDateFormatter* birthDateFormatter = [[NSDateFormatter alloc] init];
    [birthDateFormatter setDateFormat:@"yyyy-MM-dd"];
    [birthDateFormatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"UTC"]];
    [birthDateFormatter setLocale:[[NSLocale alloc] initWithLocaleIdentifier:@"gb"]];
   
     [webEngagePlugin registerSDKSecurityCallback];
    self.birthDateFormatter = birthDateFormatter;
}

- (void) initialiseWEGVersions {
    WegVersionKey key = WegVersionKeyIO;
    [[WebEngage sharedInstance] setVersionForChildSDK:WEGPluginVersion forKey:key];
}

- (void)handlePushNotificationPendingDeepLinks {
    
    AppDelegate* appDelegate = [AppDelegate sharedInstance];
    
    @synchronized (appDelegate) {
        
        if (self.pendingDeepLinkCallback && self.pendingDeepLinkCallback[@"deepLink"]) {
            
            NSString* deeplink = self.pendingDeepLinkCallback[@"deepLink"];
            NSDictionary* pushData = self.pendingDeepLinkCallback[@"info"];
            
            if (webEngagePlugin && webEngagePlugin.webView) {
                
                [WebEngagePlugin evaluateJavaScript:@"webengage.push.clickCallback !== undefined && webengage.push.clickCallback != null?true: false;" onWebView:webEngagePlugin.webView completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
                    
                    if ([response isEqualToString: @"1"]) {
                        //If callback is registered fire the callback.
                        
                        NSData* data = [NSJSONSerialization dataWithJSONObject:pushData options:0 error:nil];
                        NSString* pushDataJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                        
                        NSString* string = [NSString stringWithFormat:@"webengage.push.onCallbackReceived('click', '%@', %@)", deeplink, pushData? pushDataJSON: @"null"];
                        
                        [self.commandDelegate evalJs:string];
                        
                    } else {
                        
                        NSURL* url = [NSURL URLWithString:deeplink];
                        if (url) {
                            dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                                [[UIApplication sharedApplication] openURL:url];
                            });
                        }
                    
                    }
                }];
            }
            self.pendingDeepLinkCallback = nil;
        }
        
        if ([appDelegate isFreshLaunch]) {
            [appDelegate setFreshLaunch:NO];
        }
        
    }
    
}

-(id) modifyObject: (id) obj modification: (id (^)(id val))modificationHandler {
    
    if ([obj isKindOfClass:[NSDictionary class]]) {
        
        NSMutableDictionary* resultDictionary = [obj mutableCopy];
        [obj enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL* stop) {
            
            resultDictionary[key] = [self modifyObject:obj modification:modificationHandler];
        }];
        
        return resultDictionary;
        
    } else if ([obj isKindOfClass:[NSArray class]]) {
        
        NSMutableArray* resultArray = [obj mutableCopy];
        [obj enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL* stop) {
            resultArray[idx] = [self modifyObject:obj modification:modificationHandler];
        }];
        
        return resultArray;
    }
    
    return modificationHandler(obj);
}

-(id) convertISODateStringValuesToNSDate: (id) originalObject {
    
    return [self modifyObject:originalObject modification:^id(id obj) {
        
        if (obj && [obj isKindOfClass:[NSString class]]) {
            
            NSDate* date = [self.dateFormatter dateFromString:obj];
            
            if (date) {
                return date;
            } else {
                return obj;
            }
        }
        
        return obj;
    }];
}

- (void)engage:(CDVInvokedUrlCommand *)command {
    // TODO: Uncomment this when iOS SDK supports dynamic configuration.
    /*if (command.arguments && command.arguments.count > 0 && [[command.arguments objectAtIndex:0] isKindOfClass:[NSDictionary class]] && [[command.arguments objectAtIndex:0] objectForKey:@"licenseCode"]) {
        id config = [command.arguments objectAtIndex:0];

        NSString *licenseCode = [config objectForKey:@"licenseCode"];

        BOOL debug = false;
        if ([config objectForKey:@"debug"]) {
            debug = [config objectForKey:@"debug"];
        }

        BOOL apnsAutoRegister = true;
        id iosConfig = [config objectForKey:@"ios"];
        if (iosConfig && [iosConfig isKindOfClass:[NSDictionary class]]) {
            if ([iosConfig objectForKey:@"apnsAutoRegister"]) {
                apnsAutoRegister = [iosConfig objectForKey:@"apnsAutoRegister"];
            }
        }

        NSDictionary *settings = @{@"licenseCode": licenseCode};
        NSDictionary *launchOptions = @{};

        BOOL success = [[WebEngage sharedInstance] application:[UIApplication sharedApplication] didFinishLaunchingWithOptions: @{
                @"WebEngage": settings,
                @"launchOptions": launchOptions
            }
            notificationDelegate:nil
            autoRegister:apnsAutoRegister];

        if (success) {
            NSLog(@"WebEngage successfully initialized with config");
        } else {
            NSLog(@"WebEngage initialization with config failed");
        }
    } else {
        WebEngagePlugin *webEngagePlugin = [WebEngagePlugin webEngagePlugin];
        
        id apnsRegistration = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"WEGApnsAutoRegister"];
        
        BOOL autoRegister = YES;
        if (apnsRegistration != nil) {
            autoRegister = [apnsRegistration boolValue];
        }

        BOOL success = [[WebEngage sharedInstance] application:[UIApplication sharedApplication]
                  didFinishLaunchingWithOptions:@{}
                           notificationDelegate:webEngagePlugin
                                   autoRegister:autoRegister];

        if (success) {
            NSLog(@"WebEngage successfully initialized");
        } else {
            NSLog(@"WebEngage initialization failed");
        }
    }*/

    [self handlePushNotificationPendingDeepLinks];
}

- (void)track:(CDVInvokedUrlCommand *)command {
    CDVPluginResult* pluginResult = nil;
    NSString *eventName = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:0] : nil;
    
    if (eventName != nil && eventName.length > 0) {
        id eventData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
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

- (void)screenNavigated:(CDVInvokedUrlCommand *)command {   
    CDVPluginResult* pluginResult = nil;
    NSString *screenName = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:0] : nil;
    
    if (screenName != nil && screenName.length > 0) {
        id screenData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
        if (screenData && [screenData isKindOfClass:[NSDictionary class]]) {
            [[WebEngage sharedInstance].analytics navigatingToScreenWithName:screenName andData:[self convertISODateStringValuesToNSDate:screenData]];
        } else {
            [[WebEngage sharedInstance].analytics navigatingToScreenWithName:screenName];
        }
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        id screenData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
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

- (void)login:(CDVInvokedUrlCommand *)command {
    CDVPluginResult* pluginResult = nil;
    NSString* userId = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:0] : nil;
    NSString* jwtToken = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:1] : nil;
    
    if ((userId != nil && userId != (id)[NSNull null] && userId.length > 0) && (jwtToken != nil && jwtToken != (id)[NSNull null] && jwtToken.length > 0)) {
        [[WebEngage sharedInstance].user login:userId jwtToken:jwtToken];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else if (userId != nil && userId.length > 0) {
        [[WebEngage sharedInstance].user login: userId];

        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setSecureToken:(CDVInvokedUrlCommand *)command{
     CDVPluginResult* pluginResult = nil;
    NSString* userId = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:0] : nil;
    NSString* jwtToken = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:1] : nil;

    if ((userId != nil && userId != (id)[NSNull null] && userId.length > 0) && (jwtToken != nil && jwtToken != (id)[NSNull null] && jwtToken.length > 0)) {
        [[WebEngage sharedInstance].user setSecureToken:userId jwtToken:jwtToken];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setLocation:(CDVInvokedUrlCommand *)command {
    if ([command.arguments count] == 2) {
        id latitude = [command.arguments objectAtIndex:0];
        id longitude = [command.arguments objectAtIndex:1];

        NSNumber *latNumber;
        NSNumber *lonNumber;

        if ([latitude isKindOfClass:[NSString class]] && [longitude isKindOfClass:[NSString class]]) {
            // Convert NSString to NSNumber
            NSNumberFormatter *formatter = [[NSNumberFormatter alloc] init];
            formatter.numberStyle = NSNumberFormatterDecimalStyle;

            latNumber = [formatter numberFromString:latitude];
            lonNumber = [formatter numberFromString:longitude];

            if (!latNumber || !lonNumber) {
                NSLog(@"WebEngagePlugin: setLocation invalid number format");
                return;
            }
        } else if ([latitude isKindOfClass:[NSNumber class]] && [longitude isKindOfClass:[NSNumber class]]) {
            
            latNumber = (NSNumber *)latitude;
            lonNumber = (NSNumber *)longitude;
        } else {
            NSLog(@"WebEngagePlugin: setLocation invalid arguments");
            return;
        }
        [[WebEngage sharedInstance].user setUserLocationWithLatitude:latNumber andLongitude:lonNumber];
    }
}



- (void)logout:(CDVInvokedUrlCommand *)command {
    CDVPluginResult* pluginResult = nil;
    [[WebEngage sharedInstance].user loggedOut];
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setAttribute:(CDVInvokedUrlCommand *)command {
    CDVPluginResult* pluginResult = nil;
    
    if (command.arguments && command.arguments.count > 1) {
        NSString* attributeName = [command.arguments objectAtIndex:0];
        id attributeValue = [command.arguments objectAtIndex:1];
        if ([attributeName isKindOfClass:[NSString class]]) {
            [self setAttributeWithName:attributeName andValue:attributeValue];
        }
    } else {
        id attributesDictionary = command.arguments && command.arguments.count>0 ? [command.arguments objectAtIndex:0] : nil;
        if (attributesDictionary && [attributesDictionary isKindOfClass:[NSDictionary class]]) {
            [attributesDictionary enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL* stop) {
                [self setAttributeWithName:key andValue:obj];
            }];
        }
    }
    
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void) setAttributeWithName:(NSString *)attributeName andValue:(id)attributeValue {
    if ([attributeName hasPrefix:@"we_"]) {
        if ([attributeName isEqualToString:WE_FIRST_NAME]) {
            [[WebEngage sharedInstance].user setFirstName:attributeValue];
        } else if ([attributeName isEqualToString:WE_LAST_NAME]) {
            [[WebEngage sharedInstance].user setLastName:attributeValue];
        } else if ([attributeName isEqualToString:WE_EMAIL]) {
            [[WebEngage sharedInstance].user setEmail:attributeValue];
        } else if ([attributeName isEqualToString:WE_BIRTH_DATE]) {
            NSString *birthDateString = [attributeValue isKindOfClass:[NSString class]]?attributeValue: nil;
            
            NSDate *birthDate = [self.birthDateFormatter dateFromString:birthDateString];
            
            if (birthDate) {
                [[WebEngage sharedInstance].user setBirthDate:birthDate];
            }
        } else if ([attributeName isEqualToString:WE_PHONE]) {
            [[WebEngage sharedInstance].user setPhone:attributeValue];
        } else if ([attributeName isEqualToString:WE_GENDER]) {
            [[WebEngage sharedInstance].user setGender:attributeValue];
        } else if ([attributeName isEqualToString:WE_COMPANY]) {
            [[WebEngage sharedInstance].user setCompany:attributeValue];
        } else if ([attributeName isEqualToString:WE_HASHED_EMAIL]) {
            [[WebEngage sharedInstance].user setHashedEmail:attributeValue];
        } else if ([attributeName isEqualToString:WE_HASHED_PHONE]) {
            [[WebEngage sharedInstance].user setHashedPhone:attributeValue];
        }
        //Any other we_* user attribute is ignored
    } else {
        id resolvedAttributeValue = [self convertISODateStringValuesToNSDate:attributeValue];
        
        if ([resolvedAttributeValue isKindOfClass:[NSNumber class]]) {
            [[WebEngage sharedInstance].user setAttribute:attributeName withValue:resolvedAttributeValue];
        } else if ([resolvedAttributeValue isKindOfClass:[NSString class]]) {
            [[WebEngage sharedInstance].user setAttribute:attributeName withStringValue:resolvedAttributeValue];
        } else if ([resolvedAttributeValue isKindOfClass:[NSDate class]]) {
            [[WebEngage sharedInstance].user setAttribute:attributeName withDateValue:resolvedAttributeValue];
        } else if ([resolvedAttributeValue isKindOfClass:[NSArray class]]) {
            [[WebEngage sharedInstance].user setAttribute:attributeName withArrayValue:resolvedAttributeValue];
        } else if ([resolvedAttributeValue isKindOfClass:[NSDictionary class]]) {
            [[WebEngage sharedInstance].user setAttribute:attributeName withDictionaryValue:resolvedAttributeValue];
        }
    }
}

- (BOOL)isReservedUserAttribute:(NSString *)attributeName {
    NSArray* reservedAttributes = @[@"we_first_name", @"we_last_name", @"we_email",
                                    @"we_birth_date", @"we_phone", @"we_gender", @"we_company",
                                    @"we_hashed_email", @"we_hashed_phone"];
    
    if ([reservedAttributes containsObject:attributeName]) {
        return YES;
    }
    return NO;
}

/** In-App Callbacks **/
- (NSMutableDictionary *)notificationPrepared:(NSMutableDictionary *)inAppNotificationData
                                  shouldStop:(BOOL *)stopRendering {
    
    NSData *data = [NSJSONSerialization dataWithJSONObject:inAppNotificationData options:0 error:nil];
    NSString *inAppJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    [self.commandDelegate evalJs:
         [NSString stringWithFormat:
          @"webengage.notification.onCallbackReceived( 'prepared', %@)", inAppJSON]];
    // TODO : Commedted due to
    // Decided only to give callback for prepared
    /*
        NSString* resultData = [WebEngagePlugin evaluateJavaScript:[NSString stringWithFormat:
                                                                    @"JSON.stringify(webengage.notification.onCallbackReceived( 'prepared', %@))",
                                                                    inAppJSON] onWebView:self.webView];


        NSMutableDictionary* modifiedData = nil;
        if (resultData) {
            NSData *data = [resultData dataUsingEncoding:NSUTF8StringEncoding];
            if (data) {
                NSMutableDictionary *modifiedData =
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
    */
    return inAppNotificationData;
}

- (void)notificationShown:(NSMutableDictionary *)inAppNotificationData {
    
    NSData *data = [NSJSONSerialization dataWithJSONObject:inAppNotificationData options:0 error:nil];
    NSString *inAppJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    
    [self.commandDelegate evalJs:
     [NSString stringWithFormat:
      @"webengage.notification.onCallbackReceived( 'shown', %@)", inAppJSON]];
}

- (void)notificationDismissed:(NSMutableDictionary *)inAppNotificationData {
    NSData *data = [NSJSONSerialization dataWithJSONObject:inAppNotificationData options:0 error:nil];
    NSString *inAppJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    
    [self.commandDelegate evalJs:
     [NSString stringWithFormat:
      @"webengage.notification.onCallbackReceived( 'dismiss', %@)", inAppJSON]];
}

- (void)notification:(NSMutableDictionary *)inAppNotificationData
  clickedWithAction:(NSString *)actionId {
    NSData* data = [NSJSONSerialization dataWithJSONObject:inAppNotificationData options:0 error:nil];
    NSString* inAppJSON = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    
    [self.commandDelegate evalJs:
     [NSString stringWithFormat:
      @"webengage.notification.onCallbackReceived( 'click', %@, '%@')",
      inAppJSON, actionId]];
}

+ (NSString *)evaluateJavaScript:(NSString *)script onWebView:(UIView *)webView {
    __block NSString* resultData = [[NSString alloc] init];
    
    if ([webView isKindOfClass:WKWebView.class]) {
        WKWebView *webview = (WKWebView*)webView;
        [webview evaluateJavaScript:script completionHandler:^(id _Nullable result, NSError * _Nullable error) {
            resultData=result;
        }];
    }
    return  resultData;
}

+ (void) evaluateJavaScript:(NSString *)script onWebView:(id)webView
          completionHandler:(void (^ _Nullable)(NSString * _Nullable response, NSError * _Nullable error))completionHandler {
    
    if ([webView isKindOfClass:WKWebView.class]) {
        WKWebView *webview = (WKWebView*)webView;
        [webview evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
            if (completionHandler) {
                if (error) 
                    completionHandler(nil, error);
                else 
                    completionHandler([NSString stringWithFormat:@"%@", result], nil);
            }
        }];
    }
}

- (void)setUserOptIn:(CDVInvokedUrlCommand *)command {
    CDVPluginResult* pluginResult = nil;
    BOOL status = nil;
    
    NSString* ch = command.arguments && command.arguments.count > 0 ? [command.arguments objectAtIndex:0] : nil;
    if (command.arguments && command.arguments.count > 1) {
        status = [[command.arguments objectAtIndex:1] boolValue];
    }
    
    if (ch != nil) {
        ch = [ch lowercaseString]; // Convert ch to lowercase
    }
    
    if (status == nil && ch == nil) {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    } else {
        if ([ch isEqualToString:[PUSH lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelPush status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else if ([ch isEqualToString:[SMS lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelSMS status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else if ([ch isEqualToString:[EMAIL lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelEmail status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else if ([ch isEqualToString:[IN_APP lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelInApp status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else if ([ch isEqualToString:[WHATSAPP lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelWhatsapp status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else if ([ch isEqualToString:[VIBER lowercaseString]]) {
            [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelViber status:status];
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        } else {
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
        }
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

-(void)presentInAppController:(CDVInvokedUrlCommand *)command{
    AppDelegate* appDelegate = [AppDelegate sharedInstance];
    [appDelegate presentInAppController];
}


- (void) registerSDKSecurityCallback{
 WEGJWTManager.shared.tokenInvalidatedCallback = ^(void){
        NSDictionary *errorResponse = @{
                        @"errorResponse" : @"401"
                    };
        NSData *data = [NSJSONSerialization dataWithJSONObject:errorResponse options:NSJSONWritingPrettyPrinted error:nil];
        NSString *errorMessage = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        [self.commandDelegate evalJs:
        [NSString stringWithFormat: @"webengage.jwtManager.onCallbackReceived('expired', %@)",errorMessage]];
    };
}

@end

