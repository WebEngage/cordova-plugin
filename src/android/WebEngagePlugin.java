package com.webengage.cordova;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.PluginResult;

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
    private static final String TAG = WE_CORE_CONSTANTS.TAG;
    private static CallbackContext eventChannelCallbackContext;

    private Map<String, Object> pushOptions = new HashMap<String, Object>();

    private Map<String, Object> inappOptions = new HashMap<String, Object>();

    private Map<String, Object> globalOptions = new HashMap<String, Object>();
    private static String PENDING_PUSH_URI = null;
    private static JSONObject PENDING_PUSH_CUSTOM_DATA = null;
    private static boolean IS_PUSH_CALLBACK_PENDING = false;

    @Override
    public void onReset() {
        // The page changed; the plugin JS reopens the event channel on the next page load.
        eventChannelCallbackContext = null;
        super.onReset();
    }

    @Override
    public void onSecurityException(Map<String, Object> errorDetails) {
        Logger.e(TAG, "JWT security exception received, notifying JS");
        if (errorDetails != null) {
            JSONObject errorObject = new JSONObject(errorDetails);
            sendJwtEvent(WE_CORE_CONSTANTS.EVENT_EXPIRED, errorObject);
        }
    }

    /** Delivers push/in-app/JWT events to JS over the channel opened by "registerEventChannel". */
    private void dispatchEvent(JSONObject payload) {
        // onReset() can clear the channel from another thread between the check and the send.
        CallbackContext channel = eventChannelCallbackContext;
        if (channel == null) {
            Logger.d(TAG, "Dropping " + payload.optString(WE_CORE_CONSTANTS.CHANNEL) + "/" + payload.optString(WE_CORE_CONSTANTS.TYPE) + " event: no JS event channel registered yet");
            return;
        }
        PluginResult result = new PluginResult(PluginResult.Status.OK, payload);
        result.setKeepCallback(true);
        channel.sendPluginResult(result);
    }

    private void sendPushEvent(String type, String uri, JSONObject data) {
        try {
            JSONObject payload = new JSONObject();
            payload.put(WE_CORE_CONSTANTS.CHANNEL, WE_CORE_CONSTANTS.CHANNEL_PUSH);
            payload.put(WE_CORE_CONSTANTS.TYPE, type);
            // org.json drops null values; keep the 1.3.2 shape ("null" string for uri, JSON null for data).
            payload.put(WE_CORE_CONSTANTS.URI, uri == null ? "null" : uri);
            payload.put(WE_CORE_CONSTANTS.DATA, data == null ? JSONObject.NULL : data);
            dispatchEvent(payload);
        } catch (JSONException e) {
            Logger.e(TAG, "Failed to build push event payload: " + e.getMessage());
        }
    }

    private void sendNotificationEvent(String type, JSONObject data, String actionId) {
        try {
            JSONObject payload = new JSONObject();
            payload.put(WE_CORE_CONSTANTS.CHANNEL, WE_CORE_CONSTANTS.CHANNEL_NOTIFICATION);
            payload.put(WE_CORE_CONSTANTS.TYPE, type);
            payload.put(WE_CORE_CONSTANTS.DATA, data == null ? JSONObject.NULL : data);
            if (actionId != null) {
                payload.put(WE_CORE_CONSTANTS.ACTION_ID, actionId);
            }
            dispatchEvent(payload);
        } catch (JSONException e) {
            Logger.e(TAG, "Failed to build notification event payload: " + e.getMessage());
        }
    }

    private void sendJwtEvent(String type, JSONObject data) {
        try {
            JSONObject payload = new JSONObject();
            payload.put(WE_CORE_CONSTANTS.CHANNEL, WE_CORE_CONSTANTS.CHANNEL_JWT_MANAGER);
            payload.put(WE_CORE_CONSTANTS.TYPE, type);
            payload.put(WE_CORE_CONSTANTS.DATA, data);
            dispatchEvent(payload);
        } catch (JSONException e) {
            Logger.e(TAG, "Failed to build jwtManager event payload: " + e.getMessage());
        }
    }

    @Override
    protected void pluginInitialize() {
        Log.d(TAG, "WebEngagePlugin initialized (cordova-plugin-webengage)");
    }

    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        Logger.v(TAG, "Execute: " + action);

        if (WE_CORE_CONSTANTS.REGISTER_EVENT_CHANNEL.equals(action)) {
            // Internal: keeps this callback open so native can keep sending events to it.
            // Intentionally never calls success()/error().
            eventChannelCallbackContext = callbackContext;
        } else if (WE_CORE_CONSTANTS.ENGAGE.equals(action)) {
            WebEngage.registerPushNotificationCallback(this);
            WebEngage.registerInAppNotificationCallback(this);
            WebEngage.registerWESecurityCallback(this);

            if (args != null && args.length() > 0 && args.get(0) instanceof JSONObject) {
                // Dynamic config
                JSONObject config = args.getJSONObject(0);

                WebEngageConfig.Builder configBuilder = new WebEngageConfig.Builder();
                if (!config.isNull(WE_CORE_CONSTANTS.CONFIG_LICENSE_CODE)) {
                    configBuilder.setWebEngageKey(config.optString(WE_CORE_CONSTANTS.CONFIG_LICENSE_CODE));
                }
                if (!config.isNull(WE_CORE_CONSTANTS.CONFIG_DEBUG)) {
                    configBuilder.setDebugMode(config.optBoolean(WE_CORE_CONSTANTS.CONFIG_DEBUG));
                }

                if (!config.isNull(WE_CORE_CONSTANTS.CONFIG_SMALL_ICON)) {
                    String iconRes = config.optString(WE_CORE_CONSTANTS.CONFIG_SMALL_ICON);
                    if (!iconRes.isEmpty()) {
                        try {
                            String[] iconResSplit = iconRes.split("\\.");
                            String res = iconResSplit[1];
                            String iconName = iconResSplit[2];
                            int resId = cordova.getActivity().getApplicationContext().getResources().getIdentifier(iconName,
                                    res, cordova.getActivity().getApplicationContext().getPackageName());
                            configBuilder.setPushSmallIcon(resId);
                        } catch (Exception e) {
                            Logger.d(TAG, "Provide proper format for smallIcon: R.<res-dir>.<icon-name>");
                        }
                    }
                }
                if (!config.isNull(WE_CORE_CONSTANTS.CONFIG_LARGE_ICON)) {
                    String iconRes = config.optString(WE_CORE_CONSTANTS.CONFIG_LARGE_ICON);
                    if (!iconRes.isEmpty()) {
                        try {
                            String[] iconResSplit = iconRes.split("\\.");
                            String res = iconResSplit[1];
                            String iconName = iconResSplit[2];
                            int resId = cordova.getActivity().getApplicationContext().getResources().getIdentifier(iconName,
                                    res, cordova.getActivity().getApplicationContext().getPackageName());
                            configBuilder.setPushLargeIcon(resId);
                        } catch (Exception e) {
                            Logger.d(TAG, "Provide proper format for largeIcon: R.<res-dir>.<icon-name>");
                        }

                    }
                }

                if (!config.isNull(WE_CORE_CONSTANTS.CONFIG_ANDROID)) {
                    JSONObject androidConfig = config.getJSONObject(WE_CORE_CONSTANTS.CONFIG_ANDROID);
                    if (!androidConfig.isNull(WE_CORE_CONSTANTS.CONFIG_AUTO_PUSH_REGISTER)) {
                        configBuilder.setAutoGCMRegistrationFlag(androidConfig.optBoolean(WE_CORE_CONSTANTS.CONFIG_AUTO_PUSH_REGISTER));
                    }
                    if (!androidConfig.isNull(WE_CORE_CONSTANTS.CONFIG_PUSH_PROJECT_NUMBER)) {
                        configBuilder.setGCMProjectNumber(androidConfig.optString(WE_CORE_CONSTANTS.CONFIG_PUSH_PROJECT_NUMBER));
                    }
                    if(!androidConfig.isNull(WE_CORE_CONSTANTS.CONFIG_AUTO_GAID_TRACKING) && androidConfig.getBoolean(WE_CORE_CONSTANTS.CONFIG_AUTO_GAID_TRACKING) == false) {
                        configBuilder.setAutoGAIDTracking(false);
                    }
                    if (!androidConfig.isNull(WE_CORE_CONSTANTS.CONFIG_LOCATION_TRACKING_STRATEGY)) {
                        if (WE_CORE_CONSTANTS.LOCATION_ACCURACY_BEST.equals(androidConfig.optString(WE_CORE_CONSTANTS.CONFIG_LOCATION_TRACKING_STRATEGY))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_BEST);
                        } else if (WE_CORE_CONSTANTS.LOCATION_ACCURACY_CITY.equals(androidConfig.optString(WE_CORE_CONSTANTS.CONFIG_LOCATION_TRACKING_STRATEGY))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_CITY);
                        } else if (WE_CORE_CONSTANTS.LOCATION_ACCURACY_COUNTRY.equals(androidConfig.optString(WE_CORE_CONSTANTS.CONFIG_LOCATION_TRACKING_STRATEGY))) {
                            configBuilder.setLocationTrackingStrategy(LocationTrackingStrategy.ACCURACY_COUNTRY);
                        } else if (WE_CORE_CONSTANTS.LOCATION_DISABLED.equals(androidConfig.optString(WE_CORE_CONSTANTS.CONFIG_LOCATION_TRACKING_STRATEGY))) {
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
            sendSuccessCallback(callbackContext);
            if (IS_PUSH_CALLBACK_PENDING) {
                IS_PUSH_CALLBACK_PENDING = false;
                sendPushEvent(WE_CORE_CONSTANTS.EVENT_CLICK, PENDING_PUSH_URI, PENDING_PUSH_CUSTOM_DATA);
                PENDING_PUSH_CUSTOM_DATA = null;
                PENDING_PUSH_URI = null;
            }
        } else if (WE_CORE_CONSTANTS.PUSH_OPTIONS.equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                pushOptions.put(args.getString(0), args.get(1));
            }
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.INAPP_OPTIONS.equals(action)) {
            if (args.length() == 2 && !args.isNull(0)) {
                inappOptions.put(args.getString(0), args.get(1));
            }
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.GLOBAL_OPTIONS.equals(action)) {
            Logger.v(TAG, args.getString(0) + " " + args.getString(1));
            if (args.length() == 2 && !args.isNull(0)) {
                globalOptions.put(args.getString(0), args.get(1));
            }
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.TRACK.equals(action)) {
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
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.SET_ATTRIBUTE.equals(action)) {
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
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.SCREEN_NAVIGATED.equals(action)) {
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
            sendSuccessCallback(callbackContext);
        } else if(WE_CORE_CONSTANTS.SEND_FCM_TOKEN.equals(action)){
            if (args.length() > 0 && !args.isNull(0)) {
                String fcmToken = null;
                fcmToken = args.getString(0);
                if (fcmToken != null) {
                    WebEngage.get().setRegistrationID(fcmToken);
                }
            }
            sendSuccessCallback(callbackContext);
        } else if(WE_CORE_CONSTANTS.ON_MESSAGE_RECEIVED.equals(action)) {
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
                    if(map.containsKey(WE_CORE_CONSTANTS.PUSH_SOURCE) && WE_CORE_CONSTANTS.PUSH_SOURCE_WEBENGAGE.equals(map.get(WE_CORE_CONSTANTS.PUSH_SOURCE)) && map.containsKey(WE_CORE_CONSTANTS.PUSH_MESSAGE_DATA)) {
                        WebEngage.get().receive(map);
                    } else {
                        Logger.d(TAG, "onMessageReceived: payload ignored, it is not a WebEngage push (needs source=webengage and message_data)");
                    }
                    sendSuccessCallback(callbackContext);
                } catch (JSONException e) {
                    sendErrorCallback(callbackContext, WE_CORE_CONSTANTS.ERROR_JSON_PARSING + e.getMessage());
                }
            } else {
                sendSuccessCallback(callbackContext);
            }
        } else if (WE_CORE_CONSTANTS.LOGIN.equals(action)) {
            if (args.length() == 1 && args.get(0) instanceof String) {
                WebEngage.get().user().login(args.getString(0));
            } else if (args.length() == 2 && args.get(0) instanceof String && (args.get(1) == null || "null".equals(args.getString(1)))) {
                WebEngage.get().user().login(args.getString(0));
            } else if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof String) {
                WebEngage.get().user().login(args.getString(0), args.getString(1));
            }
            sendSuccessCallback(callbackContext);
        } else if(WE_CORE_CONSTANTS.SET_SECURE_TOKEN.equals(action)) {
            if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof String) {
                WebEngage.get().setSecurityToken(args.getString(0), args.getString(1));
            }
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.LOGOUT.equals(action)) {
            WebEngage.get().user().logout();
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.SET_DEVICE_PUSH_OPT_IN.equals(action)) {
            if (args.length() == 1 && args.get(0) instanceof Boolean) {
                WebEngage.get().user().setDevicePushOptIn(args.getBoolean(0));
            }
            sendSuccessCallback(callbackContext);
        } else if (WE_CORE_CONSTANTS.SET_USER_OPT_IN.equals(action)) {
            if (args.length() == 2 && args.get(0) instanceof String && args.get(1) instanceof Boolean) {
                String channel = args.getString(0);
                boolean status = args.getBoolean(1);
                if (WE_CORE_CONSTANTS.OPT_IN_PUSH.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.PUSH, status);
                } else if (WE_CORE_CONSTANTS.OPT_IN_SMS.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.SMS, status);
                } else if (WE_CORE_CONSTANTS.OPT_IN_EMAIL.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.EMAIL, status);
                } else if (WE_CORE_CONSTANTS.OPT_IN_IN_APP.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.IN_APP, status);
                } else if (WE_CORE_CONSTANTS.OPT_IN_WHATSAPP.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.WHATSAPP, status);
                } else if (WE_CORE_CONSTANTS.OPT_IN_VIBER.equalsIgnoreCase(channel)) {
                    WebEngage.get().user().setOptIn(Channel.VIBER, status);
                }
                else {
                    Logger.e(TAG, "Invalid channel: " + channel + ". Must be one of [push, sms, email, in_app, whatsapp, viber].");
                }
            }
            sendSuccessCallback(callbackContext);
        } else if(WE_CORE_CONSTANTS.SET_LOCATION.equals(action)) {
            if (args.length() == 2) {
                try {
                    double latitude = Double.parseDouble(args.getString(0));
                    double longitude = Double.parseDouble(args.getString(1));
                    WebEngage.get().user().setLocation(latitude, longitude);
                    sendSuccessCallback(callbackContext);
                } catch (NumberFormatException e) {
                    Logger.d(TAG, WE_CORE_CONSTANTS.ERROR_SET_LOCATION_PARSE);
                    sendErrorCallback(callbackContext, WE_CORE_CONSTANTS.ERROR_SET_LOCATION_PARSE);
                }
            } else {
                Logger.d(TAG, WE_CORE_CONSTANTS.ERROR_SET_LOCATION_ARGUMENT_COUNT);
                sendErrorCallback(callbackContext, WE_CORE_CONSTANTS.ERROR_SET_LOCATION_ARGUMENT_COUNT);
            }
        }

        else if(WE_CORE_CONSTANTS.START_GAID_TRACKING.equals(action)){
            WebEngage.get().startGAIDTracking();
            sendSuccessCallback(callbackContext);
        } else {
            // Returning false makes Cordova answer the JS callback with INVALID_ACTION.
            Logger.e(TAG, "Unknown action: " + action);
            return false;
        }

        return true;
    }

    private void filterSystemAndCustomAttributes(String key, Object value, JSONObject customAttr, UserProfile.Builder userProfileBuilder) {
        if (WE_CORE_CONSTANTS.FIRST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setFirstName((String) value);
        } else if (WE_CORE_CONSTANTS.LAST_NAME.equals(key) && value instanceof String) {
            userProfileBuilder.setLastName((String) value);
        } else if (WE_CORE_CONSTANTS.EMAIL.equals(key) && value instanceof String) {
            userProfileBuilder.setEmail((String) value);
        } else if (WE_CORE_CONSTANTS.BIRTH_DATE.equals(key) && value instanceof String) {
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
        } else if (WE_CORE_CONSTANTS.PHONE.equals(key) && value instanceof String) {
            userProfileBuilder.setPhoneNumber((String) value);
        } else if (WE_CORE_CONSTANTS.GENDER.equals(key) && value instanceof String) {
            userProfileBuilder.setGender(Gender.valueByString((String) value));
        } else if (WE_CORE_CONSTANTS.COMPANY.equals(key) && value instanceof String) {
            userProfileBuilder.setCompany((String) value);
        } else if (WE_CORE_CONSTANTS.HASHED_EMAIL.equals(key)) {
            userProfileBuilder.setHashedEmail((String) value);
        } else if (WE_CORE_CONSTANTS.HASHED_PHONE.equals(key)) {
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
        try {
            WebEngage.get().analytics().start(cordova.getActivity());
        } catch (Exception e) {
            Logger.e(TAG, "Activity start was not reported to WebEngage: " + e.getMessage());
        }
        super.onStart();
    }

    @Override
    public void onStop() {
        Logger.d(TAG, "Activity Stop");
        try {
            WebEngage.get().analytics().stop(cordova.getActivity());
        } catch (Exception e) {
            Logger.e(TAG, "Activity stop was not reported to WebEngage: " + e.getMessage());
        }
        super.onStop();
    }

    @Override
    public PushNotificationData onPushNotificationReceived(Context context, PushNotificationData notificationData) {
        // The option values come from JavaScript; a non-boolean value is ignored instead of failing on the SDK thread.
        if (Boolean.TRUE.equals(pushOptions.get(WE_CORE_CONSTANTS.PUSH_SOUND))) {
            notificationData.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
        }
        if (Boolean.TRUE.equals(pushOptions.get(WE_CORE_CONSTANTS.PUSH_VIBRATION))) {
            notificationData.setVibrateFlag(true);
        }
        if (pushOptions.get(WE_CORE_CONSTANTS.PUSH_SHOULD_RENDER) instanceof Boolean) {
            notificationData.setShouldRender((Boolean) pushOptions.get(WE_CORE_CONSTANTS.PUSH_SHOULD_RENDER));
        }
        return notificationData;
    }

    public static void handlePushClick(String uri, Bundle customData) {
        IS_PUSH_CALLBACK_PENDING = true;
        PENDING_PUSH_URI = uri;
        JSONObject data = bundleToJson(customData);
        JSONObject pushPayload = null;
        try {
            if (customData != null && customData.containsKey(WE_CORE_CONSTANTS.PUSH_PAYLOAD)) {
                pushPayload = new JSONObject(customData.getString(WE_CORE_CONSTANTS.PUSH_PAYLOAD));
                data.remove(WE_CORE_CONSTANTS.PUSH_PAYLOAD);
                mergeJson(data, pushPayload);
            }
        } catch (Exception e) {
            Logger.e(TAG, "error merging json");
        }
        PENDING_PUSH_CUSTOM_DATA = data;
        Logger.d(TAG, "handlePushClick invoked");
    }

    @Override
    public void onPushNotificationShown(Context context, PushNotificationData notificationData) {
    }

    @Override
    public boolean onPushNotificationClicked(Context context, PushNotificationData notificationData) {
        try {
            String uri = notificationData.getPrimeCallToAction().getAction();
            JSONObject customData = bundleToJson(notificationData.getCustomData());
            try {
                customData = mergeJson(bundleToJson(notificationData.getCustomData()), notificationData.getPushPayloadJSON());
            } catch (JSONException e) {
                Logger.e(TAG, "Exception while merging push JSON: " + e.getMessage());
            }
            sendPushEvent(WE_CORE_CONSTANTS.EVENT_CLICK, uri, customData);
        } catch (Exception e) {
            Logger.e(TAG, "Push click was not delivered to JS: " + e.getMessage());
        }
        return false;
    }

    @Override
    public boolean onPushNotificationActionClicked(Context context, PushNotificationData notificationData, String buttonID) {
        try {
            String uri = notificationData.getCallToActionById(buttonID).getAction();
            JSONObject customData = bundleToJson(notificationData.getCustomData());
            try {
                customData = mergeJson(bundleToJson(notificationData.getCustomData()), notificationData.getPushPayloadJSON());
            } catch (JSONException e) {
                Logger.e(TAG, "Exception while merging push JSON: " + e.getMessage());
            }
            sendPushEvent(WE_CORE_CONSTANTS.EVENT_CLICK, uri, customData);
        } catch (Exception e) {
            Logger.e(TAG, "Push action click was not delivered to JS: " + e.getMessage());
        }
        return false;
    }

    @Override
    public void onPushNotificationDismissed(Context context, PushNotificationData notificationData) {

    }

    @Override
    public InAppNotificationData onInAppNotificationPrepared(Context context, InAppNotificationData notificationData) {
        if (inappOptions.get(WE_CORE_CONSTANTS.INAPP_SHOULD_RENDER) instanceof Boolean) {
            notificationData.setShouldRender((Boolean) inappOptions.get(WE_CORE_CONSTANTS.INAPP_SHOULD_RENDER));
        }
        try {
            sendNotificationEvent(WE_CORE_CONSTANTS.EVENT_PREPARED, notificationData.getData(), null);
        } catch (Exception e) {
            Logger.e(TAG, "In-app prepared event was not delivered to JS: " + e.getMessage());
        }
        return notificationData;
    }

    @Override
    public void onInAppNotificationShown(Context context, InAppNotificationData notificationData) {
        try {
            sendNotificationEvent(WE_CORE_CONSTANTS.EVENT_SHOWN, notificationData.getData(), null);
        } catch (Exception e) {
            Logger.e(TAG, "In-app shown event was not delivered to JS: " + e.getMessage());
        }
    }

    @Override
    public void onInAppNotificationDismissed(Context context, InAppNotificationData notificationData) {
        try {
            sendNotificationEvent(WE_CORE_CONSTANTS.EVENT_DISMISS, notificationData.getData(), null);
        } catch (Exception e) {
            Logger.e(TAG, "In-app dismiss event was not delivered to JS: " + e.getMessage());
        }
    }

    @Override
    public boolean onInAppNotificationClicked(Context context, InAppNotificationData notificationData, String actionId) {
        // Keep the 1.3.2 value: the string "null" when the SDK passes no action id.
        try {
            sendNotificationEvent(WE_CORE_CONSTANTS.EVENT_CLICK, notificationData.getData(), actionId == null ? "null" : actionId);
        } catch (Exception e) {
            Logger.e(TAG, "In-app click event was not delivered to JS: " + e.getMessage());
        }
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
        if (jsonObject1 == null) {
            jsonObject1 = new JSONObject();
        }
        if (jsonObject2 == null) {
            return jsonObject1;
        }
        for (Iterator<String> it = jsonObject2.keys(); it.hasNext(); ) {
            String key = it.next();
            jsonObject1.put(key, jsonObject2.get(key));
        }
        return jsonObject1;
    }

    // Replies success to the JS caller, with no value.
    private void sendSuccessCallback(CallbackContext callbackContext) {
        callbackContext.success();
    }

    // Replies error to the JS caller with a message.
    private void sendErrorCallback(CallbackContext callbackContext, String message) {
        callbackContext.error(message);
    }
}
