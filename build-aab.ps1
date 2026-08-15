# Rebuild signed AAB (CLI, no Android Studio)
$ErrorActionPreference = "Stop"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:ANDROID_HOME = "C:\Users\btayl\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

$proj = "C:\Users\btayl\mwd-pro-cap8-upgrade"
Set-Location $proj
npm run build
npx cap sync android
# cap sync rewrites the Cordova plugin module back to AGP 8.x; pin it to the app AGP.
$cordovaGradle = Join-Path $proj "android\capacitor-cordova-android-plugins\build.gradle"
if (Test-Path $cordovaGradle) {
    $gradleText = [System.IO.File]::ReadAllText($cordovaGradle)
    $updated = [regex]::Replace($gradleText, "com\.android\.tools\.build:gradle:[0-9][0-9.]+", "com.android.tools.build:gradle:9.0.1")
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($cordovaGradle, $updated, $utf8)
}
Set-Location "$proj\android"
.\gradlew.bat bundleRelease
Write-Host "AAB: $proj\android\app\build\outputs\bundle\release\app-release.aab"