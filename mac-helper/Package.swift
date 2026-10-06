// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "OpenCodeInformerHelper",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "OpenCodeInformerHelper",
            path: "Sources/OpenCodeInformerHelper",
            linkerSettings: [.linkedFramework("ServiceManagement")]
        )
    ]
)
