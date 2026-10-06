//! Minimal client for the plugin bridge's local HTTP API.

use std::time::Duration;

use anyhow::Context;

use crate::contract::{BRIDGE_PORT, PAIR_DECISION_PATH};

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
}

impl Default for BridgeClient {
    fn default() -> Self {
        Self::new()
    }
}
