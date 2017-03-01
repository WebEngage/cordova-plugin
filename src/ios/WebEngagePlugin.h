#import "AppDelegate+WebEngagePlugin.h"

@interface WebEngagePlugin : CDVPlugin<WEGInAppNotificationProtocol>
  
@property (strong, nonatomic, readwrite) NSString* onActiveCallbackId;
@property (strong, nonatomic, readwrite) NSMutableDictionary* pendingDeepLinkCallback;


//These APIs should rather be moved in a protected API or category

+ (WebEngagePlugin*) webEngagePlugin;

-(void) handlePushNotificationPendingDeepLinks;


//Public APIs
//This one's for debugging
//-(void) pushReceived:(CDVInvokedUrlCommand*)command;

-(void) engage:(CDVInvokedUrlCommand*)command;


@end
