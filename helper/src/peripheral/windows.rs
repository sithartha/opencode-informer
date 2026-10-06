//! Windows BLE peripheral backed by WinRT: a local GATT service via
//! `GattServiceProvider` (doorbell notify, rendezvous read, pairing write) plus
//! advertising. Falls back to LAN-only mode if the provider/adapter cannot advertise.

use std::sync::mpsc::Receiver;
use std::time::Duration;

use anyhow::{bail, Context};
use futures::executor::block_on;
use serde_json::Value;
use windows::core::GUID;
use windows::Devices::Bluetooth::Advertisement::{
    BluetoothLEAdvertisementReceivedEventArgs, BluetoothLEAdvertisementWatcher,
};
use windows::Devices::Bluetooth::GenericAttributeProfile::{
    GattCharacteristicProperties, GattLocalCharacteristic, GattLocalCharacteristicParameters,
    GattLocalService, GattServiceProvider, GattServiceProviderAdvertisingParameters,
    GattWriteRequestedEventArgs,
};
use windows::Foundation::TypedEventHandler;
use windows::Storage::Streams::{DataWriter, IBuffer};

use super::Peripheral;
use crate::contract;

pub struct WindowsPeripheral {
    rendezvous: String,
}

impl WindowsPeripheral {
    pub fn new(rendezvous: String) -> Self {
        Self { rendezvous }
    }
}

impl Peripheral for WindowsPeripheral {
    fn backend(&self) -> &'static str {
        "windows/winrt"
    }

    fn run(self: Box<Self>, doorbells: Receiver<Value>) -> anyhow::Result<()> {
        match serve(&self.rendezvous) {
            Ok(served) => run_doorbells(served, doorbells),
            Err(err) => {
                eprintln!("[windows] BLE unavailable: {err:#}");
                eprintln!(
                    "[windows] continuing in LAN-only mode: the phone can still connect by \
                     address; background wake is disabled"
                );
                drain(doorbells);
                Ok(())
            }
        }
    }
}

/// Handles kept alive for the process lifetime so the service stays registered.
struct Served {
    _provider: GattServiceProvider,
    _service: GattLocalService,
    _rendezvous: GattLocalCharacteristic,
    _pairing: GattLocalCharacteristic,
    doorbell: GattLocalCharacteristic,
}

fn serve(rendezvous: &str) -> anyhow::Result<Served> {
    let service_guid = guid(contract::SERVICE_UUID)?;

    let provider = block_on(async move {
        let operation = GattServiceProvider::CreateAsync(service_guid)?;
        let result = operation.await?;
        Ok::<_, anyhow::Error>(result.ServiceProvider()?)
    })?;
    let service = provider.Service()?;

    let rendezvous_char = block_on(characteristic(
        &service,
        guid(contract::RENDEZVOUS_UUID)?,
        GattCharacteristicProperties::Read,
        Some(rendezvous.as_bytes().to_vec()),
    ))?;
    let doorbell_char = block_on(characteristic(
        &service,
        guid(contract::DOORBELL_UUID)?,
        GattCharacteristicProperties::Notify,
        None,
    ))?;
    let pairing_char = block_on(characteristic(
        &service,
        guid(contract::PAIRING_UUID)?,
        GattCharacteristicProperties::Write | GattCharacteristicProperties::WriteWithoutResponse,
        None,
    ))?;

    // Accept pairing writes and acknowledge them.
    pairing_char.WriteRequested(&TypedEventHandler::<
        GattLocalCharacteristic,
        GattWriteRequestedEventArgs,
    >::new(|_sender, args| {
        let args = args.ok()?;
        let operation = args.GetRequestAsync()?;
        std::thread::spawn(move || {
            if let Ok(request) = block_on(async move { operation.await }) {
                println!("[windows] pairing write received");
                let _ = request.Respond();
            }
        });
        Ok(())
    }))?;

    let advertising = GattServiceProviderAdvertisingParameters::new()?;
    advertising.SetIsConnectable(true)?;
    advertising.SetIsDiscoverable(true)?;
    provider.StartAdvertisingWithParameters(&advertising)?;

    Ok(Served {
        _provider: provider,
        _service: service,
        _rendezvous: rendezvous_char,
        _pairing: pairing_char,
        doorbell: doorbell_char,
    })
}

async fn characteristic(
    service: &GattLocalService,
    uuid: GUID,
    properties: GattCharacteristicProperties,
    static_value: Option<Vec<u8>>,
) -> anyhow::Result<GattLocalCharacteristic> {
    let parameters = GattLocalCharacteristicParameters::new()?;
    parameters.SetCharacteristicProperties(properties)?;
    if let Some(bytes) = static_value {
        parameters.SetStaticValue(&buffer_from_bytes(&bytes)?)?;
    }
    let result = service
        .CreateCharacteristicAsync(uuid, &parameters)?
        .await?;
    Ok(result.Characteristic()?)
}

fn run_doorbells(served: Served, doorbells: Receiver<Value>) -> anyhow::Result<()> {
    println!("[windows] advertising {}", contract::LOCAL_NAME);
    while let Ok(payload) = doorbells.recv() {
        let bytes = serde_json::to_vec(&payload).unwrap_or_default();
        let buffer = match buffer_from_bytes(&bytes) {
            Ok(buffer) => buffer,
            Err(err) => {
                eprintln!("[windows] could not build doorbell buffer: {err:#}");
                continue;
            }
        };
        let notify = async {
            served.doorbell.NotifyValueAsync(&buffer)?.await?;
            Ok::<(), windows::core::Error>(())
        };
        if let Err(err) = block_on(notify) {
            eprintln!("[windows] notify failed: {err}");
        }
    }
    Ok(())
}

fn drain(doorbells: Receiver<Value>) {
    while let Ok(payload) = doorbells.recv() {
        let kind = payload
            .get("kind")
            .and_then(Value::as_str)
            .unwrap_or("unknown");
        println!("[windows] (LAN-only) doorbell: {kind}");
    }
}

fn buffer_from_bytes(bytes: &[u8]) -> anyhow::Result<IBuffer> {
    let writer = DataWriter::new()?;
    writer.WriteBytes(bytes)?;
    Ok(writer.DetachBuffer()?)
}

fn guid(value: &str) -> anyhow::Result<GUID> {
    let uuid = uuid::Uuid::parse_str(value).with_context(|| format!("invalid UUID {value}"))?;
    Ok(GUID::from_u128(uuid.as_u128()))
}

/// Scan for the helper's BLE service (diagnostics).
pub fn scan() -> anyhow::Result<()> {
    let service_guid = guid(contract::SERVICE_UUID)?;
    let watcher = BluetoothLEAdvertisementWatcher::new()?;
    let (tx, rx) = std::sync::mpsc::channel::<String>();

    watcher.Received(&TypedEventHandler::<
        BluetoothLEAdvertisementWatcher,
        BluetoothLEAdvertisementReceivedEventArgs,
    >::new(move |_sender, args| {
        let args = args.ok()?;
        if let Ok(advertisement) = args.Advertisement() {
            if let Ok(uuids) = advertisement.ServiceUuids() {
                for index in 0..uuids.Size().unwrap_or(0) {
                    if let Ok(uuid) = uuids.GetAt(index) {
                        if uuid == service_guid {
                            let _ = tx.send(format!("match at index {index}"));
                        }
                    }
                }
            }
        }
        Ok(())
    }))?;

    watcher.Start()?;
    println!("[scan] scanning 10s for {} ...", contract::LOCAL_NAME);
    let result = rx.recv_timeout(Duration::from_secs(10));
    watcher.Stop()?;

    match result {
        Ok(description) => {
            println!("[scan] found the helper's service ({description})");
            Ok(())
        }
        Err(_) => bail!("no {} peripheral found", contract::LOCAL_NAME),
    }
}
