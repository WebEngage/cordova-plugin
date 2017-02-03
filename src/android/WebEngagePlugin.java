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

public class WebEngagePlugin extends CordovaPlugin {
    
    private static final String TAG = "WebEngagePlugin";

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        Log.v(TAG, "Intialized");
    }
    
    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Log.v(TAG,"Execute: "+action);
        
        if("engage".equals(action)) {
            WebEngage.engage(cordova.getActivity().getApplicationContext());
            WebEngage.get().analytics().start(cordova.getActivity());
            callbackContext.success();
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

}