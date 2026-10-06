//! BLE peripheral abstraction with per-platform backends.

pub mod simulated;

#[cfg(target_os = "linux")]
pub mod linux;

#[cfg(target_os = "windows")]
pub mod windows;

use std::sync::mpsc::Receiver;

use serde_json::Value;

/// A BLE peripheral that publishes doorbells, serves the rendezvous value, and
/// accepts the phone's pairing writes.
pub trait Peripheral: Send {
    /// Short backend name for logs and `/status`.
    fn backend(&self) -> &'static str;

    /// Blocking run loop. Consumes doorbells from `doorbells` and publishes them.
    /// Returns when the doorbell channel closes.
    fn run(self: Box<Self>, doorbells: Receiver<Value>) -> anyhow::Result<()>;
}

/// Create the backend for the current platform. `simulate` forces the LAN-only
/// simulated backend (also the fallback on platforms without a BLE implementation).
pub fn create(rendezvous: String, simulate: bool) -> Box<dyn Peripheral> {
    if simulate {
        return Box::new(simulated::SimulatedPeripheral::new(rendezvous));
    }

    #[cfg(target_os = "linux")]
    {
        Box::new(linux::LinuxPeripheral::new(rendezvous))
    }

    #[cfg(target_os = "windows")]
    {
        Box::new(windows::WindowsPeripheral::new(rendezvous))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        // macOS uses the signed Swift menu-bar app (`mac-helper/`); this helper runs
        // LAN-only there. See helper/README.md.
        Box::new(simulated::SimulatedPeripheral::new(rendezvous))
    }
}

/// Scan for the helper's BLE service (diagnostics, `--scan`).
pub fn scan() -> anyhow::Result<()> {
    #[cfg(target_os = "linux")]
    {
        linux::scan()
    }

    #[cfg(target_os = "windows")]
    {
        windows::scan()
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        anyhow::bail!(
            "--scan needs a Bluetooth central and is implemented for Linux and Windows; \
             on macOS use the signed mac-helper (`mac-helper/ --scan`) or the phone app"
        )
    }
}
