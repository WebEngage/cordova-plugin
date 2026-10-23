/********* WebEngagePlugin.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import "WebEngagePlugin.h"
#import "WEGJSString.h"
#import "WEGConstants.h"
#import <WebKit/WebKit.h>

#define WEGPluginVersion @"2.0.0"

@interface WebEngagePlugin()

@property (strong, readwrite) NSDateFormatter* dateFormatter;
@property (strong, readwrite) NSDateFormatter* birthDateFormatter;

- (void)sendSuccessCallback:(CDVInvokedUrlCommand *)command;
- (void)sendErrorCallback:(CDVInvokedUrlCommand *)command;
- (void)sendErrorCallback:(CDVInvokedUrlCommand *)command message:(NSString *)message;
- (void)guarded:(CDVInvokedUrlCommand *)command action:(void (^)(void))action;

@end

// The argument at `index` when it is an NSString, otherwise nil (missing, JS null, number, boolean, array or object).
// Callers never send a string message to another type, which would raise and terminate the app.
static NSString *WEGStringArgument(NSArray *arguments, NSUInteger index) {
    id value = arguments.count > index ? arguments[index] : nil;
    return [value isKindOfClass:[NSString class]] ? value : nil;
}

// The object as JSON text, or nil when it is nil or not JSON-serialisable (NSJSONSerialization raises on those).
static NSString *WEGJSONString(id object) {
    if (object == nil || ![NSJSONSerialization isValidJSONObject:object]) {
        return nil;
    }
    NSData *data = [NSJSONSerialization dataWithJSONObject:object options:0 error:nil];
    return data ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding] : nil;
}

@implementation WebEngagePlugin

static WebEngagePlugin *webEngagePlugin;

+ (WebEngagePlugin*) webEngagePlugin {
    return webEngagePlugin;
}

- (void)pluginInitialize {
    [super pluginInitialize];
    NSLog(WEG_LOG_TAG @" : WebEngagePlugin initialized (cordova-plugin-webengage)");
    webEngagePlugin = self;
    self.pendingDeepLinkCallback = nil;
    [webEngagePlugin initialiseWEGVersions];

    NSDateFormatter* dateFormatter = [[NSDateFormatter alloc] init];
    [dateFormatter setDateFormat:WEG_DATE_TIME_FORMAT];
    [dateFormatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:WEG_TIME_ZONE_UTC]];
    [dateFormatter setLocale:[[NSLocale alloc] initWithLocaleIdentifier:WEG_LOCALE_ID]];
    
    self.dateFormatter = dateFormatter;
    
    NSDateFormatter* birthDateFormatter = [[NSDateFormatter alloc] init];
    [birthDateFormatter setDateFormat:WEG_BIRTH_DATE_FORMAT];
    [birthDateFormatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:WEG_TIME_ZONE_UTC]];
    [birthDateFormatter setLocale:[[NSLocale alloc] initWithLocaleIdentifier:WEG_LOCALE_ID]];
   
     [webEngagePlugin registerSDKSecurityCallback];
    self.birthDateFormatter = birthDateFormatter;
}

- (void) initialiseWEGVersions {
    WegVersionKey key = WegVersionKeyIO;
    [[WebEngage sharedInstance] setVersionForChildSDK:WEGPluginVersion forKey:key];
}

- (void)handlePushNotificationPendingDeepLinks {

    WEGAppDelegateHelper* appDelegateHelper = [WEGAppDelegateHelper sharedInstance];

    @synchronized (appDelegateHelper) {
        
        if (self.pendingDeepLinkCallback && self.pendingDeepLinkCallback[WEG_KEY_DEEP_LINK]) {
            
            NSString* deeplink = self.pendingDeepLinkCallback[WEG_KEY_DEEP_LINK];
            NSDictionary* pushData = self.pendingDeepLinkCallback[WEG_KEY_PUSH_INFO];
            
            if (webEngagePlugin && webEngagePlugin.webView) {
                
                [WebEngagePlugin evaluateJavaScript:WEG_JS_PUSH_CLICK_CALLBACK_REGISTERED onWebView:webEngagePlugin.webView completionHandler:^(NSString * _Nullable response, NSError * _Nullable error) {
                    
                    if ([response isEqualToString: @"1"]) {
                        //If callback is registered fire the callback.
                        
                        NSString* pushDataJSON = WEGJSONString(pushData);
                        
                        NSString* string = [NSString stringWithFormat:WEG_JS_PUSH_CLICK_FORMAT, WEGJSStringLiteral(deeplink), pushDataJSON ?: @"null"];
                        
                        [self.commandDelegate evalJs:string];
                        
                    } else {

                        NSURL* url = [NSURL URLWithString:deeplink];
                        if (url) {
                            dispatch_async(dispatch_get_main_queue(), ^{
                                [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
                            });
                        }

                    }
                }];
            }
            self.pendingDeepLinkCallback = nil;
        }

        if (appDelegateHelper.freshLaunch) {
            appDelegateHelper.freshLaunch = NO;
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
    // iOS has no dynamic configuration: WEGAppDelegateHelper starts the SDK from the Info.plist keys.

    [self guarded:command action:^{
        [self handlePushNotificationPendingDeepLinks];
        [self sendSuccessCallback:command];
    }];
}

- (void)track:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        NSString *eventName = WEGStringArgument(command.arguments, 0);

        if (eventName.length > 0) {
            id eventData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
            if (eventData && [eventData isKindOfClass:[NSDictionary class]]) {
                [[WebEngage sharedInstance].analytics
                 trackEventWithName:eventName
                 andValue:[self convertISODateStringValuesToNSDate:eventData]];
            } else {
                [[WebEngage sharedInstance].analytics trackEventWithName:eventName];
            }
            [self sendSuccessCallback:command];
        } else {
            [self sendErrorCallback:command];
        }
    }];
}

- (void)screenNavigated:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        NSString *screenName = WEGStringArgument(command.arguments, 0);

        if (screenName.length > 0) {
            id screenData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
            if (screenData && [screenData isKindOfClass:[NSDictionary class]]) {
                [[WebEngage sharedInstance].analytics navigatingToScreenWithName:screenName andData:[self convertISODateStringValuesToNSDate:screenData]];
            } else {
                [[WebEngage sharedInstance].analytics navigatingToScreenWithName:screenName];
            }

            [self sendSuccessCallback:command];
        } else {
            id screenData = command.arguments && command.arguments.count>1 ? [command.arguments objectAtIndex:1] : nil;
            if (screenData && [screenData isKindOfClass:[NSDictionary class]]) {
                [[WebEngage sharedInstance].analytics
                 updateCurrentScreenData:[self convertISODateStringValuesToNSDate:screenData]];

                [self sendSuccessCallback:command];
            } else {
                [self sendErrorCallback:command];
            }
        }
    }];
}

- (void)login:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        NSString* userId = WEGStringArgument(command.arguments, 0);
        NSString* jwtToken = WEGStringArgument(command.arguments, 1);

        if (userId.length > 0 && jwtToken.length > 0) {
            [[WebEngage sharedInstance].user login:userId jwtToken:jwtToken];
            [self sendSuccessCallback:command];
        } else if (userId.length > 0) {
            [[WebEngage sharedInstance].user login: userId];

            [self sendSuccessCallback:command];
        } else {
            [self sendErrorCallback:command];
        }
    }];
}

- (void)setSecureToken:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        NSString* userId = WEGStringArgument(command.arguments, 0);
        NSString* jwtToken = WEGStringArgument(command.arguments, 1);

        if (userId.length > 0 && jwtToken.length > 0) {
            [[WebEngage sharedInstance].user setSecureToken:userId jwtToken:jwtToken];
            [self sendSuccessCallback:command];
        } else {
            [self sendErrorCallback:command];
        }
    }];
}

- (void)setLocation:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        if ([command.arguments count] != 2) {
            [self sendErrorCallback:command message:WEG_ERROR_SET_LOCATION_ARGUMENT_COUNT];
            return;
        }
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
                NSLog(WEG_LOG_TAG @" : setLocation invalid number format");
                [self sendErrorCallback:command message:WEG_ERROR_SET_LOCATION_INVALID_NUMBER_FORMAT];
                return;
            }
        } else if ([latitude isKindOfClass:[NSNumber class]] && [longitude isKindOfClass:[NSNumber class]]) {
            latNumber = (NSNumber *)latitude;
            lonNumber = (NSNumber *)longitude;
        } else {
            NSLog(WEG_LOG_TAG @" : setLocation invalid arguments");
            [self sendErrorCallback:command message:WEG_ERROR_SET_LOCATION_INVALID_ARGUMENTS];
            return;
        }

        [[WebEngage sharedInstance].user setUserLocationWithLatitude:latNumber andLongitude:lonNumber];
        [self sendSuccessCallback:command];
    }];
}



- (void)logout:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
        [[WebEngage sharedInstance].user loggedOut];
        [self sendSuccessCallback:command];
    }];
}

// Android-only actions: acknowledge the call so callers (and promise wrappers) do not wait forever.
- (void)pushOptions:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)inappOptions:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)globalOptions:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)setDevicePushOptIn:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)sendFcmToken:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)onMessageReceived:(CDVInvokedUrlCommand *)command {
    [self sendSuccessCallback:command];
}

- (void)setAttribute:(CDVInvokedUrlCommand *)command {
    [self guarded:command action:^{
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

        [self sendSuccessCallback:command];
    }];
}

// One attribute that the SDK rejects with an exception is skipped; the other attributes of the same call are still applied.
- (void) setAttributeWithName:(NSString *)attributeName andValue:(id)attributeValue {
    @try {
        [self applyAttributeWithName:attributeName andValue:attributeValue];
    } @catch (NSException *exception) {
        NSLog(WEG_LOG_TAG @" : setAttribute skipped an attribute: %@: %@", exception.name, exception.reason);
    }
}

- (void) applyAttributeWithName:(NSString *)attributeName andValue:(id)attributeValue {
    if ([attributeName hasPrefix:WEG_SYSTEM_ATTRIBUTE_PREFIX]) {
        // The SDK reads every system attribute as a string, later and on its own queue, where an exception cannot be caught
        // here and terminates the app. Anything else (null, number, object, array) is ignored.
        if (![attributeValue isKindOfClass:[NSString class]]) {
            NSLog(WEG_LOG_TAG @" : setAttribute ignored %@: the value must be a string", attributeName);
            return;
        }
        if ([attributeName isEqualToString:WEG_FIRST_NAME]) {
            [[WebEngage sharedInstance].user setFirstName:attributeValue];
        } else if ([attributeName isEqualToString:WEG_LAST_NAME]) {
            [[WebEngage sharedInstance].user setLastName:attributeValue];
        } else if ([attributeName isEqualToString:WEG_EMAIL]) {
            [[WebEngage sharedInstance].user setEmail:attributeValue];
        } else if ([attributeName isEqualToString:WEG_BIRTH_DATE]) {
            NSString *birthDateString = [attributeValue isKindOfClass:[NSString class]]?attributeValue: nil;
            
            NSDate *birthDate = birthDateString ? [self.birthDateFormatter dateFromString:birthDateString] : nil;
            
            if (birthDate) {
                [[WebEngage sharedInstance].user setBirthDate:birthDate];
            }
        } else if ([attributeName isEqualToString:WEG_PHONE]) {
            [[WebEngage sharedInstance].user setPhone:attributeValue];
        } else if ([attributeName isEqualToString:WEG_GENDER]) {
            [[WebEngage sharedInstance].user setGender:attributeValue];
        } else if ([attributeName isEqualToString:WEG_COMPANY]) {
            [[WebEngage sharedInstance].user setCompany:attributeValue];
        } else if ([attributeName isEqualToString:WEG_HASHED_EMAIL]) {
            [[WebEngage sharedInstance].user setHashedEmail:attributeValue];
        } else if ([attributeName isEqualToString:WEG_HASHED_PHONE]) {
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

/** In-App Callbacks **/
- (NSMutableDictionary *)notificationPrepared:(NSMutableDictionary *)inAppNotificationData
                                  shouldStop:(BOOL *)stopRendering {
    
    NSString *inAppJSON = WEGJSONString(inAppNotificationData);
    if (inAppJSON) {
        [self.commandDelegate evalJs:
             [NSString stringWithFormat:
              WEG_JS_NOTIFICATION_PREPARED_FORMAT, inAppJSON]];
    }
    // iOS only notifies JS here; it cannot change or stop the in-app.
    return inAppNotificationData;
}

- (void)notificationShown:(NSMutableDictionary *)inAppNotificationData {
    
    NSString *inAppJSON = WEGJSONString(inAppNotificationData);
    if (inAppJSON) {
        [self.commandDelegate evalJs:
         [NSString stringWithFormat:
          WEG_JS_NOTIFICATION_SHOWN_FORMAT, inAppJSON]];
    }
}

- (void)notificationDismissed:(NSMutableDictionary *)inAppNotificationData {
    NSString *inAppJSON = WEGJSONString(inAppNotificationData);
    if (inAppJSON) {
        [self.commandDelegate evalJs:
         [NSString stringWithFormat:
          WEG_JS_NOTIFICATION_DISMISS_FORMAT, inAppJSON]];
    }
}

- (void)notification:(NSMutableDictionary *)inAppNotificationData
  clickedWithAction:(NSString *)actionId {
    NSString* inAppJSON = WEGJSONString(inAppNotificationData);
    if (inAppJSON) {
        [self.commandDelegate evalJs:
         [NSString stringWithFormat:
          WEG_JS_NOTIFICATION_CLICK_FORMAT,
          inAppJSON, WEGJSStringLiteral(actionId)]];
    }
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
    [self guarded:command action:^{
        BOOL status = NO;

        NSString* ch = WEGStringArgument(command.arguments, 0);
        if (command.arguments && command.arguments.count > 1) {
            id statusArgument = [command.arguments objectAtIndex:1];
            if (![statusArgument respondsToSelector:@selector(boolValue)]) {
                // null, array or object: the status is unknown, so change nothing rather than guess an opt-out
                [self sendErrorCallback:command];
                return;
            }
            status = [statusArgument boolValue];
        }

        if (ch != nil) {
            ch = [ch lowercaseString]; // Convert ch to lowercase
        }

        if (!status && ch == nil) {
            [self sendErrorCallback:command];
        } else {
            if ([ch isEqualToString:[WEG_OPT_IN_PUSH lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelPush status:status];
                [self sendSuccessCallback:command];
            } else if ([ch isEqualToString:[WEG_OPT_IN_SMS lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelSMS status:status];
                [self sendSuccessCallback:command];
            } else if ([ch isEqualToString:[WEG_OPT_IN_EMAIL lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelEmail status:status];
                [self sendSuccessCallback:command];
            } else if ([ch isEqualToString:[WEG_OPT_IN_IN_APP lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelInApp status:status];
                [self sendSuccessCallback:command];
            } else if ([ch isEqualToString:[WEG_OPT_IN_WHATSAPP lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelWhatsapp status:status];
                [self sendSuccessCallback:command];
            } else if ([ch isEqualToString:[WEG_OPT_IN_VIBER lowercaseString]]) {
                [[WebEngage sharedInstance].user setOptInStatusForChannel:WEGEngagementChannelViber status:status];
                [self sendSuccessCallback:command];
            } else {
                [self sendErrorCallback:command];
            }
        }
    }];
}

-(void)presentInAppController:(CDVInvokedUrlCommand *)command{
    [self guarded:command action:^{
        [[WEGAppDelegateHelper sharedInstance] presentInAppController];
        [self sendSuccessCallback:command];
    }];
}


- (void) registerSDKSecurityCallback{
 WEGJWTManager.shared.tokenInvalidatedCallback = ^(void){
        NSDictionary *errorResponse = @{
                        WEG_KEY_ERROR_RESPONSE : WEG_ERROR_RESPONSE_UNAUTHORIZED
                    };
        NSData *data = [NSJSONSerialization dataWithJSONObject:errorResponse options:NSJSONWritingPrettyPrinted error:nil];
        NSString *errorMessage = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        [self.commandDelegate evalJs:
        [NSString stringWithFormat: WEG_JS_JWT_EXPIRED_FORMAT,errorMessage]];
    };
}

// Cordova's command queue does not catch exceptions, so an exception raised here (by the plugin or the WebEngage SDK)
// would terminate the app. It is logged and answered with an error instead.
- (void)guarded:(CDVInvokedUrlCommand *)command action:(void (^)(void))action {
    @try {
        action();
    } @catch (NSException *exception) {
        NSLog(WEG_LOG_TAG @" : %@ failed: %@: %@", command.methodName, exception.name, exception.reason);
        [self sendErrorCallback:command message:WEG_ERROR_UNEXPECTED];
    }
}

// Replies success to the JS caller, with no value.
- (void)sendSuccessCallback:(CDVInvokedUrlCommand *)command {
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] callbackId:command.callbackId];
}

// Replies error to the JS caller, without a message.
- (void)sendErrorCallback:(CDVInvokedUrlCommand *)command {
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR] callbackId:command.callbackId];
}

// Replies error to the JS caller with a message.
- (void)sendErrorCallback:(CDVInvokedUrlCommand *)command message:(NSString *)message {
    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message] callbackId:command.callbackId];
}

@end
