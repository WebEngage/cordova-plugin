/********* WebEngagePlugin.m Cordova Plugin Implementation *******/

#import <Cordova/CDV.h>
#import <WebEngage/WebEngage.h>
#import "WebEngagePlugin.h"

/*@interface WebEngagePlugin : CDVPlugin {
  @property (strong, nonatomic, readwrite) NSString* onActiveCallbackId;
}

- (void)onActive:(CDVInvokedUrlCommand*)command
- (void)login:(CDVInvokedUrlCommand*)command;
@end*/

@implementation WebEngagePlugin

static WebEngagePlugin *webEngagePlugin;

+ (WebEngagePlugin*) webEngagePlugin {
    return webEngagePlugin;
}

- (void)pluginInitialize {
    webEngagePlugin = self;
}

- (void)login:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    NSString* userId = [command.arguments objectAtIndex:0];

    if (userId != nil && [userId length] > 0) {

    	[[WebEngage sharedInstance].user loggedIn: userId];
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    } else {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR];
    }

    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)onActive:(CDVInvokedUrlCommand*)command {
    
    CDVPluginResult* pluginResult = nil;
    
    self.onActiveCallbackId = command.callbackId;
    pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    

    [self.commandDelegate sendPluginResult:pluginResult callbackId:nil];
}

-(void) applicationActive: (UIApplication*) application {

    if (self.onActiveCallbackId) {
        [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK] 
                                    callbackId:self.onActiveCallbackId];
    }

}



@end
