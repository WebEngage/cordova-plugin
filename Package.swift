// swift-tools-version:5.9
import PackageDescription

// MAINTAINERS: Capacitor's CLI rewrites this file inside node_modules on every `cap sync`, using a
// plain string replace that only changes the FIRST occurrence of the upstream organisation name
// and of the Cordova platform repository name. Never write either of those two names in a comment
// above the dependency declarations (see DEVELOPER_NOTES.md, "Package.swift and Capacitor").

let package = Package(
    name: "cordova-plugin-webengage",
    platforms: [.iOS(.v13)],
    products: [
        .library(name: "cordova-plugin-webengage", targets: ["cordova-plugin-webengage"])
    ],
    dependencies: [
        .package(url: "https://github.com/apache/cordova-ios.git", branch: "master"),
        .package(url: "https://github.com/WebEngage/webengage-ios-sdk.git", .upToNextMajor(from: "2.0.0"))
    ],
    targets: [
        .target(
            name: "cordova-plugin-webengage",
            dependencies: [
                .product(name: "Cordova", package: "cordova-ios"),
                .product(name: "WebEngageCore", package: "webengage-ios-sdk"),
                .product(name: "WebEngageLocation", package: "webengage-ios-sdk")
            ],
            path: "src/ios",
            resources: [],
            publicHeadersPath: "."
        )
    ]
)
