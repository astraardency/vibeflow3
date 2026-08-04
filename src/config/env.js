export const ENV = {
  // Application config
  HOST_PIN_HASH: import.meta.env.VITE_HOST_PIN_HASH || '',
  HOST_PHONE_ENC: import.meta.env.VITE_HOST_PHONE_ENC ? atob(import.meta.env.VITE_HOST_PHONE_ENC) : (import.meta.env.VITE_HOST_PHONE || ''),
  GOOGLE_CLIENT_ID_ENC: import.meta.env.VITE_GOOGLE_CLIENT_ID_ENC ? atob(import.meta.env.VITE_GOOGLE_CLIENT_ID_ENC) : (import.meta.env.VITE_GOOGLE_CLIENT_ID || ''),

  // Firebase Configuration
  FIREBASE: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY_ENC ? atob(import.meta.env.VITE_FIREBASE_API_KEY_ENC) : '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_ENC ? atob(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_ENC) : '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_PROJECT_ID_ENC) : '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_ENC ? atob(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_ENC) : '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_ENC) : '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_APP_ID_ENC) : '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_ENC ? atob(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_ENC) : ''
  },

  // Saavn API Endpoints
  SAAVN_ENDPOINTS: [
    import.meta.env.VITE_SAAVN_LOCAL_API || 'http://192.168.137.1:5000/api',
    import.meta.env.VITE_SAAVN_API_PRIMARY_ENC ? atob(import.meta.env.VITE_SAAVN_API_PRIMARY_ENC) : 'https://saavn.dev/api',
    import.meta.env.VITE_SAAVN_API_SECONDARY_ENC ? atob(import.meta.env.VITE_SAAVN_API_SECONDARY_ENC) : 'https://jiosaavn-api-privatecvc2.vercel.app/api',
    'https://saavn.me/api',
    'https://saavn.sumit.co/api'
  ]
};

export default ENV;
