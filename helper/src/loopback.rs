//! Loopback HTTP server: accepts `POST /ring` doorbells and hosts the pairing
//! approval page used on platforms without a native prompt.

use std::sync::mpsc::Sender;
use std::sync::{Arc, Mutex};

use std::io::IsTerminal;

use serde::Serialize;
use serde_json::{json, Value};
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::bridge::BridgeClient;
use crate::contract::RING_PATH;

/// A pairing request waiting for the local user's decision.
#[derive(Clone, Debug, Serialize)]
pub struct PendingPairing {
    pub approval_id: String,
    pub device_name: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct Decision {
    pub approval_id: String,
    pub approved: bool,
    pub relayed: bool,
}

struct State {
    backend: String,
    rendezvous: String,
    pending: Option<PendingPairing>,
    last_decision: Option<Decision>,
    browser_opened: bool,
}

impl State {
    fn public_json(&self) -> Value {
        json!({
            "backend": self.backend,
            "rendezvous": self.rendezvous,
            "pending": self.pending,
            "lastDecision": self.last_decision,
        })
    }
}

/// The loopback server. Owns the bound port so callers can use an ephemeral port.
pub struct Loopback {
    server: Server,
    state: Arc<Mutex<State>>,
}

impl Loopback {
    /// Bind on `127.0.0.1:<port>` (use port `0` for an ephemeral port).
    pub fn bind(
        port: u16,
        backend: impl Into<String>,
        rendezvous: impl Into<String>,
        open_browser: bool,
    ) -> anyhow::Result<Self> {
        let server = Server::http(("127.0.0.1", port))
            .map_err(|e| anyhow::anyhow!("failed to bind 127.0.0.1:{port}: {e}"))?;
        Ok(Self {
            server,
            state: Arc::new(Mutex::new(State {
                backend: backend.into(),
                rendezvous: rendezvous.into(),
                pending: None,
                last_decision: None,
                browser_opened: !open_browser,
            })),
        })
    }

    /// The actual bound port.
    pub fn port(&self) -> u16 {
        self.server
            .server_addr()
            .to_ip()
            .map(|addr| addr.port())
            .unwrap_or_default()
    }

    /// Serve until the process exits. `doorbells` receives every ring payload for the
    /// BLE peripheral to publish.
    pub fn run(self, doorbells: Sender<Value>, bridge: BridgeClient) -> anyhow::Result<()> {
        if std::io::stdin().is_terminal() {
            spawn_terminal_prompt(self.state.clone(), bridge.clone());
        }
        for request in self.server.incoming_requests() {
            if let Err(err) = self.handle(request, &doorbells, &bridge) {
                eprintln!("[loopback] request error: {err:#}");
            }
        }
        Ok(())
    }

    fn handle(
        &self,
        mut request: Request,
        doorbells: &Sender<Value>,
        bridge: &BridgeClient,
    ) -> anyhow::Result<()> {
        let method = request.method().clone();
        let url = request.url().to_string();
        let path = url.split('?').next().unwrap_or("").to_string();

        match (&method, path.as_str()) {
            (Method::Post, RING_PATH) => {
                let payload = read_json(&mut request);
                self.on_ring(payload, doorbells);
                respond_text(request, 200, "ok");
            }
            (Method::Get, "/") => {
                let html = approval_html(&self.state.lock().unwrap());
                respond_html(request, 200, html);
            }
            (Method::Get, "/status") => {
                let json = self.state.lock().unwrap().public_json();
                respond_json(request, 200, json);
            }
            (Method::Get, "/health") => respond_json(request, 200, json!({ "ok": true })),
            (Method::Post, "/pair/decision") => {
                let body = read_json(&mut request);
                let decision = self.decide(body, bridge);
                respond_json(request, 200, serde_json::to_value(decision).unwrap());
            }
            (Method::Get, "/pair/approve") => {
                let decision = self.decide(json!({ "decision": "approve" }), bridge);
                respond_html(request, 200, outcome_html(&decision));
            }
            (Method::Get, "/pair/deny") => {
                let decision = self.decide(json!({ "decision": "deny" }), bridge);
                respond_html(request, 200, outcome_html(&decision));
            }
            _ => respond_text(request, 404, "not found"),
        }
        Ok(())
    }

    fn on_ring(&self, payload: Value, doorbells: &Sender<Value>) {
        if payload.get("kind").and_then(Value::as_str) == Some("pairing") {
            let approval_id = payload
                .get("approvalID")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let device_name = payload
                .get("deviceName")
                .and_then(Value::as_str)
                .unwrap_or("Unknown device")
                .to_string();

            let mut state = self.state.lock().unwrap();
            if !approval_id.is_empty() {
                let page = format!("http://127.0.0.1:{}/", self.port());
                println!("[pairing] {device_name} wants to pair — approve at {page}");
                state.pending = Some(PendingPairing {
                    approval_id,
                    device_name,
                });
                if !state.browser_opened {
                    state.browser_opened = true;
                    open_browser(&page);
                }
            }
        }

        let _ = doorbells.send(payload);
    }

    fn decide(&self, body: Value, bridge: &BridgeClient) -> Decision {
        let approval_id = body
            .get("approvalID")
            .and_then(Value::as_str)
            .map(str::to_string);
        let approved = matches!(
            body.get("decision").and_then(Value::as_str),
            Some("approve") | Some("allow") | Some("approved")
        );
        decide(&self.state, bridge, approval_id, approved)
    }
}

fn decide(
    state: &Arc<Mutex<State>>,
    bridge: &BridgeClient,
    approval_id: Option<String>,
    approved: bool,
) -> Decision {
    let mut state = state.lock().unwrap();
    let approval_id = approval_id
        .or_else(|| state.pending.as_ref().map(|p| p.approval_id.clone()))
        .unwrap_or_default();

    let relayed = if approval_id.is_empty() {
        eprintln!("[pairing] no approval ID to decide");
        false
    } else {
        match bridge.decide_pairing(&approval_id, approved) {
            Ok(()) => {
                println!(
                    "[pairing] {} {}",
                    if approved { "approved" } else { "denied" },
                    approval_id
                );
                true
            }
            Err(err) => {
                eprintln!("[pairing] relay failed: {err:#}");
                false
            }
        }
    };

    state.pending = None;
    let decision = Decision {
        approval_id,
        approved,
        relayed,
    };
    state.last_decision = Some(decision.clone());
    decision
}

/// Read `y`/`n` from an interactive terminal to approve or deny a pending pairing
/// (used on headless hosts alongside the approval page).
fn spawn_terminal_prompt(state: Arc<Mutex<State>>, bridge: BridgeClient) {
    std::thread::spawn(move || {
        println!("[pairing] type 'y' to approve or 'n' to deny a pending pairing");
        loop {
            let mut line = String::new();
            if std::io::stdin().read_line(&mut line).unwrap_or(0) == 0 {
                break;
            }
            match line.trim().to_ascii_lowercase().as_str() {
                "y" | "yes" | "a" | "approve" => {
                    decide(&state, &bridge, None, true);
                }
                "n" | "no" | "d" | "deny" => {
                    decide(&state, &bridge, None, false);
                }
                _ => {}
            }
        }
    });
}

fn read_json(request: &mut Request) -> Value {
    let mut body = String::new();
    if request.as_reader().read_to_string(&mut body).is_err() {
        return json!({});
    }
    serde_json::from_str(&body).unwrap_or_else(|_| json!({}))
}

fn respond_text(request: Request, code: u16, text: &str) {
    let response = Response::from_string(text).with_status_code(StatusCode(code));
    let _ = request.respond(response);
}

fn respond_html(request: Request, code: u16, html: String) {
    let header = Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..])
        .expect("valid header");
    let response = Response::from_string(html)
        .with_status_code(StatusCode(code))
        .with_header(header);
    let _ = request.respond(response);
}

fn respond_json(request: Request, code: u16, value: Value) {
    let header =
        Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).expect("valid header");
    let response = Response::from_string(value.to_string())
        .with_status_code(StatusCode(code))
        .with_header(header);
    let _ = request.respond(response);
}

fn approval_html(state: &State) -> String {
    let body = match &state.pending {
        Some(pending) => {
            let name = escape_html(&pending.device_name);
            let id = escape_html(&pending.approval_id);
            format!(
                r#"<h1>Pair <code>{name}</code>?</h1>
<p>This phone wants to control your OpenCode agents over the local network.</p>
<div class="buttons">
  <button class="approve" onclick="decide('approve')">Allow</button>
  <button class="deny" onclick="decide('deny')">Deny</button>
</div>
<script>
async function decide(decision) {{
  await fetch('/pair/decision', {{
    method: 'POST',
    headers: {{ 'Content-Type': 'application/json' }},
    body: JSON.stringify({{ approvalID: '{id}', decision }})
  }});
  location.reload();
}}
</script>"#
            )
        }
        None => r#"<h1>No pending pairing requests</h1>
<p>The helper is running. Open the app on your phone to request pairing.</p>"#
            .to_string(),
    };

    format!(
        r#"<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenCode Informer — pairing</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font: 16px/1.5 -apple-system, system-ui, sans-serif; max-width: 32rem; margin: 12vh auto; padding: 0 1.5rem; }}
  code {{ background: rgba(127,127,127,.2); padding: .1em .35em; border-radius: .3em; }}
  .buttons {{ display: flex; gap: .75rem; margin-top: 1.5rem; }}
  button {{ font: inherit; padding: .6rem 1.4rem; border-radius: .6rem; border: 1px solid transparent; cursor: pointer; }}
  .approve {{ background: #2f855a; color: white; }}
  .deny {{ background: transparent; border-color: currentColor; }}
  footer {{ margin-top: 3rem; opacity: .6; font-size: .85em; }}
</style>
</head>
<body>
{body}
<footer>OpenCode Informer helper · backend: {backend} · rendezvous: <code>{rendezvous}</code></footer>
</body>
</html>"#,
        backend = escape_html(&state.backend),
        rendezvous = escape_html(&state.rendezvous),
    )
}

fn outcome_html(decision: &Decision) -> String {
    let (title, detail) = match (decision.approved, decision.relayed) {
        (true, true) => ("Approved", "The phone can now connect."),
        (true, false) => (
            "Approved locally",
            "The bridge could not be reached; it may retry.",
        ),
        (false, _) => ("Denied", "The phone remains unauthorized."),
    };
    format!(
        "<!doctype html><html><body style=\"font:16px system-ui;margin:12vh auto;max-width:32rem\"><h1>{title}</h1><p>{detail}</p></body></html>"
    )
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Open the default browser at `url` (best effort, per platform).
pub fn open_browser(url: &str) {
    let result = if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(url).spawn()
    } else if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    };
    if let Err(err) = result {
        eprintln!("[pairing] could not open a browser ({err}); open {url} manually");
    }
}

/// Convenience wrapper used by the CLI to log the bind result.
pub fn bind_or_exit(port: u16, backend: &str, rendezvous: &str, open: bool) -> Loopback {
    Loopback::bind(port, backend, rendezvous, open).unwrap_or_else(|err| {
        eprintln!("[helper] {err:#}");
        std::process::exit(1);
    })
}

/// Re-export for callers that need to run the server with an explicit bridge base.
pub fn serve(
    loopback: Loopback,
    doorbells: Sender<Value>,
    bridge_base: Option<String>,
) -> anyhow::Result<()> {
    let bridge = match bridge_base {
        Some(base) => BridgeClient::from_base(base),
        None => BridgeClient::new(),
    };
    loopback.run(doorbells, bridge)
}

/// Read the ring body helper used by `--selftest`.
pub fn parse_ring_body(body: &str) -> Value {
    serde_json::from_str(body).unwrap_or_else(|_| json!({}))
}

/// Exposed for tests: the approval page for a given state.
pub fn approval_page_for_test(device_name: &str, approval_id: &str) -> String {
    let state = State {
        backend: "test".into(),
        rendezvous: "127.0.0.1:38963".into(),
        pending: Some(PendingPairing {
            approval_id: approval_id.into(),
            device_name: device_name.into(),
        }),
        last_decision: None,
        browser_opened: true,
    };
    approval_html(&state)
}
