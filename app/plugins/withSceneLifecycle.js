// Ensures the generated iOS project adopts the UIScene life cycle.
//
// iOS 27 (SDK 26+) asserts at launch with
// `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` when an app does
// not adopt scenes. Expo ships `ExpoAppSceneDelegate` (ObjC name
// `EXExpoAppSceneDelegate`) for exactly this. `expo prebuild` generates the legacy
// (non-scene) AppDelegate by default, so this plugin rewrites the AppDelegate and
// registers the scene manifest.
const { withInfoPlist, withDangerousMod } = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

const APP_DELEGATE_SWIFT = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // The window and React Native are started by \`ExpoAppSceneDelegate\` under the
    // scene life cycle, which iOS 27 requires.
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`

function withSceneInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    }
    return cfg
  })
}

function withSceneAppDelegate(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot
      const candidates = fs
        .readdirSync(iosRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name !== "Pods" && entry.name !== "build")
        .map((entry) => path.join(iosRoot, entry.name, "AppDelegate.swift"))
      const target = candidates.find((file) => fs.existsSync(file))
      if (target) fs.writeFileSync(target, APP_DELEGATE_SWIFT)
      return cfg
    },
  ])
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneInfoPlist(config))
}
