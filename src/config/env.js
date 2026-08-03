export const ENV = {
  // Application config
  HOST_PIN_HASH: import.meta.env.VITE_HOST_PIN_HASH || '',
  HOST_PHONE_ENC: import.meta.env.VITE_HOST_PHONE_ENC || '',

  // Firebase Configuration
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY_ENC ? atob(import.meta.env.VITE_FIREBASE_API_KEY_ENC) : '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
