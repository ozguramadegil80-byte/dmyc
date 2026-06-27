const mapsKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  name: 'DMyC',
  slug: 'dmyc',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0D1515',
  },
  ios: {
    supportsTablet: true,
    icon: './assets/ios-icon.png',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'DMyC otomatik yolculuk algısı için konumunu kullanır.',
    },
  },
  android: {
    package: 'com.oxgurunal.dmyc',
    config: {
      googleMaps: { apiKey: mapsKey },
    },
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B1015',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'DMyC otomatik yolculuk algısı için konumunu kullanır.',
      },
    ],
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: mapsKey },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#0D1515',
        sounds: [],
      },
    ],
  ],
  extra: {
    eas: { projectId: '17ef6b8f-edce-468b-ab75-58f16c17f406' },
  },
  owner: 'oxgurunal',
};
