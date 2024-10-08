#import "AppDelegate+WebEngagePlugin.h"
#import <Cordova/CDVPlugin.h>
#import <WebEngage/WebEngage.h>

@interface WebEngagePlugin : CDVPlugin<WEGInAppNotificationProtocol>

@property (strong, nonatomic, readwrite) NSString* onActiveCallbackId;
@property (strong, nonatomic, readwrite) NSMutableDictionary* pendingDeepLinkCallback;

//These APIs should rather be moved in a protected API or category

+ (WebEngagePlugin *)webEngagePlugin;

- (void)initialiseWEGVersions;

- (void)handlePushNotificationPendingDeepLinks;
- (void)registerSDKSecurityCallback;

//Public APIs
//This one's for debugging
//-(void) pushReceived:(CDVInvokedUrlCommand*)command;

- (void)engage:(CDVInvokedUrlCommand *)command;
- (void)login:(CDVInvokedUrlCommand *)command;
- (void)setSecureToken:(CDVInvokedUrlCommand *)command;
- (void)logout:(CDVInvokedUrlCommand *)command;
- (void)track:(CDVInvokedUrlCommand *)command;
- (void)setAttribute:(CDVInvokedUrlCommand *)command;
- (void)setUserOptIn:(CDVInvokedUrlCommand *)command;
- (void)presentInAppController:(CDVInvokedUrlCommand *)command;
+ (void)evaluateJavaScript:(NSString *)script onWebView:(id)webView
          completionHandler:(void (^ _Nullable)(NSString * _Nullable response, NSError * _Nullable error))completionHandler;
@end
