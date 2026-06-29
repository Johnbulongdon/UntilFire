# UntilFire Android — Setup Guide

## 1. Open in Android Studio

1. Open Android Studio (Hedgehog or newer)
2. File → Open → select the `android/` folder in this repo
3. Click **Sync Project with Gradle Files** (elephant icon in toolbar)
4. Wait for Gradle sync to complete

## 2. Generate a signing keystore

Run this in your terminal (replace values as needed):

```bash
keytool -genkeypair \
  -alias untilfire \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -keystore app/keystore.jks \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=UntilFire, O=UntilFire, C=US"
```

> Keep `keystore.jks` and both passwords safe — you need them for every future update.
> The keystore is in `.gitignore` and will NOT be committed.

## 3. Get the SHA-256 fingerprint

```bash
keytool -list -v -keystore app/keystore.jks -alias untilfire
```

Copy the **SHA-256** line (format: `AA:BB:CC:...`).

## 4. Update assetlinks.json

In the web repo, open `public/.well-known/assetlinks.json` and replace:

```
REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT
```

with your actual SHA-256 fingerprint (keep the colons, remove spaces).
Then deploy the web app so the file is live at `https://untilfire.com/.well-known/assetlinks.json`.

## 5. Uncomment signing in app/build.gradle

In `app/build.gradle`, update the `signingConfigs.release` block:

```gradle
signingConfigs {
    release {
        storeFile     file('keystore.jks')
        storePassword "YOUR_STORE_PASSWORD"
        keyAlias      "untilfire"
        keyPassword   "YOUR_KEY_PASSWORD"
    }
}
```

Then uncomment `signingConfig signingConfigs.release` in the `buildTypes.release` block.

## 6. Build the signed AAB

In Android Studio:
- **Build → Generate Signed Bundle / APK**
- Choose **Android App Bundle**
- Select your keystore file and enter passwords
- Choose **release** build variant
- Click **Finish**

The `.aab` file will be at `app/release/app-release.aab`.

## 7. Upload to Google Play

1. Go to play.google.com/console
2. Create app → Finance category
3. Internal Testing → Create release → Upload the `.aab`
4. Test on a real Android device
5. Promote to Production when ready
