//! LAN-only peripheral: no BLE advertising. Used for `--simulate`, on macOS (which
//! uses the signed `mac-helper/` app instead), and as the documented fallback when
//! the host cannot advertise as a BLE peripheral.

use std::sync::mpsc::Receiver;

use serde_json::Value;

use super::Peripheral;

pub struct SimulatedPeripheral {
    rendezvous: String,
}

impl SimulatedPeripheral {
    pub fn new(rendezvous: String) -> Self {
        Self { rendezvous }
    }
}

impl Peripheral for SimulatedPeripheral {
    fn backend(&self) -> &'static str {
        "simulated (LAN-only)"
    }

    fn run(self: Box<Self>, doorbells: Receiver<Value>) -> anyhow::Result<()> {
        eprintln!(
            "[simulated] BLE disabled (LAN-only). Rendezvous: {}",
            self.rendezvous
        );
        while let Ok(payload) = doorbells.recv() {
            let kind = payload
                .get("kind")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            println!("[simulated] doorbell: {kind} {payload}");
        }
        Ok(())
    }
}
