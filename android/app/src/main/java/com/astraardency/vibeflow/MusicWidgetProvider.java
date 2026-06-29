package com.astraardency.vibeflow;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MusicWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_PLAY_PAUSE = "com.astraardency.vibeflow.WIDGET_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.astraardency.vibeflow.WIDGET_NEXT";
    public static final String ACTION_PREV = "com.astraardency.vibeflow.WIDGET_PREV";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        String title = prefs.getString("title", "Vibeflow");
        String artist = prefs.getString("artist", "Ready to play");
        boolean isPlaying = prefs.getBoolean("isPlaying", false);
        String imageUrl = prefs.getString("imageUrl", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music);
        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_artist, artist);

        if (isPlaying) {
            views.setImageViewResource(R.id.btn_play_pause, android.R.drawable.ic_media_pause);
        } else {
            views.setImageViewResource(R.id.btn_play_pause, android.R.drawable.ic_media_play);
        }

        views.setOnClickPendingIntent(R.id.btn_play_pause, getPendingIntent(context, ACTION_PLAY_PAUSE));
        views.setOnClickPendingIntent(R.id.btn_next, getPendingIntent(context, ACTION_NEXT));
        views.setOnClickPendingIntent(R.id.btn_prev, getPendingIntent(context, ACTION_PREV));

        // Tapping the widget body opens the app
        Intent appIntent = new Intent(context, MainActivity.class);
        PendingIntent appPendingIntent = PendingIntent.getActivity(context, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_album_art, appPendingIntent);

        // Immediate update with text/buttons
        appWidgetManager.updateAppWidget(appWidgetId, views);

        // Fetch image asynchronously and update again
        if (imageUrl != null && !imageUrl.isEmpty()) {
            new Thread(() -> {
                try {
                    java.net.URL url = new java.net.URL(imageUrl);
                    android.graphics.Bitmap bmp = android.graphics.BitmapFactory.decodeStream(url.openConnection().getInputStream());
                    if (bmp != null) {
                        views.setImageViewBitmap(R.id.widget_album_art, bmp);
                        appWidgetManager.updateAppWidget(appWidgetId, views);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        } else {
            views.setImageViewResource(R.id.widget_album_art, R.mipmap.ic_launcher);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static PendingIntent getPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MusicWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action != null) {
            Intent serviceIntent = new Intent(context, AudioForegroundService.class);
            if (ACTION_PLAY_PAUSE.equals(action)) {
                serviceIntent.setAction(AudioForegroundService.ACTION_TOGGLE);
                androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
            } else if (ACTION_NEXT.equals(action)) {
                serviceIntent.setAction(AudioForegroundService.ACTION_NEXT);
                androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
            } else if (ACTION_PREV.equals(action)) {
                serviceIntent.setAction(AudioForegroundService.ACTION_PREV);
                androidx.core.content.ContextCompat.startForegroundService(context, serviceIntent);
            }
        }
    }

    public static void forceUpdate(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, MusicWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
