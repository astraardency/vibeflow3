package com.astraardency.vibeflow;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.content.SharedPreferences;
import com.getcapacitor.JSArray;

@CapacitorPlugin(name = "NativeAudio")
public class NativeAudioPlugin extends Plugin {

    public static boolean isAppActive = false;
    private BroadcastReceiver receiver;

    @Override
    public void load() {
        super.load();
        isAppActive = true;
        receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (AudioForegroundService.BROADCAST_STATE.equals(action)) {
                    JSObject ret = new JSObject();
                    ret.put("state", intent.getStringExtra("state"));
                    ret.put("isEnded", intent.getBooleanExtra("isEnded", false));
                    ret.put("duration", intent.getIntExtra("duration", 0));
                    notifyListeners("onStateChanged", ret);
                } else if (AudioForegroundService.BROADCAST_PROGRESS.equals(action)) {
                    JSObject ret = new JSObject();
                    ret.put("time", intent.getIntExtra("time", 0));
                    notifyListeners("onProgress", ret);
                } else if (AudioForegroundService.BROADCAST_ENDED.equals(action)) {
                    JSObject ret = new JSObject();
                    notifyListeners("onEnded", ret);
                } else if ("com.astraardency.vibeflow.JS_ACTION_NEXT".equals(action)) {
                    notifyListeners("onNext", new JSObject());
                } else if ("com.astraardency.vibeflow.JS_ACTION_PREV".equals(action)) {
                    notifyListeners("onPrev", new JSObject());
                } else if ("com.astraardency.vibeflow.TRACK_CHANGED".equals(action)) {
                    JSObject ret = new JSObject();
                    ret.put("index", intent.getIntExtra("index", -1));
                    ret.put("id", intent.getStringExtra("id"));
                    notifyListeners("onTrackChanged", ret);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(AudioForegroundService.BROADCAST_STATE);
        filter.addAction(AudioForegroundService.BROADCAST_PROGRESS);
        filter.addAction(AudioForegroundService.BROADCAST_ENDED);
        filter.addAction("com.astraardency.vibeflow.JS_ACTION_NEXT");
        filter.addAction("com.astraardency.vibeflow.JS_ACTION_PREV");
        filter.addAction("com.astraardency.vibeflow.TRACK_CHANGED");
        
        LocalBroadcastManager.getInstance(getContext()).registerReceiver(receiver, filter);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        isAppActive = false;
        if (receiver != null) {
            LocalBroadcastManager.getInstance(getContext()).unregisterReceiver(receiver);
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Unknown Title");
        String artist = call.getString("artist", "Unknown Artist");
        String coverUrl = call.getString("coverUrl", "");

        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_PLAY);
        intent.putExtra("url", url);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("coverUrl", coverUrl);
        getContext().startService(intent);

        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_PAUSE);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        Intent intent = new Intent(getContext(), AudioForegroundService.class);
        intent.setAction(AudioForegroundService.ACTION_RESUME);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        Integer time = call.getInt("time");
        if (time != null) {
            Intent intent = new Intent(getContext(), AudioForegroundService.class);
            intent.setAction(AudioForegroundService.ACTION_SEEK);
            intent.putExtra("position", time);
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume");
        if (volume != null) {
            Intent intent = new Intent(getContext(), AudioForegroundService.class);
            intent.setAction(AudioForegroundService.ACTION_SET_VOLUME);
            intent.putExtra("volume", volume.floatValue());
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        JSArray queue = call.getArray("queue");
        Integer index = call.getInt("index");
        if (queue != null && index != null) {
            SharedPreferences prefs = getContext().getSharedPreferences("AudioQueuePrefs", Context.MODE_PRIVATE);
            prefs.edit()
                 .putString("queue", queue.toString())
                 .putInt("currentIndex", index)
                 .apply();
        }
        call.resolve();
    }
}
