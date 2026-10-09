//! Minimal client for the plugin bridge's local HTTP API.

use std::time::Duration;

use anyhow::Context;
use serde_json::Value;

use crate::contract::{BRIDGE_PORT, PAIR_CODE_PATH, PAIR_DECISION_PATH};

/// Talks to the plugin bridge (defaults to `http://127.0.0.1:38963`).
///
/// The base URL can be overridden with `OC_INFORMER_BRIDGE` (used by `--selftest`
/// to point at a stub bridge).
#[derive(Clone)]
pub struct BridgeClient {
    base: String,
}

impl BridgeClient {
    pub fn new() -> Self {
        let base = std::env::var("OC_INFORMER_BRIDGE")
            .unwrap_or_else(|_| format!("http://127.0.0.1:{BRIDGE_PORT}"));
        Self { base }
    }

    pub fn from_base(base: impl Into<String>) -> Self {
        Self { base: base.into() }
    }

    pub fn base(&self) -> &str {
        &self.base
    }

    /// Relay the local user's pairing decision to the bridge.
    pub fn decide_pairing(&self, approval_id: &str, approve: bool) -> anyhow::Result<()> {
        let url = format!("{}{PAIR_DECISION_PATH}", self.base);
        let body = serde_json::json!({
            "approvalID": approval_id,
            "decision": if approve { "approve" } else { "deny" },
        });
        ureq::post(&url)
            .timeout(Duration::from_secs(5))
            .send_json(&body)
            .with_context(|| format!("POST {url} failed"))?;
        Ok(())
    }

    /// Read the current pairing code the bridge wants the helper to display.
    pub fn pairing_code(&self) -> anyhow::Result<String> {
        let url = format!("{}{PAIR_CODE_PATH}", self.base);
        let value: Value = ureq::get(&url)
            .timeout(Duration::from_secs(5))
            .call()
            .with_context(|| format!("GET {url} failed"))?
            .into_json()
            .with_context(|| format!("GET {url}: invalid JSON"))?;
        Ok(value
            .get("code")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string())
    }
}

impl Default for BridgeClient {
    fn default() -> Self {
        Self::new()
    }
}
