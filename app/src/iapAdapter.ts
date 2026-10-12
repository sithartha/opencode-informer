import {
  fetchProducts,
  finishTransaction,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from "react-native-iap"
import type { TipAdapter, TipProduct } from "./purchases"

/** Open the StoreKit connection once at app start. */
export async function initIap(): Promise<void> {
  try {
    await initConnection()
  } catch {
    // StoreKit unavailable (e.g. simulator without a StoreKit config); tips stay disabled.
  }
}

/**
 * StoreKit 2 adapter for consumable tips (react-native-iap). Purchases are event-based:
 * `requestPurchase` starts one and `purchaseUpdatedListener` delivers the result; the
 * matching transaction is finished (consumed) here. Verify on a device with a sandbox
 * account or a `.storekit` configuration.
 */
export function createIapAdapter(): TipAdapter {
  return {
    async getProducts(ids): Promise<TipProduct[]> {
      const products = await fetchProducts({ skus: [...ids], type: "in-app" })
      return (products ?? []).map((product) => ({ id: product.id, price: product.displayPrice ?? "" }))
    },
    async buy(id) {
      return await new Promise<"success" | "pending" | "cancelled">((resolve) => {
        let settled = false
        const done = (status: "success" | "pending" | "cancelled") => {
          if (settled) return
          settled = true
          updated.remove()
          errorSub.remove()
          resolve(status)
        }
        const updated = purchaseUpdatedListener((purchase) => {
          if (purchase.productId !== id) return
          void finishTransaction({ purchase, isConsumable: true }).then(() => done("success"))
        })
        const errorSub = purchaseErrorListener(() => done("cancelled"))
        requestPurchase({ request: { apple: { sku: id } }, type: "in-app" }).catch(() => done("cancelled"))
      })
    },
  }
}
