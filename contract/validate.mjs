import { readFileSync } from "node:fs"

/** Load the shared wire contract from contract.json. */
export function loadContract() {
  return JSON.parse(readFileSync(new URL("./contract.json", import.meta.url), "utf8"))
}

/**
 * Validate every fixture against the schemas declared in the contract.
 * Returns an array of human-readable errors (empty means valid).
 */
export function validateContract(contract) {
  const errors = []
  const schemas = contract.schemas || {}

  for (const ev of contract.streamEvents || []) {
    if (!schemas[ev]) errors.push(`stream event "${ev}" has no schema`)
  }

  for (const [name, fixture] of Object.entries(contract.fixtures || {})) {
    if (!fixture || typeof fixture !== "object") {
      errors.push(`fixture "${name}" is not an object`)
      continue
    }
    const schema = schemas[fixture.schema]
    if (!schema) {
      errors.push(`fixture "${name}" references unknown schema "${fixture.schema}"`)
      continue
    }
    if (!fixture.value || typeof fixture.value !== "object") {
      errors.push(`fixture "${name}" has no object value`)
      continue
    }
    for (const key of schema.required || []) {
      if (!(key in fixture.value)) errors.push(`fixture "${name}" is missing required field "${key}"`)
    }
  }

  return errors
}
