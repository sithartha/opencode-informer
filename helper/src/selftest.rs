//! Hardware-free self-test.
//!
//! Verifies the parts that do not need a Bluetooth adapter: contract parity, the
//! loopback ring + approval flow, the decision relay to the bridge, and the
//! doorbell fan-out to the peripheral channel. Run with `--selftest`.

use std::sync::mpsc::{channel, Receiver};
use std::thread;
use std::time::Duration;

use anyhow::{bail, Context};
use serde_json::{json, Value};
use tiny_http::{Method, Response, Server};

use crate::bridge::BridgeClient;
use crate::contract::{self, RING_PATH};
use crate::loopback::Loopback;

/// Run the self-test; returns `Ok(())` on success.
pub fn run() -> anyhow::Result<()> {
    let mut failures: Vec<String> = Vec::new();

    // 1. Contract parity.
    let parity = contract::parity_errors();
    if parity.is_empty() {
        println!("[selftest] contract parity: ok");
    } else {
        for error in &parity {
            failures.push(format!("contract parity: {error}"));
        }
    }

    // 2. Stub bridge that records decisions.
    let (bridge_port, decisions) = start_stub_bridge()?;
    let bridge_base = format!("http://127.0.0.1:{bridge_port}");

    // 3. Loopback server + doorbell channel.
    let loopback = Loopback::bind(0, "selftest", "127.0.0.1:38963", false)?;
    let port = loopback.port();
    let (doorbell_tx, doorbell_rx) = channel::<Value>();
    let bridge = BridgeClient::from_base(bridge_base);
    thread::spawn(move || {
        if let Err(err) = loopback.run(doorbell_tx, bridge) {
            eprintln!("[selftest] loopback stopped: {err:#}");
        }
    });

    let base = format!("http://127.0.0.1:{port}");

    // 4. Pairing ring surfaces on the approval page.
    let ring = json!({
        "kind": "pairing",
        "approvalID": "apr_selftest",
        "deviceName": "Selftest Phone",
    });
    post_json(&format!("{base}{RING_PATH}"), &ring).context("POST /ring")?;
    let page = get_text(&format!("{base}/")).context("GET /")?;
    if page.contains("Selftest Phone") {
        println!("[selftest] approval page shows the device: ok");
    } else {
        failures.push("approval page did not show the pending device".to_string());
    }

    // 5. Doorbell fan-out.
    match doorbell_rx.recv_timeout(Duration::from_secs(2)) {
        Ok(value) if value.get("kind").and_then(Value::as_str) == Some("pairing") => {
            println!("[selftest] doorbell forwarded to the peripheral channel: ok");
        }
        Ok(value) => failures.push(format!("unexpected doorbell payload: {value}")),
        Err(err) => failures.push(format!("no doorbell received: {err}")),
    }

    // 6. Decision relay to the bridge.
    let decision = json!({ "approvalID": "apr_selftest", "decision": "approve" });
    post_json(&format!("{base}/pair/decision"), &decision).context("POST /pair/decision")?;
    match decisions.recv_timeout(Duration::from_secs(3)) {
        Ok(Value::String(body)) if body.contains("apr_selftest") && body.contains("approve") => {
            println!("[selftest] pairing decision relayed to the bridge: ok");
        }
        Ok(body) => failures.push(format!("bridge received unexpected body: {body}")),
        Err(err) => failures.push(format!("bridge received no decision: {err}")),
    }

    // 7. Approval page escapes HTML in the device name.
    let page = crate::loopback::approval_page_for_test("<b>evil</b>", "apr_x");
    if page.contains("<b>evil</b>") || !page.contains("&lt;b&gt;") {
        failures.push("approval page did not escape the device name".to_string());
    } else {
        println!("[selftest] approval page escapes HTML: ok");
    }

    if failures.is_empty() {
        println!("[selftest] PASS");
        Ok(())
    } else {
        for failure in &failures {
            eprintln!("[selftest] FAIL: {failure}");
        }
        bail!("{} self-test check(s) failed", failures.len())
    }
}

/// Stub bridge on an ephemeral port that records the JSON bodies it receives.
fn start_stub_bridge() -> anyhow::Result<(u16, Receiver<Value>)> {
    let server = Server::http(("127.0.0.1", 0))
        .map_err(|e| anyhow::anyhow!("failed to bind stub bridge: {e}"))?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .unwrap_or_default();
    let (tx, rx) = channel::<Value>();
    thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let mut body = String::new();
            if request.method() == &Method::Post {
                let _ = request.as_reader().read_to_string(&mut body);
                let _ = tx.send(Value::String(body));
            }
            let _ = request.respond(Response::from_string("ok"));
        }
    });
    Ok((port, rx))
}

fn post_json(url: &str, body: &Value) -> anyhow::Result<()> {
    ureq::post(url)
        .timeout(Duration::from_secs(5))
        .send_json(body)
        .with_context(|| format!("POST {url}"))?;
    Ok(())
}

fn get_text(url: &str) -> anyhow::Result<String> {
    let response = ureq::get(url)
        .timeout(Duration::from_secs(5))
        .call()
        .with_context(|| format!("GET {url}"))?;
    response.into_string().context("read body")
}
