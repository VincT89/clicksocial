import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.sodanoconsulting.clicksocial',
  appName: 'ClickSocial',
  webDir: 'dist-mobile',
  server: { hostname: 'localhost', androidScheme: 'https' },
  android: { allowMixedContent: false },
  plugins: {
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
  },
};
export default config;
