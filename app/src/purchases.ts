// Tip purchases (StoreKit 2) behind a small adapter so the logic is testable without the
// native module. Real adapter: app/src/iapAdapter.ts (imported by the app, not by tests).

export const TIP_IDS = [
  "ru.opencode.informer.tip.1",
  "ru.opencode.informer.tip.2",
  "ru.opencode.informer.tip.3",
] as const

export type TipId = (typeof TIP_IDS)[number]

export interface TipProduct {
  id: string
  /** The store-localized price, e.g. "$0.99" (from StoreKit, not hard-coded). */
  price: string
}

export type TipStatus = "success" | "pending" | "cancelled" | "error"

export interface TipResult {
  status: TipStatus
  error?: string
}

export interface TipAdapter {
  /** Fetch the store products for the given ids. */
  getProducts(ids: readonly string[]): Promise<TipProduct[]>
  /** Run a consumable purchase end to end (including finishing the transaction). */
  buy(id: string): Promise<Exclude<TipStatus, "error">>
}

/**
 * The optional tip jar: loads the three products and buys a tip. Tips grant no content,
 * so there is no entitlement state, no cache, and no restore.
 */
export class TipStore {
  private products: TipProduct[] = []

  constructor(private readonly adapter: TipAdapter) {}

  /** The loaded products (empty until `load` succeeds). */
  get available(): TipProduct[] {
    return this.products
  }

  async load(): Promise<TipProduct[]> {
    this.products = await this.adapter.getProducts(TIP_IDS)
    return this.products
  }

  async buy(id: string): Promise<TipResult> {
    try {
      return { status: await this.adapter.buy(id) }
    } catch (error) {
      return { status: "error", error: error instanceof Error ? error.message : String(error) }
    }
  }
}
