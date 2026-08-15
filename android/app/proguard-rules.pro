# Capacitor / Cordova purchase + Play Billing (R8 is on for release)
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class cc.fovea.** { *; }
-keep class com.android.billingclient.** { *; }
-dontwarn com.android.billingclient.**
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
