import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.learningyoutube.app',
  appName: '러닝유튜브',
  webDir: 'public', // Point to public as a safe fallback
  server: {
    url: 'http://115.86.126.82:3000',
    cleartext: true
  }
};

export default config;
