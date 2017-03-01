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
import android.content.Context;
import android.location.Location;
import android.content.Intent;
import android.os.Bundle;

import android.media.RingtoneManager;

import java.util.HashMap;
import java.util.Map;

import com.webengage.sdk.android.WebEngage;
import com.webengage.sdk.android.callbacks.PushNotificationCallbacks;
import com.webengage.sdk.android.actions.render.PushNotificationData;
import com.webengage.sdk.android.actions.render.InAppNotificationData;
import com.webengage.sdk.android.callbacks.InAppNotificationCallbacks;
import com.webengage.sdk.android.callbacks.LifeCycleCallbacks;
import com.webengage.sdk.android.utils.DataType;

public class WebEngagePlugin extends CordovaPlugin implements PushNotificationCallbacks, InAppNotificationCallbacks, LifeCycleCallbacks{
    
    private static final String TAG = "WebEngagePlugin";
    private static CordovaWebView webView;

    private Map<String,Object> pushOptions = new HashMap<String,Object>();
    private static final String PUSH_SOUND = "sound";
    private static final String PUSH_VIBRATION = "vibration";
    private static final String PUSH_SHOULD_RENDER = "shouldRender";


    private Map<String,Object> inappOptions = new HashMap<String, Object> ();
    private static final String INAPP_SHOULD_RENDER = "shouldRender";


    private Map<String,Object> globalOptions = new HashMap<String, Object>();
    private static  String PENDING_PUSH_URI = null;
    private static  JSONObject PENDING_PUSH_CUSTOM_DATA = null;
    private static  boolean IS_PUSH_CALLBACK_PENDING = false;

    static {
        Log.v(TAG, "Static Block called");
    }

    public WebEngagePlugin() {
        Log.v(TAG, "Constructor called");
    }

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
            if(IS_PUSH_CALLBACK_PENDING) {
                IS_PUSH_CALLBACK_PENDING = false;
                webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'click', '" + PENDING_PUSH_URI + "'," + PENDING_PUSH_CUSTOM_DATA + ");");
                PENDING_PUSH_CUSTOM_DATA = null;
                PENDING_PUSH_URI = null;
            }

        } else if("pushOptions".equals(action)) {
            if(args.length() == 2 && !args.isNull(0)) {
                pushOptions.put(args.getString(0), args.get(1));
            }
        } else if("inappOptions".equals(action)) {
            if(args.length() == 2 && !args.isNull(0)) {
                inappOptions.put(args.getString(0), args.get(1));
            }
        } else if("globalOptions".equals(action)) {
            Log.v(TAG,args.getString(0)+" "+args.getString(1));
            if(args.length() == 2 && !args.isNull(0)) {
                globalOptions.put(args.getString(0), args.get(1));
            }
        } else if ("track".equals(action)) {
            if(args.length() > 0) {
                String eventName = null;
                Map<String,Object> attributes = null;
                eventName = args.getString(0);
                if(args.length() == 2 && args.get(1) instanceof JSONObject) {
                    try {
                        attributes = (Map<String, Object>)DataType.convert(args.getJSONObject(1).toString(), DataType.MAP, false);
                    } catch (Exception e) {

                    }
                }
                Log.v(TAG, eventName + " " + attributes);
                if(eventName != null) {
                    if(attributes == null) {
                        WebEngage.get().analytics().track(eventName);
                    } else {
                        WebEngage.get().analytics().track(eventName, attributes);
                    }
                }   
                
            }
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
        if(pushOptions.get(PUSH_SOUND) != null && (Boolean)pushOptions.get(PUSH_SOUND) == true) {
            notificationData.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }
        if(pushOptions.get(PUSH_VIBRATION) != null && (Boolean)pushOptions.get(PUSH_VIBRATION) == true) {
            notificationData.setVibrateFlag(true);
        }
        if(pushOptions.get(PUSH_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean)pushOptions.get(PUSH_SHOULD_RENDER));
        }

        return notificationData;
    }


    public static void handlePushClick(String uri, Bundle data){
        IS_PUSH_CALLBACK_PENDING = true;
        PENDING_PUSH_URI = uri;
        PENDING_PUSH_CUSTOM_DATA = bundleToJson(data);
        Log.v(TAG, "handlePushClick invoked");
    }


    @Override
    public void onPushNotificationShown(Context context, PushNotificationData notificationData) {
    }

     @Override
    public boolean onPushNotificationClicked(Context context, PushNotificationData notificationData) {
        String uri = notificationData.getPrimeCallToAction().getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;

    }

     @Override
    public boolean onPushNotificationActionClicked(Context context, PushNotificationData notificationData, String buttonID) {
        String uri = notificationData.getCallToActionById(buttonID).getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        webView.sendJavascript("javascript:webEngage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;

    }

    @Override
    public void onPushNotificationDismissed(Context context, PushNotificationData notificationData) {

    }

    @Override
    public InAppNotificationData onInAppNotificationPrepared(Context context, InAppNotificationData notificationData) {
        
        if(inappOptions.get(INAPP_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean)inappOptions.get(INAPP_SHOULD_RENDER));
        }
        return notificationData;
    }

    @Override
    public void onInAppNotificationShown(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webEngage.notification.onCallbackReceived( 'shown', " + notificationData.getData() + ");");
    }


    @Override
    public void onInAppNotificationDismissed(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webEngage.notification.onCallbackReceived( 'dismiss', " + notificationData.getData() + ");");
    }

    @Override
    public boolean onInAppNotificationClicked(Context context, InAppNotificationData notificationData, String actionId) {
        webView.sendJavascript("javascript:webEngage.notification.onCallbackReceived( 'click', " + notificationData.getData() + ",'" + actionId + "');");
        return false;
    }


     @Override
    public void onGCMRegistered(Context context, String regID) {
        Log.d(TAG, regID);
    }


    @Override
    public void onGCMMessageReceived(Context context, Intent intent) {
        Log.d(TAG, intent.getExtras().toString());
    }

    @Override
    public void onAppInstalled(Context context, Intent intent) {
        Log.d(TAG + "Install Referrer", intent.getExtras().getString("referrer"));
    }

    @Override
    public void onAppUpgraded(Context context, int oldVersion, int newVersion) {
    }

    private static JSONObject bundleToJson(Bundle bundle) {
        if(bundle != null) {
            JSONObject result = new JSONObject();
            for(String key : bundle.keySet()) {
                try {
                    result.put(key, bundle.get(key));
                } catch (JSONException e) {

                }
            }
            return result;
        }
        return null;
    }

}