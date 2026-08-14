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
Set-Location "$proj\android"
.\gradlew.bat bundleRelease
Write-Host "AAB: $proj\android\app\build\outputs\bundle\release\app-release.aab"