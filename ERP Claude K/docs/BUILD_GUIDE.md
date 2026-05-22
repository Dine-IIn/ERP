# 📱 Platform-Specific Build Guide

Complete guide for building and distributing the Enterprise ERP app on all platforms.

---

## 📋 Table of Contents

1. [Windows Desktop](#windows-desktop)
2. [Android](#android)
3. [iOS](#ios)
4. [macOS](#macos)
5. [Build Scripts](#build-scripts)
6. [App Signing](#app-signing)
7. [Distribution](#distribution)

---

## 🪟 Windows Desktop

### Prerequisites
- Windows 10 version 1809 or higher
- Visual Studio 2022 with Desktop development workload
- Windows 10 SDK
- Flutter 3.0+

### Setup

#### 1. Enable Windows Desktop Support
```bash
flutter config --enable-windows-desktop
```

#### 2. Verify Setup
```bash
flutter doctor
```

Should show:
```
[✓] Windows Platform

### Build Commands

#### Development Build
```bash
cd frontend
flutter run -d windows
```

#### Release Build
```bash
flutter build windows --release
```

Output location: `build/windows/runner/Release/`

### Creating Windows Installer

#### Using Inno Setup (Recommended)

1. **Install Inno Setup**
   - Download from: https://jwesoft.com/innosetup
   - Install with default settings

2. **Create Installer Script** (`setup.iss`)
```inno
[Setup]
AppName=Enterprise ERP
AppVersion=1.0.0
DefaultDirName={pf}\EnterpriseERP
DefaultGroupName=Enterprise ERP
OutputDir=installers
OutputBaseFilename=EnterpriseERP_Setup_v1.0.0
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64

[Files]
Source: "build\windows\runner\Release\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Enterprise ERP"; Filename: "{app}\enterprise_erp.exe"
Name: "{commondesktop}\Enterprise ERP"; Filename: "{app}\enterprise_erp.exe"

[Run]
Filename: "{app}\enterprise_erp.exe"; Description: "Launch Enterprise ERP"; Flags: nowait postinstall skipifsilent
```

3. **Build Installer**
```bash
# Compile with Inno Setup
iscc setup.iss
```

#### Using MSIX (Microsoft Store)

1. **Add MSIX Configuration**

Edit `windows/runner/Resources/AppxManifest.xml`

2. **Build MSIX Package**
```bash
flutter build windows --release
flutter pub run msix:create
```

### Windows App Certification
For Microsoft Store submission:
1. Run Windows App Certification Kit
2. Fix any compliance issues
3. Submit via Partner Center

---

## 🤖 Android

### Prerequisites
- Android Studio
- Android SDK (API 21+)
- Java JDK 11+
- Flutter 3.0+

### Setup

#### 1. Configure Signing

Create `android/key.properties`:
```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=upload
storeFile=/path/to/upload-keystore.jks
```

#### 2. Generate Keystore
```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

#### 3. Update build.gradle

Edit `android/app/build.gradle`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Build Commands

#### APK (For Direct Distribution)
```bash
flutter build apk --release

# Split by ABI (smaller files)
flutter build apk --split-per-abi --release
```

Output: `build/app/outputs/flutter-apk/`

#### App Bundle (For Play Store)
```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

#### Debug Build
```bash
flutter build apk --debug
```

### Testing on Device
```bash
# Install on connected device
flutter install

# Or run directly
flutter run --release
```

### Google Play Store Submission

1. **Create App Listing**
   - Go to Google Play Console
   - Create new app
   - Fill in store listing details

2. **Upload App Bundle**
   - Go to Release > Production
   - Upload `app-release.aab`
   - Complete release notes

3. **Content Rating**
   - Fill out content questionnaire
   - Get rating certificate

4. **Submit for Review**
   - Complete all sections
   - Submit for review (typically 1-3 days)

### Android App Optimizations

**Reduce App Size**:
```bash
flutter build apk --release --split-per-abi --target-platform android-arm,android-arm64
```

**Enable R8 (Shrinking)**:
Already enabled in release builds via build.gradle

**ProGuard Rules** (if needed):
Add to `android/app/proguard-rules.pro`

---

## 🍎 iOS

### Prerequisites
- macOS 12+ (Monterey or later)
- Xcode 14+
- Apple Developer Account ($99/year)
- CocoaPods
- Flutter 3.0+

### Setup

#### 1. Install Dependencies
```bash
cd frontend/ios
pod install
cd ..
```

#### 2. Configure Xcode Project

Open Xcode:
```bash
open ios/Runner.xcworkspace
```

**Set Bundle Identifier**:
- Select Runner in project navigator
- Set bundle identifier: `com.yourcompany.enterpriseerp`

**Set Team**:
- Go to Signing & Capabilities
- Select your Apple Developer Team

**Update Info.plist**:
```xml
<key>CFBundleDisplayName</key>
<string>Enterprise ERP</string>
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
```

### Build Commands

#### Development Build
```bash
flutter run -d ios
```

#### Release Build (Simulator)
```bash
flutter build ios --release --simulator
```

#### Release Build (Device)
```bash
flutter build ios --release
```

### App Store Submission

#### 1. Archive in Xcode
```bash
# Open in Xcode
open ios/Runner.xcworkspace

# Product > Archive
# Wait for archive to complete
```

#### 2. Upload to App Store Connect
- Window > Organizer
- Select your archive
- Click "Distribute App"
- Choose "App Store Connect"
- Follow wizard

#### 3. Complete App Store Listing
- Go to App Store Connect
- Fill in app information
- Add screenshots (required sizes):
  - 6.7" iPhone: 1290×2796
  - 6.5" iPhone: 1242×2688
  - 5.5" iPhone: 1242×2208
  - iPad Pro (12.9"): 2048×2732

#### 4. Submit for Review
- Complete all required sections
- Submit for review
- Typical review time: 1-2 days

### iOS App Signing

**Development Certificate**:
1. Xcode > Preferences > Accounts
2. Download development certificate

**Distribution Certificate**:
1. Create in Apple Developer Portal
2. Download and install in Keychain

**Provisioning Profiles**:
1. Xcode manages automatically
2. Or create manually in Developer Portal

### TestFlight (Beta Testing)
```bash
# Archive and upload as above
# In App Store Connect:
# - Go to TestFlight tab
# - Add internal/external testers
# - Share beta link
```

---

## 🖥️ macOS

### Prerequisites
- macOS 12+
- Xcode 14+
- CocoaPods
- Flutter 3.0+

### Setup

#### 1. Enable macOS Support
```bash
flutter config --enable-macos-desktop
```

#### 2. Install Pods
```bash
cd frontend/macos
pod install
cd ..
```

#### 3. Configure Entitlements

Edit `macos/Runner/Release.entitlements`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

### Build Commands

#### Development Build
```bash
flutter run -d macos
```

#### Release Build
```bash
flutter build macos --release
```

Output: `build/macos/Build/Products/Release/enterprise_erp.app`

### Creating DMG Installer

#### Using create-dmg
```bash
# Install create-dmg
brew install create-dmg

# Create DMG
create-dmg \
  --volname "Enterprise ERP" \
  --volicon "assets/icons/app_icon.icns" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "enterprise_erp.app" 200 190 \
  --hide-extension "enterprise_erp.app" \
  --app-drop-link 600 185 \
  "EnterpriseERP_v1.0.0.dmg" \
  "build/macos/Build/Products/Release/"
```

### App Notarization (Required for Distribution)

1. **Create App-Specific Password**
   - Go to appleid.apple.com
   - Generate app-specific password

2. **Notarize App**
```bash
# Create zip
ditto -c -k --keepParent \
  "build/macos/Build/Products/Release/enterprise_erp.app" \
  "enterprise_erp.zip"

# Submit for notarization
xcrun notarytool submit enterprise_erp.zip \
  --apple-id "your-email@example.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait

# Staple notarization ticket
xcrun stapler staple \
  "build/macos/Build/Products/Release/enterprise_erp.app"
```

3. **Verify Notarization**
```bash
spctl -a -vvv -t install \
  "build/macos/Build/Products/Release/enterprise_erp.app"
```

### Mac App Store Submission

Similar to iOS, but use macOS-specific provisioning profile and screenshots.

---

## 🔧 Build Scripts

Create automated build scripts for CI/CD:

### build-all.sh
```bash
#!/bin/bash

echo "Building Enterprise ERP for all platforms..."

# Windows
echo "Building Windows..."
flutter build windows --release

# Android
echo "Building Android..."
flutter build apk --release --split-per-abi

# iOS (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Building iOS..."
    flutter build ios --release --no-codesign
    
    echo "Building macOS..."
    flutter build macos --release
fi

echo "All builds complete!"
```

### CI/CD Integration (GitHub Actions)

`.github/workflows/build.yml`:
```yaml
name: Build Apps

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      - run: flutter pub get
      - run: flutter build apk --release
      
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
      
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
      - run: flutter pub get
      - run: flutter build windows --release
```

---

## 🔐 App Signing

### Android Signing

**Generate Upload Keystore**:
```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -storetype JKS -keyalg RSA -keysize 2048 \
  -validity 10000 -alias upload
```

**Important**: Store keystore securely! Losing it means you can't update your app.

### iOS Signing

**Types of Certificates**:
1. **Development**: For testing on devices
2. **Distribution**: For App Store submission

**Manage in Xcode**:
- Xcode > Preferences > Accounts > Manage Certificates

### Code Signing Best Practices

1. Never commit signing keys to git
2. Use environment variables in CI/CD
3. Store certificates in secure vault
4. Use separate keys for debug/release
5. Rotate certificates before expiry
6. Keep backup of all signing keys

---

## 📦 Distribution

### Direct Distribution (Enterprise/Beta)

#### Windows
- Host installer on your website
- Users download and install
- Or use Microsoft Store for Business

#### Android
- Distribute APK via:
  - Your website
  - Firebase App Distribution
  - TestFlight alternatives
  
#### iOS
- TestFlight (100 internal, 10,000 external testers)
- Enterprise distribution (requires Enterprise account)

#### macOS
- Direct download from website
- Must be notarized

### Store Distribution

#### Google Play Store
- **Timeline**: 1-3 days review
- **Cost**: $25 one-time fee
- **Requirements**: Privacy policy, content rating

#### Apple App Store
- **Timeline**: 1-2 days review
- **Cost**: $99/year
- **Requirements**: More strict review guidelines

#### Microsoft Store
- **Timeline**: 1-3 days
- **Cost**: $19 one-time fee (individual) or $99 (company)

### Distribution Checklist

- [ ] Update version numbers
- [ ] Generate release notes
- [ ] Create store assets (screenshots, icons)
- [ ] Write privacy policy
- [ ] Test on real devices
- [ ] Check app size
- [ ] Verify deep links work
- [ ] Test offline functionality
- [ ] Prepare support documentation
- [ ] Set up crash reporting
- [ ] Configure analytics

---

## 📊 Build Size Optimization

### Flutter Build Size
```bash
# Analyze size
flutter build apk --analyze-size
flutter build ios --analyze-size

# Split by ABI (Android)
flutter build apk --split-per-abi

# Tree shaking (automatic in release)
flutter build apk --release --tree-shake-icons
```

### Reducing App Size

1. **Remove unused resources**
2. **Compress images**
3. **Use vector graphics (SVG)**
4. **Enable ProGuard/R8**
5. **Split APKs by architecture**
6. **Use app bundles for Play Store**

---

## 🐛 Troubleshooting

### Common Build Issues

**Windows: "Visual Studio not found"**
```bash
# Install Visual Studio 2022 with:
# - Desktop development with C++
# - Windows 10 SDK
```

**Android: "SDK not found"**
```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**iOS: "No provisioning profile"**
```bash
# In Xcode:
# Signing & Capabilities > Team > Select your team
# Xcode will create profile automatically
```

**macOS: "App is damaged"**
```bash
# Remove quarantine attribute
xattr -cr /path/to/app
```

### Build Errors

**Out of memory during build**:
```bash
# Increase Gradle memory (Android)
# Edit android/gradle.properties
org.gradle.jvmargs=-Xmx4096m
```

**Pod install fails (iOS/macOS)**:
```bash
cd ios  # or macos
pod deintegrate
pod install --repo-update
```

---

## 📞 Support

For build issues:
- Flutter Documentation: https://docs.flutter.dev
- GitHub Issues: Link to your repo
- Email: devops@yourcompany.com

---

**Last Updated**: 2024-01-01
