import AppKit
import Foundation

// Unbuffered stdout so background modes show logs immediately.
setbuf(stdout, nil)

if CommandLine.arguments.contains("--advertise") {
    AdvertiseMode().run()
}
if CommandLine.arguments.contains("--scan") {
    SelfTest().run()
}

let application = NSApplication.shared
let controller = AppController()
application.delegate = controller
application.setActivationPolicy(.accessory)
application.run()
