plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij.platform") version "2.1.0"
}

group = "com.gradleflow"
version = "1.0-SNAPSHOT"

repositories {
    mavenCentral()
    intellijPlatform {
        defaultRepositories()
    }
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")

    intellijPlatform {
        intellijIdeaCommunity("2023.3")

        bundledPlugins(
            "org.jetbrains.plugins.gradle",
            "org.jetbrains.kotlin"
        )

        instrumentationTools()
    }
}

intellijPlatform {
    pluginConfiguration {
        id = "com.gradleflow.plugin"
        name = "Gradle Flow"
        version = project.version.toString()

        ideaVersion {
            sinceBuild = "233"
            untilBuild = "243.*"
        }
    }

    signing {
        certificateChain = providers.environmentVariable("CERTIFICATE_CHAIN")
        privateKey = providers.environmentVariable("PRIVATE_KEY")
        password = providers.environmentVariable("PRIVATE_KEY_PASSWORD")
    }

    publishing {
        token = providers.environmentVariable("PUBLISH_TOKEN")
    }
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }

    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    // Copy the React build to resources
    register<Copy>("copyWebUI") {
        from("../dist")
        into("src/main/resources/webui")
    }

    processResources {
        dependsOn("copyWebUI")
    }
}
