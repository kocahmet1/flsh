# Android APK Build

This file documents the exact local Android APK build setup that worked for this repo on this machine.

## Purpose

Use this when rebuilding the Android APK after app changes.

This project is an Expo / React Native app, but the APK is built locally through the generated native Android project in [android](/C:/Users/Test1/Desktop/flsh/android).

## Working Toolchain

This repo successfully built using the existing toolchain from:

- JDK root: `C:\Users\Test1\english-learning-app\.android-toolchain\jdk-17\jdk-17.0.18+8`
- Android SDK root: `C:\Users\Test1\english-learning-app\.android-toolchain\android-sdk`

Do not assume `java`, `javac`, `adb`, or Android SDK tools are on global `PATH`.
Set them explicitly in the PowerShell session before building.

## Required Project Constraints

These settings mattered for a successful build:

- [package.json](/C:/Users/Test1/Desktop/flsh/package.json) excludes `expo-updates` from Android autolinking.
- [app.json](/C:/Users/Test1/Desktop/flsh/app.json) keeps `expo.newArchEnabled` set to `true`.
- [android/gradle.properties](/C:/Users/Test1/Desktop/flsh/android/gradle.properties) keeps:
  - `newArchEnabled=true`
  - `reactNativeArchitectures=arm64-v8a`

Notes:

- Do not disable the new architecture in this repo. `react-native-reanimated` and `react-native-worklets` fail when `newArchEnabled=false`.
- `reactNativeArchitectures=arm64-v8a` keeps the build lighter and is suitable for most modern Android phones.
- Excluding `expo-updates` from Android autolinking avoided a native build failure around `expo-updates` / KSP dependency resolution.

## Build Steps

Run these commands from PowerShell with the repo at `C:\Users\Test1\Desktop\flsh`.

### 1. Sync Expo config into the native Android project

```powershell
Set-Location 'C:\Users\Test1\Desktop\flsh'
npx.cmd expo prebuild --platform android --no-install
```

### 2. Build the release APK

```powershell
$javaHome = 'C:\Users\Test1\english-learning-app\.android-toolchain\jdk-17\jdk-17.0.18+8'
$sdkRoot = 'C:\Users\Test1\english-learning-app\.android-toolchain\android-sdk'
$gradleHome = 'C:\Users\Test1\Desktop\flsh\.gradle-local'

New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:GRADLE_USER_HOME = $gradleHome
$env:PATH = "$javaHome\bin;$sdkRoot\platform-tools;$sdkRoot\cmdline-tools\latest\bin;$env:PATH"

Set-Location 'C:\Users\Test1\Desktop\flsh\android'
.\gradlew.bat assembleRelease --no-daemon --console=plain
```

## Output Artifact

Successful build output:

- APK: [android/app/build/outputs/apk/release/app-release.apk](/C:/Users/Test1/Desktop/flsh/android/app/build/outputs/apk/release/app-release.apk)
- Metadata: [android/app/build/outputs/apk/release/output-metadata.json](/C:/Users/Test1/Desktop/flsh/android/app/build/outputs/apk/release/output-metadata.json)

## Verification

Quick verification command:

```powershell
Get-Item 'C:\Users\Test1\Desktop\flsh\android\app\build\outputs\apk\release\app-release.apk' |
  Select-Object FullName, Length, LastWriteTime
```

## Known Warnings

These appeared during successful builds and were not blockers:

- `NODE_ENV environment variable is required but was not specified`
- `baseline-browser-mapping ... data is over two months old`
- deprecated API warnings from React Native / Android dependencies

## Important Limitations

- This build path produces a local sideloadable APK for testing.
- The generated `release` APK is currently signed with the debug keystore from the default Android Gradle setup.
- This is not a Play Store release process.

## If the Build Fails

Check these first:

1. Confirm the external toolchain paths still exist:
   - `C:\Users\Test1\english-learning-app\.android-toolchain\jdk-17\jdk-17.0.18+8`
   - `C:\Users\Test1\english-learning-app\.android-toolchain\android-sdk`
2. Confirm [package.json](/C:/Users/Test1/Desktop/flsh/package.json) still excludes `expo-updates` from Android autolinking.
3. Confirm [app.json](/C:/Users/Test1/Desktop/flsh/app.json) and [android/gradle.properties](/C:/Users/Test1/Desktop/flsh/android/gradle.properties) still have `newArchEnabled=true`.
4. Confirm [android/gradle.properties](/C:/Users/Test1/Desktop/flsh/android/gradle.properties) still uses `reactNativeArchitectures=arm64-v8a`.
5. Rerun `npx.cmd expo prebuild --platform android --no-install` before rebuilding.

## Typical Rebuild Time

- Warm cache: about 9 minutes
- Cold or partially cold cache: significantly longer
