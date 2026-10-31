import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'fittracker-2e209',
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDvVKAYL3ZAE3W10dKT4DD8J9pHKtVG8zc',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'fittracker-2e209.firebaseapp.com',
    serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT || process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  auth: {
    apiKeySecret: process.env.FITTRACK_API_KEY_SECRET || 'fittrack_secret_key_2026',
    defaultDevUserId: process.env.FITTRACK_DEV_USER_ID || 'default_user',
  },
};
