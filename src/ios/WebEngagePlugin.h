
@interface WebEngagePlugin : CDVPlugin 
  
@property (strong, nonatomic, readwrite) NSString* onActiveCallbackId;

//These APIs should rather be moved in a protected API or category
+ (WebEngagePlugin*) webEngagePlugin;
-(void) applicationActive: (UIApplication*) application;


//Public APIs
- (void)onActive:(CDVInvokedUrlCommand*)command;
- (void)login:(CDVInvokedUrlCommand*)command;


@end