// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "OpenIslandBLE",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(
            name: "OpenIslandBLE",
            path: "Sources/OpenIslandBLE",
            linkerSettings: [.linkedFramework("ServiceManagement")]
        )
    ]
)
