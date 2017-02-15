package com.webengage.cordova;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;


import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;



import android.app.Application;
import android.util.Log;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Bundle;

import com.webengage.sdk.android.WebEngage;
import com.webengage.sdk.android.callbacks.PushNotificationCallbacks;
import com.webengage.sdk.android.actions.render.PushNotificationData;
import com.webengage.sdk.android.callbacks.InAppNotificationCallbacks;

public class WebEngagePlugin extends CordovaPlugin implements PushNotificationCallbacks, InAppNotificationCallbacks{
    
    private static final String TAG = "WebEngagePlugin";
    private static CordovaWebView webView;

    private Map<String,Object> pushOptions = new HashMap<String,Object>();
    private static final String PUSH_SMALL_ICON = "smallIcon";
    private static final String PUSH_LARGE_ICON = "largeIcon";
    private static final String PUSH_SOUND = "sound";
    private static final String PUSH_VIBRATION = "vibration";
    private static final String PUSH_ACCENT_COLOR = "accentColor";
    private static final String PUSH_SHOULD_RENDER = "shouldRender";
    private static final String PUSH_SHOULD_DELEGATE_CLICK = "shouldDelegateClick";


    private Map<String,Object> inappOptions = new HashMap<String, Object> ();
    private static final String INAPP_SHOULD_RENDER = "shouldRender";
    private static final String INAPP_SHOULD_DELEGATE_CLICK = "shouldDelegateClick";


    private Map<String,Object> globalOptions = new HashMap<String, Object>();

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        this.webView = webView;
        Log.v(TAG, "Intialized");
    }
    
    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Log.v(TAG,"Execute: "+action);
        
        if("engage".equals(action)) {
            WebEngage.registerPushNotificationCallback(this);
            WebEngage.registerInAppNotificationCallback(this);
            WebEngage.registerLifeCycleCallback(this);
            WebEngage.engage(cordova.getActivity().getApplicationContext());
            WebEngage.get().analytics().start(cordova.getActivity());
            callbackContext.success();
        }

        if("pushOptions".equals(action)) {
            pushOptions.put(args.getString(0), args.get(1));
        }

        if("inappOptions".equals(action)) {
            inappOptions.put(args.getString(0), args.get(1));
        }

        if("globalOptions".equals(action)) {
            globalOptions.put(args.getString(0), args.get(1));
        }
        
        return true;
    }
    @Override
    public void onStart() {
        Log.v(TAG,"Activity Start");
        WebEngage.get().analytics().start(cordova.getActivity());
        super.onStart();
    }
    
    @Override
    public void onStop() {
        Log.v(TAG,"Activity Stop");
        WebEngage.get().analytics().stop(cordova.getActivity());
        super.onStop();
    }

    @Override
    public PushNotificationData onPushNotificationReceived(Context context, PushNotificationData notificationData) {

        if(pushOptions.get(PUSH_SMALL_ICON)!=null) {
            notificationData.setSmallIcon(pushOptions.get(PUSH_SMALL_ICON));
        }
        if(pushOptions.get(PUSH_LARGE_ICON) != null) {
            notificationData.setLargerIcon(pushOptions.get(PUSH_LARGE_ICON));
        }
        if(pushOptions.get(PUSH_SOUND) != null && pushOptions.get(PUSH_SOUND) == true) {
            notificationData.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }
        if(pushOptions.get(PUSH_VIBRATION) != null && pushOptions.get(PUSH_VIBRATION) == true) {
            notificationData.setVibrateFlag(true);
        }
        if(pushOptions.get(PUSH_ACCENT_COLOR) != null) {
            notificationData.setAccentColor(pushOptions.get(PUSH_ACCENT_COLOR));
        }
        if(pushOptions.get(PUSH_SHOULD_RENDER) != null) {
            notificationData.setShouldRender(pushOptions.get(PUSH_SHOULD_RENDER));
        }

        return notificationData;
    }


    @Override
    public void onPushNotificationShown(Context context, PushNotificationData notificationData) {

        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'shown', '" + notificationData.toString() + "');");
    }

     @Override
    public boolean onPushNotificationClicked(Context context, PushNotificationData notificationData) {
        
        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'click', '" + notificationData.toString() + "','" + notificationData.getPrimeCallToAction().getId() + "');");
        return pushOptions.get(PUSH_SHOULD_DELEGATE_CLICK) ? pushOptions.get(PUSH_SHOULD_DELEGATE_CLICK) : false;

    }

     @Override
    public boolean onPushNotificationActionClicked(Context context, PushNotificationData notificationData, String buttonID) {
        
        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'click', '" + notificationData.toString() + "','" + buttonID + "');");
        return pushOptions.get(PUSH_SHOULD_DELEGATE_CLICK) ? pushOptions.get(PUSH_SHOULD_DELEGATE_CLICK) : false;

    }

    @Override
    public void onPushNotificationDismissed(Context context, PushNotificationData notificationData) {

        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'dismiss', '" + notificationData.toString() + "');");
    }

    @Override
    public InAppNotificationData onInAppNotificationPrepared(Context context, InAppNotificationData inAppNotificationData) {
        
        if(inappOptions.get(INAPP_SHOULD_RENDER) != null) {
            inAppNotificationData.setShouldRender(inappOptions.get(INAPP_SHOULD_RENDER));
        }
        return inAppNotificationData;
    }

    @Override
    public void onInAppNotificationShown(Context context, InAppNotificationData inAppNotificationData) {
        webView.sendJavascript("javascript:webEngage.inapp.onCallbackReceived( 'shown', " + notificationData.getData() + ");");
    }


    @Override
    public void onInAppNotificationDismissed(Context context, InAppNotificationData inAppNotificationData) {
        webView.sendJavascript("javascript:webEngage.inapp.onCallbackReceived( 'dismiss', " + notificationData.getData() + ");");
    }

    @Override
    public boolean onInAppNotificationClicked(Context context, InAppNotificationData inAppNotificationData, String actionId) {
        webView.sendJavascript("javascript:webEngage.inapp.onCallbackReceived( 'click', " + notificationData.getData() + ",'" + actionId + "');");
        return inappOptions.get(INAPP_SHOULD_DELEGATE_CLICK) ? inappOptions.get(INAPP_SHOULD_DELEGATE_CLICK) : false;;
    }

}