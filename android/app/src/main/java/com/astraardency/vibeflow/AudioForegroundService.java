package com.astraardency.vibeflow;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class AudioForegroundService extends Service {
    public static final String CHANNEL_ID = "AudioForegroundServiceChannel_v2";
    public static final String ACTION_PLAY = "ACTION_PLAY";
    public static final String ACTION_PAUSE = "ACTION_PAUSE";
    public static final String ACTION_NEXT = "ACTION_NEXT";
    public static final String ACTION_PREV = "ACTION_PREV";
    public static final String ACTION_TOGGLE = "ACTION_TOGGLE";
    public static final String ACTION_RESUME = "ACTION_RESUME";
    public static final String ACTION_SEEK = "ACTION_SEEK";
    public static final String ACTION_SET_VOLUME = "ACTION_SET_VOLUME";
    
    // Broadcast actions for JS plugin
    public static final String BROADCAST_STATE = "com.astraardency.vibeflow.STATE";
    public static final String BROADCAST_PROGRESS = "com.astraardency.vibeflow.PROGRESS";
    public static final String BROADCAST_ENDED = "com.astraardency.vibeflow.ENDED";
    
    private MediaPlayer mediaPlayer;
    private MediaSessionCompat mediaSession;
    private final IBinder binder = new LocalBinder();
    
    private String currentUrl = "";
    private String currentTitle = "Vibeflow";
    private String currentArtist = "Playing Music";
    private String currentCoverUrl = "";
    private Bitmap currentCoverBitmap = null;

    private void saveCurrentTrack() {
        SharedPreferences prefs = getSharedPreferences("AudioStatePrefs", Context.MODE_PRIVATE);
        prefs.edit()
             .putString("url", currentUrl)
             .putString("title", currentTitle)
             .putString("artist", currentArtist)
             .putString("coverUrl", currentCoverUrl)
             .apply();
    }

    private boolean loadLastTrack() {
        SharedPreferences prefs = getSharedPreferences("AudioStatePrefs", Context.MODE_PRIVATE);
        currentUrl = prefs.getString("url", "");
        currentTitle = prefs.getString("title", "Vibeflow");
        currentArtist = prefs.getString("artist", "Ready to play");
        currentCoverUrl = prefs.getString("coverUrl", "");
        return !currentUrl.isEmpty();
    }

    
    public class LocalBinder extends Binder {
        AudioForegroundService getService() {
            return AudioForegroundService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        mediaSession = new MediaSessionCompat(this, "AudioService");
        mediaSession.setActive(true);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                Intent playIntent = new Intent(AudioForegroundService.this, AudioForegroundService.class).setAction(ACTION_TOGGLE);
                startService(playIntent);
            }

            @Override
            public void onPause() {
                Intent pauseIntent = new Intent(AudioForegroundService.this, AudioForegroundService.class).setAction(ACTION_TOGGLE);
                startService(pauseIntent);
            }

            @Override
            public void onSkipToNext() {
                Intent nextIntent = new Intent(AudioForegroundService.this, AudioForegroundService.class).setAction(ACTION_NEXT);
                startService(nextIntent);
            }

            @Override
            public void onSkipToPrevious() {
                Intent prevIntent = new Intent(AudioForegroundService.this, AudioForegroundService.class).setAction(ACTION_PREV);
                startService(prevIntent);
            }
        });
        initMediaPlayer();
    }
    
    private void initMediaPlayer() {
        if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            );
            mediaPlayer.setOnCompletionListener(mp -> {
                if (NativeAudioPlugin.isAppActive) {
                    sendStateBroadcast("ended", true);
                    Intent intent = new Intent(BROADCAST_ENDED);
                    LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
                    
                    // Fallback to native auto-play next if JS is suspended (e.g. phone locked)
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                         if (!mediaPlayer.isPlaying()) {
                              playNextNative();
                         }
                    }, 1000);
                } else {
                    playNextNative();
                }
            });
            mediaPlayer.setOnPreparedListener(mp -> {
                mp.start();
                updateNotification();
                updateMediaSessionState();
                updateWidget();
                sendStateBroadcast("playing", false);
                startProgressUpdate();
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                if (!NativeAudioPlugin.isAppActive) {
                    playNextNative();
                }
                return true;
            });
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String action = intent.getAction();
            switch (action) {
                case ACTION_PLAY:
                    String url = intent.getStringExtra("url");
                    if (url != null && !url.equals(currentUrl)) {
                        currentUrl = url;
                        currentTitle = intent.getStringExtra("title");
                        if (currentTitle == null) currentTitle = "Vibeflow";
                        currentArtist = intent.getStringExtra("artist");
                        if (currentArtist == null) currentArtist = "Playing Music";
                        currentCoverUrl = intent.getStringExtra("coverUrl");
                        
                        saveCurrentTrack();
                        loadCoverAndPlay();
                    } else if (url != null && url.equals(currentUrl)) {
                        if (!mediaPlayer.isPlaying()) {
                            mediaPlayer.start();
                            updateNotification();
                            updateMediaSessionState();
                            updateWidget();
                            sendStateBroadcast("playing", false);
                        }
                    }
                    break;
                case ACTION_PAUSE:
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.pause();
                        updateNotification();
                        updateMediaSessionState();
                        updateWidget();
                        sendStateBroadcast("paused", false);
                    }
                    break;
                case ACTION_RESUME:
                    if (mediaPlayer != null && !mediaPlayer.isPlaying()) {
                        if (currentUrl.isEmpty()) {
                            if (loadLastTrack()) {
                                loadCoverAndPlay();
                                break;
                            }
                        }
                        if (!currentUrl.isEmpty()) {
                            mediaPlayer.start();
                            updateNotification();
                            updateMediaSessionState();
                            updateWidget();
                            sendStateBroadcast("playing", false);
                        }
                    }
                    break;
                case ACTION_TOGGLE:
                    if (currentUrl.isEmpty()) {
                        if (loadLastTrack()) {
                            loadCoverAndPlay();
                            break;
                        }
                    }
                    if (mediaPlayer.isPlaying()) {
                        mediaPlayer.pause();
                        updateNotification();
                        updateMediaSessionState();
                        updateWidget();
                        sendStateBroadcast("paused", false);
                    } else {
                        if (currentUrl.isEmpty()) break;
                        mediaPlayer.start();
                        updateNotification();
                        updateMediaSessionState();
                        updateWidget();
                        sendStateBroadcast("playing", false);
                    }
                    break;
                case ACTION_SEEK:
                    int position = intent.getIntExtra("position", 0);
                    if (mediaPlayer != null) {
                        mediaPlayer.seekTo(position * 1000);
                    }
                    break;
                case ACTION_SET_VOLUME:
                    float volume = intent.getFloatExtra("volume", 1.0f);
                    if (mediaPlayer != null) {
                        mediaPlayer.setVolume(volume, volume);
                    }
                    break;
                case ACTION_NEXT:
                    if (NativeAudioPlugin.isAppActive) {
                        Intent nextIntent = new Intent("com.astraardency.vibeflow.JS_ACTION_NEXT");
                        LocalBroadcastManager.getInstance(this).sendBroadcast(nextIntent);
                    } else {
                        playNextNative();
                    }
                    break;
                case ACTION_PREV:
                    if (NativeAudioPlugin.isAppActive) {
                        Intent prevIntent = new Intent("com.astraardency.vibeflow.JS_ACTION_PREV");
                        LocalBroadcastManager.getInstance(this).sendBroadcast(prevIntent);
                    } else {
                        playPrevNative();
                    }
                    break;
            }
        }
        
        // Ensure service starts in foreground
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, buildNotification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(1, buildNotification());
        }
        return START_STICKY;
    }

    private void loadCoverAndPlay() {
        new Thread(() -> {
            try {
                if (currentCoverUrl != null && !currentCoverUrl.isEmpty()) {
                    URL url = new URL(currentCoverUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.setDoInput(true);
                    connection.connect();
                    InputStream input = connection.getInputStream();
                    currentCoverBitmap = BitmapFactory.decodeStream(input);
                } else {
                    currentCoverBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
                }
            } catch (IOException e) {
                currentCoverBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            }
            
            updateMediaSessionState();

            try {
                mediaPlayer.reset();
                if (currentUrl != null && !currentUrl.isEmpty()) {
                    mediaPlayer.setDataSource(currentUrl);
                    mediaPlayer.prepareAsync();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private void playNextNative() {
        SharedPreferences prefs = getSharedPreferences("AudioQueuePrefs", Context.MODE_PRIVATE);
        String queueJson = prefs.getString("queue", null);
        int currentIndex = prefs.getInt("currentIndex", -1);
        if (queueJson != null && currentIndex != -1) {
            try {
                org.json.JSONArray queue = new org.json.JSONArray(queueJson);
                if (queue.length() > 0) {
                    int nextIndex = (currentIndex + 1) % queue.length();
                    playNativeTrackFromQueue(queue, nextIndex, prefs);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void playPrevNative() {
        SharedPreferences prefs = getSharedPreferences("AudioQueuePrefs", Context.MODE_PRIVATE);
        String queueJson = prefs.getString("queue", null);
        int currentIndex = prefs.getInt("currentIndex", -1);
        if (queueJson != null && currentIndex != -1) {
            try {
                org.json.JSONArray queue = new org.json.JSONArray(queueJson);
                if (queue.length() > 0) {
                    int prevIndex = currentIndex - 1;
                    if (prevIndex < 0) prevIndex = queue.length() - 1;
                    playNativeTrackFromQueue(queue, prevIndex, prefs);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    private void playNativeTrackFromQueue(org.json.JSONArray queue, int startingIndex, SharedPreferences prefs) {
        new Thread(() -> {
            try {
                int index = startingIndex;
                int originalIndex = index;
                org.json.JSONObject track = null;
                String audioUrl = "";
                String id = "";
                
                while (queue.length() > 0) {
                    track = queue.getJSONObject(index);
                    audioUrl = track.optString("audioUrl", "");
                    id = track.optString("id", "");
                    
                    if (audioUrl.isEmpty() || audioUrl.contains("audio_url_") || audioUrl.contains("placeholder_url")) {
                        try {
                            // Try direct ID fetch first if ID looks valid
                            if (id != null && id.length() > 5 && !id.contains("dummy") && !id.startsWith("song_")) {
                                URL url = new URL("https://saavn.sumit.co/api/songs/" + id);
                                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                                conn.setRequestMethod("GET");
                                InputStream in = conn.getInputStream();
                                java.util.Scanner scanner = new java.util.Scanner(in).useDelimiter("\\A");
                                String response = scanner.hasNext() ? scanner.next() : "";
                                org.json.JSONObject json = new org.json.JSONObject(response);
                                if (json.optBoolean("success")) {
                                    org.json.JSONArray data = json.optJSONArray("data");
                                    if (data != null && data.length() > 0) {
                                        org.json.JSONObject songData = data.getJSONObject(0);
                                        org.json.JSONArray downloadUrlArray = songData.optJSONArray("downloadUrl");
                                        if (downloadUrlArray != null && downloadUrlArray.length() > 0) {
                                            for (int i = 0; i < downloadUrlArray.length(); i++) {
                                                org.json.JSONObject dl = downloadUrlArray.getJSONObject(i);
                                                if ("160kbps".equals(dl.optString("quality")) || "320kbps".equals(dl.optString("quality"))) {
                                                    audioUrl = dl.optString("url", dl.optString("link", ""));
                                                    break;
                                                }
                                            }
                                            if (audioUrl.isEmpty()) {
                                                org.json.JSONObject lastDl = downloadUrlArray.getJSONObject(downloadUrlArray.length() - 1);
                                                audioUrl = lastDl.optString("url", lastDl.optString("link", ""));
                                            }
                                        }
                                        org.json.JSONArray imageArray = songData.optJSONArray("image");
                                        if (imageArray != null && imageArray.length() > 0) {
                                            org.json.JSONObject imgObj = imageArray.getJSONObject(imageArray.length() - 1);
                                            String newImg = imgObj.optString("url", imgObj.optString("link", ""));
                                            if (!newImg.isEmpty() && track.optString("img", "").contains("placeholder_url")) {
                                                track.put("img", newImg);
                                            }
                                        }
                                    }
                                }
                            }

                            // If audioUrl is still empty, fallback to search by title and artist
                            if (audioUrl.isEmpty() || audioUrl.contains("audio_url_") || audioUrl.contains("placeholder_url")) {
                                String cleanTitle = track.optString("title", "").replaceAll("(?i)\\s*\\(from [^)]+\\)\\s*", "").replaceAll("(?i)\\s*- From .*", "").trim();
                                String primaryArtist = track.optString("artist", "").split(",")[0].trim();
                                String query = cleanTitle + " " + primaryArtist;
                                URL url = new URL("https://saavn.sumit.co/api/search/songs?query=" + java.net.URLEncoder.encode(query, "UTF-8") + "&limit=3");
                                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                                conn.setRequestMethod("GET");
                                InputStream in = conn.getInputStream();
                                java.util.Scanner scanner = new java.util.Scanner(in).useDelimiter("\\A");
                                String response = scanner.hasNext() ? scanner.next() : "";
                                org.json.JSONObject json = new org.json.JSONObject(response);
                                if (json.optBoolean("success")) {
                                    org.json.JSONObject data = json.optJSONObject("data");
                                    if (data != null) {
                                        org.json.JSONArray results = data.optJSONArray("results");
                                        if (results != null && results.length() > 0) {
                                            org.json.JSONObject songData = null;
                                            String primaryArtistLower = primaryArtist.toLowerCase();
                                            for (int j = 0; j < results.length(); j++) {
                                                org.json.JSONObject tempSong = results.getJSONObject(j);
                                                String resultArtist = tempSong.optString("artist", "").toLowerCase();
                                                String resultPrimaryArtists = tempSong.optString("primaryArtists", "").toLowerCase();
                                                if (resultArtist.contains(primaryArtistLower) || resultPrimaryArtists.contains(primaryArtistLower) || primaryArtistLower.isEmpty()) {
                                                    songData = tempSong;
                                                    break;
                                                }
                                            }
                                            if (songData == null) {
                                                songData = results.getJSONObject(0); // fallback to first if no artist matches
                                            }
                                            org.json.JSONArray downloadUrlArray = songData.optJSONArray("downloadUrl");
                                            if (downloadUrlArray != null && downloadUrlArray.length() > 0) {
                                                for (int i = 0; i < downloadUrlArray.length(); i++) {
                                                    org.json.JSONObject dl = downloadUrlArray.getJSONObject(i);
                                                    if ("160kbps".equals(dl.optString("quality")) || "320kbps".equals(dl.optString("quality"))) {
                                                        audioUrl = dl.optString("url", dl.optString("link", ""));
                                                        break;
                                                    }
                                                }
                                                if (audioUrl.isEmpty()) {
                                                    org.json.JSONObject lastDl = downloadUrlArray.getJSONObject(downloadUrlArray.length() - 1);
                                                    audioUrl = lastDl.optString("url", lastDl.optString("link", ""));
                                                }
                                            }
                                            org.json.JSONArray imageArray = songData.optJSONArray("image");
                                            if (imageArray != null && imageArray.length() > 0) {
                                                org.json.JSONObject imgObj = imageArray.getJSONObject(imageArray.length() - 1);
                                                String newImg = imgObj.optString("url", imgObj.optString("link", ""));
                                                if (!newImg.isEmpty() && track.optString("img", "").contains("placeholder_url")) {
                                                    track.put("img", newImg);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }

                    if (!audioUrl.isEmpty() && !audioUrl.contains("audio_url_") && !audioUrl.contains("placeholder_url")) {
                        break;
                    }

                    index = (index + 1) % queue.length();
                    if (index == originalIndex) break; // Tried all songs, none resolved
                }

                prefs.edit().putInt("currentIndex", index).apply();

                currentUrl = audioUrl;
                currentTitle = track.optString("title", "Vibeflow");
                currentArtist = track.optString("artist", "Playing Music");
                currentCoverUrl = track.optString("img", track.optString("coverUrl", ""));

                saveCurrentTrack();
                loadCoverAndPlay();
                
                if (NativeAudioPlugin.isAppActive) {
                    Intent trackChangedIntent = new Intent("com.astraardency.vibeflow.TRACK_CHANGED");
                    trackChangedIntent.putExtra("index", index);
                    trackChangedIntent.putExtra("id", id);
                    LocalBroadcastManager.getInstance(AudioForegroundService.this).sendBroadcast(trackChangedIntent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }

    private Notification buildNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent playIntent = new Intent(this, AudioForegroundService.class).setAction(ACTION_TOGGLE);
        PendingIntent pPlayIntent = PendingIntent.getService(this, 0, playIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent nextIntent = new Intent(this, AudioForegroundService.class).setAction(ACTION_NEXT);
        PendingIntent pNextIntent = PendingIntent.getService(this, 0, nextIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent prevIntent = new Intent(this, AudioForegroundService.class).setAction(ACTION_PREV);
        PendingIntent pPrevIntent = PendingIntent.getService(this, 0, prevIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        boolean isPlaying = mediaPlayer != null && mediaPlayer.isPlaying();
        int playPauseIcon = isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(currentTitle)
                .setContentText(currentArtist)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setLargeIcon(currentCoverBitmap)
                .setContentIntent(pendingIntent)
                .addAction(android.R.drawable.ic_media_previous, "Previous", pPrevIntent)
                .addAction(playPauseIcon, "Play/Pause", pPlayIntent)
                .addAction(android.R.drawable.ic_media_next, "Next", pNextIntent)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2)
                        .setMediaSession(mediaSession.getSessionToken()))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setOnlyAlertOnce(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        return builder.build();
    }

    private void updateMediaSessionState() {
        if (mediaSession == null) return;
        
        MediaMetadataCompat.Builder metadataBuilder = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist);
        
        if (currentCoverBitmap != null) {
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentCoverBitmap);
        }
        mediaSession.setMetadata(metadataBuilder.build());

        int state = (mediaPlayer != null && mediaPlayer.isPlaying()) ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        long position = mediaPlayer != null ? mediaPlayer.getCurrentPosition() : PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN;
        
        mediaSession.setPlaybackState(new PlaybackStateCompat.Builder()
                .setState(state, position, 1.0f)
                .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE |
                            PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                .build());
    }

    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(1, buildNotification());
        }
    }
    
    private void updateWidget() {
        SharedPreferences prefs = getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        prefs.edit()
             .putString("title", currentTitle)
             .putString("artist", currentArtist)
             .putBoolean("isPlaying", mediaPlayer.isPlaying())
             .apply();
        MusicWidgetProvider.forceUpdate(this);
    }
    
    private void sendStateBroadcast(String state, boolean isEnded) {
        Intent intent = new Intent(BROADCAST_STATE);
        intent.putExtra("state", state);
        intent.putExtra("isEnded", isEnded);
        intent.putExtra("duration", mediaPlayer != null ? mediaPlayer.getDuration() / 1000 : 0);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }
    
    private void startProgressUpdate() {
        new Thread(() -> {
            while (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    Intent intent = new Intent(BROADCAST_PROGRESS);
                    intent.putExtra("time", mediaPlayer.getCurrentPosition() / 1000);
                    LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
                }
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    break;
                }
            }
        }).start();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Background Audio Service",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (mediaSession != null) {
            mediaSession.release();
        }
    }
}
