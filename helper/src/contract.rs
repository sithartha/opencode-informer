//! Values shared with `contract/contract.json`. Keep these in sync.
//!
//! [`parity_errors`] re-checks the embedded contract file at runtime (used by
//! `--selftest`) so drift between this crate and the contract is caught early.

use serde_json::Value;

pub const BRIDGE_PORT: u16 = 38963;
pub const HELPER_PORT: u16 = 38964;
pub const RING_PATH: &str = "/ring";

pub const SERVICE_UUID: &str = "7b1e5a20-6c1a-4f4e-9c3a-2d5f8b9a1c01";
pub const DOORBELL_UUID: &str = "7b1e5a21-6c1a-4f4e-9c3a-2d5f8b9a1c02";
pub const RENDEZVOUS_UUID: &str = "7b1e5a22-6c1a-4f4e-9c3a-2d5f8b9a1c03";
pub const PAIRING_UUID: &str = "7b1e5a23-6c1a-4f4e-9c3a-2d5f8b9a1c04";

/// The advertised BLE local name.
pub const LOCAL_NAME: &str = "OpenCodeInformer";

/// Bridge endpoint that records the Mac user's pairing decision.
pub const PAIR_DECISION_PATH: &str = "/pair/decision";

/// Bridge endpoint the helper reads to display the current pairing code.
pub const PAIR_CODE_PATH: &str = "/pair/code";

/// The machine-readable contract, embedded at build time (`helper/src` → repo root).
pub const CONTRACT_JSON: &str = include_str!("../../contract/contract.json");

/// Compare this crate's constants against the embedded contract and return one
/// human-readable message per mismatch.
pub fn parity_errors() -> Vec<String> {
    let mut errors = Vec::new();
    let Ok(doc) = serde_json::from_str::<Value>(CONTRACT_JSON) else {
        errors.push("contract/contract.json is not valid JSON".to_string());
        return errors;
    };

    let helper_port = doc.pointer("/helper/defaultPort").and_then(Value::as_u64);
    if helper_port != Some(u64::from(HELPER_PORT)) {
        errors.push(format!(
            "helper.defaultPort = {helper_port:?}, expected {HELPER_PORT}"
        ));
    }
    let bridge_port = doc.pointer("/bridge/defaultPort").and_then(Value::as_u64);
    if bridge_port != Some(u64::from(BRIDGE_PORT)) {
        errors.push(format!(
            "bridge.defaultPort = {bridge_port:?}, expected {BRIDGE_PORT}"
        ));
    }
    let ring_path = doc.pointer("/helper/ringPath").and_then(Value::as_str);
    if ring_path != Some(RING_PATH) {
        errors.push(format!(
            "helper.ringPath = {ring_path:?}, expected {RING_PATH}"
        ));
    }

    for (path, expected) in [
        ("/ble/serviceUUID", SERVICE_UUID),
        ("/ble/doorbellUUID", DOORBELL_UUID),
        ("/ble/rendezvousUUID", RENDEZVOUS_UUID),
        ("/ble/pairingUUID", PAIRING_UUID),
    ] {
        let actual = doc.pointer(path).and_then(Value::as_str);
        if actual != Some(expected) {
            errors.push(format!("{path} = {actual:?}, expected {expected}"));
        }
    }

    errors
}
