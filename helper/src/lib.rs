//! Cross-platform companion helper for OpenCode Informer.
//!
//! The helper implements the platform-agnostic side of the contract shared with the
//! phone app and the plugin bridge:
//!
//! - a **loopback HTTP server** on `127.0.0.1:38964` that accepts `POST /ring`
//!   doorbells from the plugin bridge and hosts the pairing **approval page**;
//! - the **rendezvous** value (`host:port`) the phone reads to find the bridge;
//! - a **BLE peripheral** (doorbell notify, rendezvous read, pairing write) that wakes
//!   the phone — implemented per platform, with a LAN-only fallback where the host
//!   cannot advertise.

pub mod bridge;
pub mod contract;
pub mod lan;
pub mod loopback;
pub mod peripheral;
pub mod selftest;
