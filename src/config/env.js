export const ENV = {
  // Application config
  HOST_PIN: import.meta.env.VITE_HOST_PIN || '342832',
  
  // API Keys
  YOUTUBE_API_KEY: import.meta.env.VITE_YOUTUBE_API_KEY || '',
  SPOTIFY_API_KEY: import.meta.env.VITE_SPOTIFY_API_KEY || '',
  SPOTIFY_CLIENT_SECRET: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || '',
  
  // Firebase Configuration
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDfzOwFTDT2JELQwKZ-FqLZTUYipU06Zck",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vibeflow-f5cfc.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vibeflow-f5cfc",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vibeflow-f5cfc.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "211660575500",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:211660575500:web:d058abb8cd7bcc339e2f29",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3GC6FG65ZM"
  },

  // Saavn API Endpoints
  SAAVN_ENDPOINTS: [
    import.meta.env.VITE_SAAVN_LOCAL_API || 'http://192.168.137.1:5000/api',
    'https://saavn.dev/api',
    'https://jiosaavn-api-privatecvc2.vercel.app/api',
    'https://saavn.me/api',
    'https://saavn.sumit.co/api'
  ]
};

export default ENV;
