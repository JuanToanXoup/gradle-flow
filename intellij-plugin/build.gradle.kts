plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.21"
    id("org.jetbrains.intellij") version "1.16.1"
}

group = "com.gradleflow"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
}

// Configure Gradle IntelliJ Plugin
intellij {
    version.set("2023.3")
    type.set("IC") // IntelliJ IDEA Community Edition

    plugins.set(listOf(
        "org.jetbrains.plugins.gradle",  // Gradle support
        "org.jetbrains.kotlin"            // Kotlin support
    ))
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")
}

tasks {
    // Set the JVM compatibility versions
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    patchPluginXml {
        sinceBuild.set("233")
        untilBuild.set("243.*")
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }

    // Copy the React build to resources
    register<Copy>("copyWebUI") {
        from("../dist")
        into("src/main/resources/webui")
        dependsOn(":build")
    }

    processResources {
        dependsOn("copyWebUI")
    }
}
