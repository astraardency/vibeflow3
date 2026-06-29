package com.astraardency.vibeflow;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetPlugin")
public class WidgetPlugin extends Plugin {

    private static WidgetPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String title = call.getString("title", "Unknown Title");
        String artist = call.getString("artist", "Unknown Artist");
        boolean isPlaying = call.getBoolean("isPlaying", false);
        String imageUrl = call.getString("imageUrl", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("title", title);
        editor.putString("artist", artist);
        editor.putBoolean("isPlaying", isPlaying);
        editor.putString("imageUrl", imageUrl);
        editor.apply();

        // Trigger widget update
        MusicWidgetProvider.forceUpdate(context);
        call.resolve();
    }

    public static void handleWidgetAction(String action) {
        if (instance != null) {
            JSObject data = new JSObject();
            if (MusicWidgetProvider.ACTION_PLAY_PAUSE.equals(action)) {
                data.put("action", "togglePlay");
            } else if (MusicWidgetProvider.ACTION_NEXT.equals(action)) {
                data.put("action", "nextTrack");
            } else if (MusicWidgetProvider.ACTION_PREV.equals(action)) {
                data.put("action", "prevTrack");
            }
            instance.notifyListeners("widgetAction", data);
        }
    }
}
