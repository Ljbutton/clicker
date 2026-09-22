import type { CapacitorConfig } from '@capacitor/cli'

// Mobile wrapper config. After `npm run build`, run `npx cap add android` / `npx cap add ios`
// (requires the Android SDK / Xcode on your machine), then `npm run cap:sync` and `npx cap open android`.
const config: CapacitorConfig = {
  appId: 'com.hollowhearth.game',
  appName: 'Clicker',
  webDir: 'dist',
  backgroundColor: '#0b0d14',
  android: { allowMixedContent: false },
  ios: { contentInset: 'never' },
}

export default config
