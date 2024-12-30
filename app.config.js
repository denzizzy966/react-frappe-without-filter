const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  "expo": {
    "name": "React Frappe",
    "slug": "changemakers-rn", // Updated to match project slug
    "owner": "denzizzy",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "halosocia.com",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "config": {
        "usesNonExemptEncryption": false
      },
      "bundleIdentifier": IS_DEV ? 'io.changemakers.dev' : 'halosocia.com'
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.denzizzy.reactfrappe",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34,     // Updated for SDK 34
            "targetSdkVersion": 34,      // Updated for SDK 34
            "buildToolsVersion": "34.0.0" // Updated for SDK 34
          },
          "ios": {
            "deploymentTarget": "13.4"
          }
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "07d65df4-d5bd-4826-93d4-46eb637dbad7"
      }
    }
  }
}