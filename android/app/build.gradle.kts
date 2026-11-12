plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "vn.gameandchill.balatroadvisor"
    compileSdk = 35

    defaultConfig {
        applicationId = "vn.gameandchill.balatroadvisor"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    signingConfigs {
        create("fixed") {
            // Khóa cố định trong repo để bản mới cài đè được bản cũ (app cá nhân, không đưa lên Play Store)
            storeFile = file("advisor.keystore")
            storePassword = "balatro123"
            keyAlias = "advisor"
            keyPassword = "balatro123"
        }
    }
    buildTypes {
        debug { signingConfig = signingConfigs.getByName("fixed") }
        release { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("fixed") }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
}
