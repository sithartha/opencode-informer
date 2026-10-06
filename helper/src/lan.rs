//! LAN address detection for the rendezvous value the phone reads over BLE.

use if_addrs::{get_if_addrs, IfAddr, Interface};

/// Primary non-loopback IPv4 address of this host, preferring the interfaces a
/// phone is most likely to reach (Wi-Fi/Ethernet).
pub fn lan_address() -> Option<String> {
    let interfaces = get_if_addrs().ok()?;

    // macOS Wi-Fi/Ethernet are typically `en0`/`en1`; prefer them when present.
    for preferred in ["en0", "en1", "eth0", "wlan0", "Wi-Fi", "Ethernet"] {
        if let Some(ip) = interfaces
            .iter()
            .find(|i| i.name == preferred)
            .and_then(ipv4)
        {
            return Some(ip);
        }
    }

    // Otherwise, the first non-loopback IPv4.
    for interface in &interfaces {
        if is_loopback(interface) {
            continue;
        }
        if let Some(ip) = ipv4(interface) {
            return Some(ip);
        }
    }

    // Last resort: any IPv4 at all (for example a loopback-only host).
    interfaces.iter().find_map(ipv4)
}

fn is_loopback(interface: &Interface) -> bool {
    let lower = interface.name.to_ascii_lowercase();
    lower == "lo" || lower.starts_with("lo") || lower == "loopback"
}

fn ipv4(interface: &Interface) -> Option<String> {
    match &interface.addr {
        IfAddr::V4(addr) if !addr.ip.is_loopback() => Some(addr.ip.to_string()),
        _ => None,
    }
}

/// The `host:port` value the helper serves over BLE so the phone can find the bridge.
pub fn rendezvous_value() -> String {
    let host = lan_address().unwrap_or_else(|| "127.0.0.1".to_string());
    format!("{host}:{}", crate::contract::BRIDGE_PORT)
}
