// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskly.app',
  appName: 'taskly',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      'firebaseapp.com',
      'googleapis.com',
      'gstatic.com',
      'identitytoolkit.googleapis.com'
    ]
  }
};

export default config;
