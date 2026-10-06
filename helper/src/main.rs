//! CLI entry point for the cross-platform helper.

use std::process::ExitCode;
use std::sync::mpsc::channel;

use opencode_informer_helper::contract::HELPER_PORT;
use opencode_informer_helper::{lan, loopback, peripheral, selftest};

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();

    if args.iter().any(|a| a == "--help" || a == "-h") {
        print_help();
        return ExitCode::SUCCESS;
    }
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("opencode-informer-helper {}", env!("CARGO_PKG_VERSION"));
        return ExitCode::SUCCESS;
    }
    if args.iter().any(|a| a == "--selftest") {
        return match selftest::run() {
            Ok(()) => ExitCode::SUCCESS,
            Err(err) => {
                eprintln!("[selftest] {err:#}");
                ExitCode::FAILURE
            }
        };
    }
    if args.iter().any(|a| a == "--scan") {
        return match peripheral::scan() {
            Ok(()) => ExitCode::SUCCESS,
            Err(err) => {
                eprintln!("[scan] {err:#}");
                ExitCode::FAILURE
            }
        };
    }

    let simulate = args.iter().any(|a| a == "--simulate");
    let open_browser = args.iter().any(|a| a == "--open");
    let port = arg_value(&args, "--port")
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(HELPER_PORT);

    let rendezvous = lan::rendezvous_value();
    let backend = peripheral::create(rendezvous.clone(), simulate);
    let backend_name = backend.backend().to_string();

    let server = loopback::bind_or_exit(port, &backend_name, &rendezvous, open_browser);
    println!(
        "[helper] backend: {backend_name} · rendezvous: {rendezvous} · ring: http://127.0.0.1:{}/{}",
        server.port(),
        opencode_informer_helper::contract::RING_PATH.trim_start_matches('/')
    );
    if let Some(pending_hint) = approval_hint(&backend_name, server.port()) {
        println!("[helper] {pending_hint}");
    }

    let (tx, rx) = channel();
    std::thread::spawn(move || {
        if let Err(err) = loopback::serve(server, tx, None) {
            eprintln!("[helper] loopback stopped: {err:#}");
        }
    });

    match backend.run(rx) {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("[helper] peripheral stopped: {err:#}");
            ExitCode::FAILURE
        }
    }
}

fn approval_hint(backend: &str, port: u16) -> Option<String> {
    if backend.starts_with("simulated") {
        Some(format!(
            "LAN-only mode (no BLE advertising): pairing approval at http://127.0.0.1:{port}/"
        ))
    } else {
        Some(format!("pairing approval at http://127.0.0.1:{port}/"))
    }
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn print_help() {
    println!(
        "\
opencode-informer-helper {version}

Cross-platform companion helper for OpenCode Informer. Advertises a BLE
peripheral (doorbell + rendezvous + pairing), serves the local ring endpoint,
and hosts the pairing approval page.

USAGE:
    opencode-informer-helper [OPTIONS]

OPTIONS:
    --port <PORT>   Loopback ring port (default {port})
    --open          Open the approval page in a browser on a pairing request
    --simulate      LAN-only mode: no BLE advertising (also used as a fallback)
    --advertise     Run the helper (alias for the default mode)
    --scan          Scan for the helper's BLE service (diagnostics)
    --selftest      Run hardware-free checks and exit
    -h, --help      Print this help
    -V, --version   Print the version

ENVIRONMENT:
    OC_INFORMER_BRIDGE   Override the plugin bridge base URL
                         (default http://127.0.0.1:38963)
",
        version = env!("CARGO_PKG_VERSION"),
        port = HELPER_PORT,
    );
}
