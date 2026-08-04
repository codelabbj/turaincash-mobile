package com.turnaicash.app;

import android.Manifest;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Demande RECORD_AUDIO côté natif (popup système Android)
 * avant getUserMedia dans le WebView / chatbot vocal.
 */
@CapacitorPlugin(
        name = "MicPermission",
        permissions = {
                @Permission(
                        alias = "microphone",
                        strings = { Manifest.permission.RECORD_AUDIO }
                )
        }
)
public class MicPermissionPlugin extends Plugin {

    @PluginMethod
    public void check(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void request(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("microphone", call, "micPermCallback");
    }

    @PermissionCallback
    private void micPermCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(ret);
    }
}
