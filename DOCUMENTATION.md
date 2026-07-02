# Vibeflow - Music Streaming Application

Vibeflow is a modern, cross-platform music streaming application designed for seamless listening experiences across web and mobile platforms. Built primarily with React and Capacitor, it features a rich user interface, powerful backend integration, and unique social listening features.

## 🚀 Key Features

- **Music Playback & Search**: Integration with JioSaavn (via custom API wrappers) for fetching Tamil and global music, searching songs, and retrieving high-quality audio streams.
- **Cross-Platform Support**: Built as a web application (Vite + React) that seamlessly runs as a native Android app using Capacitor.
- **Live Connect & Device Connect**: Unique features that allow users to sync music playback across multiple devices or listen together in a live session.
- **Offline Mode**: Ability to download songs for offline playback, with automatic offline detection.
- **User Authentication**: Google Sign-In and user data synchronization powered by Firebase.
- **Custom Playlists**: Users can create, edit, and manage their own playlists, stored securely in Firestore.
- **Audio Equalizer & Visualizer**: Built-in 5-band EQ and an audio visualizer using the Web Audio API.
- **Theme Support**: Seamless switching between Light and Dark modes.

## 🛠 Tech Stack

- **Frontend Framework**: React 19 + Vite
- **Mobile Runtime**: Capacitor (for Android packaging)
- **Backend / Database**: Firebase (Firestore for database, Firebase Auth for user management)
- **Styling**: Vanilla CSS with CSS Variables for theming
- **Icons**: Lucide React
- **Audio API**: HTML5 Audio API & Web Audio API (for visualizer/EQ) combined with Capacitor Media Session for native media controls.

## 📂 Project Structure

```
e:\web\
├── android/               # Native Android Capacitor project files
├── src/                   # React source code
│   ├── assets/            # Static assets (images, icons)
│   ├── components/        # Reusable React components (Player, Lists, Modals, etc.)
│   ├── containers/        # Page-level components
│   ├── contexts/          # React Contexts for global state management
│   ├── data/              # Static data / constants
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API & Integration logic (Firebase, Saavn API)
│   ├── utils/             # Helper functions (Player utilities, etc.)
│   ├── App.jsx            # Main Application Component (Routing, Global States, Audio logic)
│   └── index.css          # Global CSS & CSS Variables for theming
├── capacitor.config.json  # Capacitor configuration
├── package.json           # NPM dependencies and scripts
└── vite.config.js         # Vite bundler configuration
```

## 🧠 Core Architecture

### State Management
The application relies heavily on React Context API to manage complex global states without prop drilling:
- **`AuthContext`**: Manages the current user, listening activity, liked songs, and user preferences (like theme).
- **`PlayerContext`**: The heart of the app. Manages the audio element (`audioRef`), current track, playback queue, shuffle state, and playing status.
- **`DeviceConnectContext` & `LiveConnectContext`**: Handle real-time multi-device synchronization and peer-to-peer listening sessions.
- **`PlaylistContext`**: Manages the user's custom playlists and interactions.

### Audio Playback
Vibeflow uses a hybrid approach for audio playback:
1. **Web**: Standard HTML5 `<audio>` element enhanced with Web Audio API for Equalizer and Visualizations.
2. **Native (Capacitor)**: Integrates with `@jofr/capacitor-media-session` and custom native plugins (`NativeAudio`) to control lock-screen media controls and background playback on Android.
3. **Stream Resolution**: The `saavn.js` service intercepts local track requests and resolves the best playable stream (up to 320kbps) via the Saavn API.

### Caching and Performance
- Caching is heavily utilized in `saavn.js` to avoid redundant API calls. Both in-memory `Map` and `sessionStorage` are used to cache search queries, song details, and stream URLs.
- The user's active playback queue and preferences are persisted to `localStorage` to resume playback effortlessly across sessions.

## 🔗 Integrations

### Firebase
- **Firestore**: Used for storing global playlists (`playlists` collection) and user-specific data (`users` collection).
- **Authentication**: Handles Google Auth sign-in flows.

### Saavn API Service
The `saavn.js` wrapper interfaces with external APIs to:
- Fetch songs and playlists.
- Decodes HTML entities from API responses.
- Uses a fallback mechanism between different API endpoints to ensure high availability.

## 📱 Mobile Specifics
Vibeflow is optimized for mobile:
- Listens to device touch events for custom floating mini-player interactions.
- Detects `navigator.onLine` to switch into offline mode gracefully.
- Integrates Capacitor plugins for barcode scanning, filesystem access (for downloads), and native audio handling.

## 🚀 Running the App

### Web (Development)
```bash
npm install
npm run dev
```

### Build for Production (Web)
```bash
npm run build
```

### Android (Capacitor)
Ensure you have Android Studio installed, then run:
```bash
npm run build
npx cap sync android
npx cap open android
```
*(You can also use the custom `build_mobile.ps1` script for automated builds if applicable).*
