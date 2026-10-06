//! Linux BLE peripheral backed by BlueZ over D-Bus (`bluer`).
//!
//! Serves the GATT service (doorbell notify, rendezvous read, pairing write) and
//! advertises it. If the adapter cannot advertise, the helper falls back to
//! LAN-only mode instead of failing.

use std::sync::mpsc::Receiver;
use std::time::Duration;

use bluer::adv::{Advertisement, AdvertisementHandle};
use bluer::gatt::local::{
    Application, ApplicationHandle, Characteristic, CharacteristicNotify,
    CharacteristicNotifyMethod, CharacteristicRead, CharacteristicWrite, CharacteristicWriteMethod,
    Service,
};
use bluer::{AdapterEvent, DiscoveryFilter, Uuid};
use futures::FutureExt;
use futures::StreamExt;
use serde_json::Value;
use tokio::sync::watch;

use super::Peripheral;
use crate::contract;

pub struct LinuxPeripheral {
    rendezvous: String,
}

impl LinuxPeripheral {
    pub fn new(rendezvous: String) -> Self {
        Self { rendezvous }
    }
}

impl Peripheral for LinuxPeripheral {
    fn backend(&self) -> &'static str {
        "linux/bluez"
    }

    fn run(self: Box<Self>, doorbells: Receiver<Value>) -> anyhow::Result<()> {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()?;
        runtime.block_on(run_async(self.rendezvous, doorbells))
    }
}

async fn run_async(rendezvous: String, doorbells: Receiver<Value>) -> anyhow::Result<()> {
    // Bridge the std doorbell channel to a `watch` that always holds the latest
    // doorbell, so a subscriber that connects later still receives the last one.
    let (watch_tx, watch_rx) = watch::channel::<Option<Vec<u8>>>(None);
    std::thread::spawn(move || {
        while let Ok(payload) = doorbells.recv() {
            let bytes = serde_json::to_vec(&payload).unwrap_or_default();
            watch_tx.send(Some(bytes)).ok();
        }
    });

    let handles = prepare(rendezvous, watch_rx).await;
    if let Err(err) = &handles {
        eprintln!("[linux] BLE unavailable: {err:#}");
        eprintln!(
            "[linux] continuing in LAN-only mode: the phone can still connect by \
             address; background wake is disabled"
        );
    }

    // Hold the app/advertisement handles (when setup succeeded) for the life of the
    // process so the service stays registered.
    let _keep_alive = handles;
    futures::future::pending::<()>().await;
    Ok(())
}

async fn prepare(
    rendezvous: String,
    watch_rx: watch::Receiver<Option<Vec<u8>>>,
) -> anyhow::Result<(ApplicationHandle, AdvertisementHandle)> {
    let session = bluer::Session::new().await?;
    let adapter = session.default_adapter().await?;
    adapter.set_powered(true).await?;
    println!(
        "[linux] adapter {} ({})",
        adapter.name(),
        adapter.address().await?
    );

    let service_uuid = parse_uuid(contract::SERVICE_UUID)?;
    let doorbell_uuid = parse_uuid(contract::DOORBELL_UUID)?;
    let rendezvous_uuid = parse_uuid(contract::RENDEZVOUS_UUID)?;
    let pairing_uuid = parse_uuid(contract::PAIRING_UUID)?;

    let rendezvous_bytes = rendezvous.into_bytes();

    let doorbell_rx = watch_rx.clone();
    let doorbell = Characteristic {
        uuid: doorbell_uuid,
        notify: Some(CharacteristicNotify {
            notify: true,
            method: CharacteristicNotifyMethod::Fun(Box::new(move |mut notifier| {
                let mut rx = doorbell_rx.clone();
                async move {
                    tokio::spawn(async move {
                        // Publish the last doorbell first, then stream new ones.
                        // Bind the clone before awaiting so the `watch` read guard
                        // (not `Send`) is dropped before the await.
                        let latest = rx.borrow_and_update().clone();
                        if let Some(bytes) = latest {
                            if notifier.notify(bytes).await.is_err() {
                                return;
                            }
                        }
                        while rx.changed().await.is_ok() {
                            let latest = rx.borrow_and_update().clone();
                            if let Some(bytes) = latest {
                                if notifier.notify(bytes).await.is_err() {
                                    break;
                                }
                            }
                        }
                    });
                }
                .boxed()
            })),
            ..Default::default()
        }),
        ..Default::default()
    };

    let rendezvous_char = Characteristic {
        uuid: rendezvous_uuid,
        read: Some(CharacteristicRead {
            read: true,
            fun: Box::new(move |_req| {
                let value = rendezvous_bytes.clone();
                async move { Ok(value) }.boxed()
            }),
            ..Default::default()
        }),
        ..Default::default()
    };

    let pairing = Characteristic {
        uuid: pairing_uuid,
        write: Some(CharacteristicWrite {
            write: true,
            write_without_response: true,
            method: CharacteristicWriteMethod::Fun(Box::new(move |new_value, _req| {
                async move {
                    println!("[linux] pairing write: {} byte(s)", new_value.len());
                    Ok(())
                }
                .boxed()
            })),
            ..Default::default()
        }),
        ..Default::default()
    };

    let app = Application {
        services: vec![Service {
            uuid: service_uuid,
            primary: true,
            characteristics: vec![doorbell, rendezvous_char, pairing],
            ..Default::default()
        }],
        ..Default::default()
    };
    let app_handle = adapter.serve_gatt_application(app).await?;

    let advertisement = Advertisement {
        service_uuids: [service_uuid].into_iter().collect(),
        local_name: Some(contract::LOCAL_NAME.to_string()),
        discoverable: Some(true),
        ..Default::default()
    };
    let adv_handle = adapter.advertise(advertisement).await?;
    println!("[linux] advertising {}", contract::LOCAL_NAME);
    Ok((app_handle, adv_handle))
}

fn parse_uuid(value: &str) -> anyhow::Result<Uuid> {
    Uuid::parse_str(value).map_err(|e| anyhow::anyhow!("invalid UUID {value}: {e}"))
}

/// Scan for the helper's BLE service (diagnostics).
pub fn scan() -> anyhow::Result<()> {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    runtime.block_on(scan_async())
}

async fn scan_async() -> anyhow::Result<()> {
    let session = bluer::Session::new().await?;
    let adapter = session.default_adapter().await?;
    adapter.set_powered(true).await?;

    let filter = DiscoveryFilter {
        uuids: [parse_uuid(contract::SERVICE_UUID)?].into_iter().collect(),
        ..Default::default()
    };
    adapter.set_discovery_filter(filter).await?;

    let events = adapter.discover_devices().await?;
    futures::pin_mut!(events);
    let timeout = tokio::time::sleep(Duration::from_secs(10));
    tokio::pin!(timeout);

    println!("[scan] scanning 10s for {} ...", contract::LOCAL_NAME);
    let mut found = false;
    loop {
        tokio::select! {
            _ = &mut timeout => break,
            event = events.next() => match event {
                Some(AdapterEvent::DeviceAdded(addr)) => {
                    if let Ok(device) = adapter.device(addr) {
                        let name = device.name().await.unwrap_or_default();
                        println!("[scan] found {addr} {:?}", name);
                        found = true;
                    }
                }
                Some(_) => {}
                None => break,
            }
        }
    }
    if found {
        Ok(())
    } else {
        anyhow::bail!("no {} peripheral found", contract::LOCAL_NAME)
    }
}
