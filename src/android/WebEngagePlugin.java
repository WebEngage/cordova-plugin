package com.webengage.cordova;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import android.media.RingtoneManager;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

import java.util.TimeZone;

import java.util.Iterator;
import java.util.Locale;

import java.text.SimpleDateFormat;

import com.webengage.sdk.android.Logger;
import com.webengage.sdk.android.WebEngage;
import com.webengage.sdk.android.WebEngageConfig;
import com.webengage.sdk.android.LocationTrackingStrategy;
import com.webengage.sdk.android.callbacks.PushNotificationCallbacks;
import com.webengage.sdk.android.actions.render.PushNotificationData;
import com.webengage.sdk.android.actions.render.InAppNotificationData;
import com.webengage.sdk.android.callbacks.InAppNotificationCallbacks;
import com.webengage.sdk.android.UserProfile;
import com.webengage.sdk.android.utils.Gender;
import com.webengage.sdk.android.Channel;
import com.webengage.sdk.android.callbacks.WESecurityCallback;


public class WebEngagePlugin extends CordovaPlugin implements PushNotificationCallbacks, InAppNotificationCallbacks, WESecurityCallback {
    private static final String TAG = "WebEngagePlugin";
    private static CordovaWebView webView;

    private Map<String, Object> pushOptions = new HashMap<String, Object>();
    private static final String PUSH_SOUND = "sound";
    private static final String PUSH_VIBRATION = "vibration";
    private static final String PUSH_SHOULD_RENDER = "shouldRender";

    private Map<String, Object> inappOptions = new HashMap<String, Object>();
    private static final String INAPP_SHOULD_RENDER = "shouldRender";

    private Map<String, Object> globalOptions = new HashMap<String, Object>();
    private static String PENDING_PUSH_URI = null;
    private static JSONObject PENDING_PUSH_CUSTOM_DATA = null;
    private static boolean IS_PUSH_CALLBACK_PENDING = false;
    private static final String FIRST_NAME = "we_first_name";
    private static final String LAST_NAME = "we_last_name";
    private static final String EMAIL = "we_email";
    private static final String BIRTH_DATE = "we_birth_date";
    private static final String PHONE = "we_phone";
    private static final String GENDER = "we_gender";
    private static final String COMPANY = "we_company";
    private static final String HASHED_EMAIL = "we_hashed_email";
    private static final String HASHED_PHONE = "we_hashed_phone";

    static {
        Log.d(TAG, "Static Block called");
    }

    public WebEngagePlugin() {
        Log.d(TAG, "Constructor called");
    }

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        this.webView = webView;
        Log.d(TAG, "Intialized");
    }

    @Override
    public void onSecurityException(Map<String, Object> errorDetails) {
        Log.e(TAG, "onSecurityException triggered  ");
        if (errorDetails != null) {
            JSONObject errorObject = new JSONObject(errorDetails);
            webView.sendJavascript("javascript:webengage.jwtManager.onCallbackReceived('expired',  " + errorObject + ");");
        }
    }

    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Logger.v(TAG, "Execute: " + action);

        if ("engage".equals(action)) {
            WebEngage.registerPushNotificationCallback(this);
            WebEngage.registerInAppNotificationCallback(this);
            WebEngage.registerWESecurityCallback(this);

            if (args != null && args.length() > 0 && args.get(0) instanceof JSONObject) {
                // Dynamic config
                JSONObject config = args.getJSONObject(0);

                WebEngageConfig.Builder configBuilder = new WebEngageConfig.Builder();
                if (!config.isNull("licenseCode")) {
                    configBuilder.setWebEngageKey(config.optString("licenseCode"));
                }
                if (!config.isNull("debug")) {
                    configBuilder.setDebugMode(config.optBoolean("debug"));
                }

                if (!config.isNull("smallIcon")) {
                    String iconRes = config.optString("smallIcon");
                    if (!iconRes.isEmpty()) {
                        try {
                            String[] iconResSplit = iconRes.split("\\.");
                            String res = iconResSplit[1];
                            String iconName = iconResSplit[2];
                            int resId = cordova.getActivity().getApplicationContext().getResources().getIdentifier(iconName,
                                    res, cordova.getActivity().getApplicationContext().getPackageName());
                            configBuilder.setPushSmallIcon(resId);
                        } catch (Exception e) {
                            Logger.d("WebEngagePlugin", "Provide proper format for smallIcon: R.<res-dir>.<icon-name>");
                        }
                    }
                }
                if (!config.isNull("largeIcon")) {
                    String iconRes = config.optString("largeIcon");
                    if (!iconRes.isEmpty()) {
                        try {
                            String[] iconResSplit = iconRes.split("\\.");
                            String res = iconResSplit[1];
                            String iconName = iconResSplit[2];
                            int resId = cordova.getActivity().getApplicationContext().getResources().getIdentifier(iconName,
                                    res, cordova.getActivity().getApplicationContext().getPackageName());
                            configBuilder.setPushLargeIcon(resId);
                        } catch (Exception e) {
                            Logger.d("WebEngagePlugin", "Provide proper format for smallIcon: R.<res-dir>.<icon-name>");
                        }

                    }
                }

                if (!config.isNull("android")) {
                    JSONObject androidConfig = config.getJSONObject("android");
                    if (!androidConfig.isNull("autoPushRegister")) {
                        configBuilder.setAutoGCMRegistrationFlag(androidConfig.optBoolean("autoPushRegister"));
                    }
                    if (!androidConfig.isNull("pushProjectNumber")) {
                        configBuilder.setGCMProjectNumber(androidConfig.optString("pushProjectNumber"));
                    }
                    if(!androidConfig.isNull("autoGAIDTracking") && androidConfig.getBoolean("autoGAIDTracking") == false) {
                        configBuilder.setAutoGAIDTracking(false);
                    }
                    if (!androidConfig.isNull("locationTrackingStrategy")) {
                        if ("accuracy_best".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_BEST);
                        } else if ("accuracy_city".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_CITY);
                        } else if ("accuracy_country".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_COUNTRY);
                        } else if ("disabled".equals(androidConfig.optString("locationTrackingStrategy"))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.DISABLED);
                        }
                    }
                }

                WebEngage.engage(cordova.getActivity().getApplicationContext(), configBuilder.build());
            } else {
                // Static config read from config.xml
                WebEngage.engage(cordova.getActivity().getApplicationContext());
            }

            WebEngage.get().analytics().start(cordova.getActivity());
            callbackContext.success();
            if (IS_PUSH_CALLBACK_PENDING) {
                IS_PUSH_CALLBACK_PENDING = false;
                webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + PENDING_PUSH_URI + "'," + PENDING_PUSH_CUSTOM_DATA + ");");
                PENDING_PUSH_CUSTOM_DATA = null;
                PENDING_PUSH_URI = null;
            }
        } else if ("pushOptions".equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                pushOptions.put(args.getString(0), args.get(1));
            }
        } else if ("inappOptions".equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                inappOptions.put(args.getString(0), args.get(1));
            }
        } else if ("globalOptions".equals(action)) {
            Logger.v(TAG, args.getString(0) + " " + args.getString(1));
            if (args.length() == 2 && !args.isNull(0)) {
                globalOptions.put(args.getString(0), args.get(1));
            }
        } else if ("track".equals(action)) {
            if (args.length() > 0 && !args.isNull(0)) {
                String eventName = null;
                Map<String, Object> attributes = null;
                eventName = args.getString(0);
                if (args.length() == 2 && args.get(1) instanceof JSONObject) {
                    try {
                        attributes = (Map<String, Object>) fromJSON(args.getJSONObject(1));
                    } catch (JSONException e) {

                    }
                }
                Logger.d(TAG, eventName + " " + attributes);
                if (eventName != null) {
                    if (attributes == null) {
                        WebEngage.get().analytics().track(eventName);
                    } else {
                        WebEngage.get().analytics().track(eventName, attributes);
                    }
                }
            }
        } else if ("setAttribute".equals(action)) {
            JSONObject customAttr = new JSONObject();
            UserProfile.Builder userProfileBuilder = new UserProfile.Builder();
            if (args.length() == 1 && args.get(0) instanceof JSONObject) {
                JSONObject attributes = null;
                attributes = args.getJSONObject(0);
                if (attributes != null) {
                    Iterator<String> iterator = attributes.keys();
                    while (iterator.hasNext()) {
                        String key = iterator.next();
                        try {
                            Object value = attributes.get(key);
                            filterSystemAndCustomAttributes(key, value, customAttr, userProfileBuilder);
                        } catch (JSONException e) {

                        }
                    }
                }
            } else if (args.length() == 2 && !args.isNull(0)) {
                filterSystemAndCustomAttributes(args.getString(0), args.get(1), customAttr, userProfileBuilder);
            }
            Map<String, Object> filteredCustomAttributes = null;
            try {
                filteredCustomAttributes = (Map<String, Object>) fromJSON(customAttr);
            } catch (JSONException e) {

            }
            if (filteredCustomAttributes != null && filteredCustomAttributes.size() > 0) {
                WebEngage.get().user().setAttributes(filteredCustomAttributes);
            }
            WebEngage.get().user().setUserProfile(userProfileBuilder.build());
        } else if ("screenNavigated".equals(action)) {
            if (args.length() > 0) {
                String screenName = null;
                Map<String, Object> screenData = null;
                screenName = args.isNull(0) ? null : args.getString(0);
                if (args.length() == 2 && args.get(1) instanceof JSONObject) {
                    try {
                        screenData = (Map<String, Object>) fromJSON(args.getJSONObject(1));
                    } catch (JSONException e) {

                    }
                }
                if (screenName != null) {
                    if (screenData == null) {
                        WebEngage.get().analytics().screenNavigated(screenName);
                    } else {
                        WebEngage.get().analytics().screenNavigated(screenName, screenData);
                    }
                } else {
                    if (screenData != null) {
                        WebEngage.get().analytics().setScreenData(screenData);
                    }
                }
            }
        } else if("sendFcmToken".equals(action)){
            if (args.length() > 0 && !args.isNull(0)) {
                String fcmToken = null;
                fcmToken = args.getString(0);
                Logger.d(TAG, fcmToken + " " + fcmToken);
                if (fcmToken != null) {
                    WebEngage.get().setRegistrationID(fcmToken);
                }
            }
        } else if("onMessageReceived".equals(action)) {
            if (args != null && args.length() > 0 && !args.isNull(0)) {
                try {
                    String jsonString = args.getString(0);
                    JSONObject jsonObject = new JSONObject(jsonString);
                    Map<String, String> map = new HashMap<>();
                    Iterator<String> keys = jsonObject.keys();

                    while (keys.hasNext()) {
                        String key = keys.next();
                        String value = jsonObject.getString(key);
                        map.put(key, value);
                    }
                    if(map.containsKey("source") && "webengage".equals(map.get("source")) && map.containsKey("message_data")) {
                        WebEngage.get().receive(map);
                    } else {
                        Log.d(TAG, "WebEngage: Invalid payload passed to WebEngage");
                    }
                } catch (JSONException e) {
                    callbackContext.error("JSON parsing error: " + e.getMessage());
                }
            }
        } else if ("login".equals(action)) {
            if (args.length() == 1 && args.get(0) instanceof String) {
                WebEngage.get().user().login(args.getString(0));
            } else if (args.length() == 2 && args.get(0) instanceof String && (args.get(1) == null || "null".equals(args.getString(1)))) {
                WebEngage.get().user().login(args.getString(0));
            } else if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof String) {
                WebEngage.get().user().login(args.getString(0), args.getString(1));
            }
        } else if("setSecureToken".equals(action)) {
            if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof String) {
                WebEngage.get().setSecurityToken(args.getString(0), args.getString(1));
            }
        } else if ("logout".equals(action)) {
            WebEngage.get().user().logout();
        } else if ("setDevicePushOptIn".equals(action)) {
            if (args.length() == 1 && args.get(0) instanceof Boolean) {
                WebEngage.get().user().setDevicePushOptIn(args.getBoolean(0));
            }
        } else if ("setUserOptIn".equals(action)) {
            if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof Boolean) {
                String channel = args.getString(0);
                boolean status = args.getBoolean(1);
                if ("PUSH".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.PUSH, status);
                } else if ("SMS".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.SMS, status);
                } else if ("EMAIL".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.EMAIL, status);
                } else if ("IN_APP".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.IN_APP, status);
                } else if ("WHATSAPP".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.WHATSAPP, status);
                } else if ("VIBER".equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.VIBER, status);
                }
                else {
                    Logger.e("WebEngagePlugin", "Invalid channel: " + channel + ". Must be one of [push, sms, email, in_app, whatsapp, viber].");
                }            
            }
        } else if("setLocation".equals(action)) {
            Logger.d("WebEngagePlugin", "setLocation: triggered");
            if (args.length() == 2) {
                try {
                    double latitude = Double.parseDouble(args.getString(0));
                    double longitude = Double.parseDouble(args.getString(1));
                    Logger.d("WebEngagePlugin", "setLocation: valid arguments");
                    WebEngage.get().user().setLocation(latitude, longitude);
                } catch (NumberFormatException e) {
                    Logger.d("WebEngagePlugin", "setLocation: invalid arguments, unable to parse to Double");
                }
            } else {
                Logger.d("WebEngagePlugin", "setLocation: invalid number of arguments");
            }
        }

        else if("startGAIDTracking".equals(action)){
            WebEngage.get().startGAIDTracking();
        }

        return true;
    }

    private void filterSystemAndCustomAttributes(String key, Object value, JSONObject customAttr, UserProfile.Builder userProfileBuilder) {
        if (FIRST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setFirstName((String) value);
        } else if (LAST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setLastName((String) value);
        } else if (EMAIL.equals(key) && value instanceof String) {
            userProfileBuilder.setEmail((String) value);
        } else if (BIRTH_DATE.equals(key) && value instanceof String) {
            try {
                String bDate = (String) value;
                if (bDate.length() == "yyyy-MM-dd".length()) {
                    int year = Integer.valueOf(bDate.substring(0, 4));
                    int month = Integer.valueOf(bDate.substring(5, 7));
                    int day = Integer.valueOf(bDate.substring(8));
                    userProfileBuilder.setBirthDate(year, month, day);
                }
            } catch (Exception e) {

            }
        } else if (PHONE.equals(key) && value instanceof String) {
            userProfileBuilder.setPhoneNumber((String) value);
        } else if (GENDER.equals(key) && value instanceof String) {
            userProfileBuilder.setGender(Gender.valueByString((String) value));
        } else if (COMPANY.equals(key) && value instanceof String) {
            userProfileBuilder.setCompany((String) value);
        } else if (HASHED_EMAIL.equals(key)) {
            userProfileBuilder.setHashedEmail((String) value);
        } else if (HASHED_PHONE.equals(key)) {
            userProfileBuilder.setHashedPhoneNumber((String) value);
        } else {
            try {
                customAttr.put(key, value);
            } catch (JSONException e) {

            }
        }
    }

    @Override
    public void onStart() {
        Logger.d(TAG, "Activity Start");
        WebEngage.get().analytics().start(cordova.getActivity());
        super.onStart();
    }

    @Override
    public void onStop() {
        Logger.d(TAG, "Activity Stop");
        WebEngage.get().analytics().stop(cordova.getActivity());
        super.onStop();
    }

    @Override
    public PushNotificationData onPushNotificationReceived(Context context, PushNotificationData notificationData) {
        if (pushOptions.get(PUSH_SOUND) != null && (Boolean) pushOptions.get(PUSH_SOUND) == true) {
            notificationData.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }
        if (pushOptions.get(PUSH_VIBRATION) != null && (Boolean) pushOptions.get(PUSH_VIBRATION) == true) {
            notificationData.setVibrateFlag(true);
        }
        if (pushOptions.get(PUSH_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean) pushOptions.get(PUSH_SHOULD_RENDER));
        }
        return notificationData;
    }

    public static void handlePushClick(String uri, Bundle customData) {
        IS_PUSH_CALLBACK_PENDING = true;
        PENDING_PUSH_URI = uri;
        JSONObject data = bundleToJson(customData);
        JSONObject pushPayload = null;
        try {
            if (customData != null && customData.containsKey("we_pushPayload")) {
                pushPayload = new JSONObject(customData.getString("we_pushPayload"));
                data.remove("we_pushPayload");
                mergeJson(data, pushPayload);
            }
        } catch (JSONException e) {
            Logger.e(TAG, "error merging json");
        }
        PENDING_PUSH_CUSTOM_DATA = data;
        Logger.d(TAG, "handlePushClick invoked");
    }

    @Override
    public void onPushNotificationShown(Context context, PushNotificationData notificationData) {
//         String uri = notificationData.getPrimeCallToAction().getAction();
//         JSONObject customData = bundleToJson(notificationData.getCustomData());
//         webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'shown', '" + uri + "'," + customData + ");");
    }

    @Override
    public boolean onPushNotificationClicked(Context context, PushNotificationData notificationData) {
        String uri = notificationData.getPrimeCallToAction().getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        try {
            customData = mergeJson(bundleToJson(notificationData.getCustomData()), notificationData.getPushPayloadJSON());
        } catch (JSONException e) {
            e.printStackTrace();
            Logger.e(TAG, "Exception while merging JSON");
        }
        webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;
    }

    @Override
    public boolean onPushNotificationActionClicked(Context context, PushNotificationData notificationData, String buttonID) {
        String uri = notificationData.getCallToActionById(buttonID).getAction();
        JSONObject customData = bundleToJson(notificationData.getCustomData());
        try {
            customData = mergeJson(bundleToJson(notificationData.getCustomData()), notificationData.getPushPayloadJSON());
        } catch (JSONException e) {
            e.printStackTrace();
            Logger.e(TAG, "Exception while merging JSON");
        }
        webView.sendJavascript("javascript:webengage.push.onCallbackReceived( 'click', '" + uri + "'," + customData + ");");
        return false;
    }

    @Override
    public void onPushNotificationDismissed(Context context, PushNotificationData notificationData) {

    }

    @Override
    public InAppNotificationData onInAppNotificationPrepared(Context context, InAppNotificationData notificationData) {
        if (inappOptions.get(INAPP_SHOULD_RENDER) != null) {
            notificationData.setShouldRender((Boolean) inappOptions.get(INAPP_SHOULD_RENDER));
        }
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'prepared', " + notificationData.getData() + ");");
        return notificationData;
    }

    @Override
    public void onInAppNotificationShown(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'shown', " + notificationData.getData() + ");");
    }

    @Override
    public void onInAppNotificationDismissed(Context context, InAppNotificationData notificationData) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'dismiss', " + notificationData.getData() + ");");
    }

    @Override
    public boolean onInAppNotificationClicked(Context context, InAppNotificationData notificationData, String actionId) {
        webView.sendJavascript("javascript:webengage.notification.onCallbackReceived( 'click', " + notificationData.getData() + ",'" + actionId + "');");
        return false;
    }

    private static JSONObject bundleToJson(Bundle bundle) {
        if (bundle != null) {
            JSONObject result = new JSONObject();
            for (String key : bundle.keySet()) {
                try {
                    result.put(key, bundle.get(key));
                } catch (JSONException e) {

                }
            }
            return result;
        }
        return null;
    }

    private Object fromJSON(Object obj) throws JSONException {
        if (obj == null || obj == JSONObject.NULL) {
            return null;
        } else if (obj instanceof JSONObject) {
            return toMap((JSONObject) obj);
        } else if (obj instanceof JSONArray) {
            return toList((JSONArray) obj);
        } else if (obj instanceof String) {
            String value = (String) obj;
            if (value.length() == "yyyy-MM-ddTHH:mm:ss.SSSZ".length()) {
                try {
                    SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                    simpleDateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                    return simpleDateFormat.parse(value);
                } catch (Exception e) {
                    return value;
                }
            }
        }
        return obj;
    }

    private Map<String, Object> toMap(JSONObject json) throws JSONException {
        Map<String, Object> map = new HashMap<String, Object>();
        Iterator<String> iterator = json.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            Object value = fromJSON(json.get(key));
            map.put(key, value);
        }
        return map;
    }

    private List<Object> toList(JSONArray jsonArray) throws JSONException {
        List<Object> list = new ArrayList<Object>();
        for (int i = 0; i < jsonArray.length(); i++) {
            Object value = fromJSON(jsonArray.get(i));
            list.add(value);
        }
        return list;
    }

    private static JSONObject mergeJson(JSONObject jsonObject1, JSONObject jsonObject2) throws JSONException {
        for (Iterator<String> it = jsonObject2.keys(); it.hasNext(); ) {
            String key = it.next();
            jsonObject1.put(key, jsonObject2.get(key));
        }
        return jsonObject1;
    }
}