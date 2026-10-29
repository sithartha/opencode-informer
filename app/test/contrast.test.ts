import test from "node:test"
import assert from "node:assert/strict"
import { SKINS, contrastRatio, readableInk } from "../src/theme"

const TEXT_MIN = 4.5
const UI_MIN = 3

function ratio(a: string, b: string, label: string): number {
  const value = contrastRatio(a, b)
  assert.ok(value !== null, `${label}: ${a} on ${b} is not a solid colour`)
  return value
}

test("every theme keeps body, muted, and badge text readable", () => {
  for (const skin of SKINS) {
    for (const option of skin.options) {
      const theme = skin.resolve(option.id, "light")
      const name = `${skin.id}/${theme.variant}`
      for (const surface of [theme.surface, theme.background]) {
        assert.ok(ratio(theme.text, surface, `${name} text`) >= TEXT_MIN, `${name}: text on ${surface}`)
        assert.ok(ratio(theme.textSecondary, surface, `${name} secondary`) >= TEXT_MIN, `${name}: secondary on ${surface}`)
        assert.ok(ratio(theme.textMuted, surface, `${name} muted`) >= TEXT_MIN, `${name}: muted on ${surface}`)
      }
      assert.ok(ratio(theme.badgeText, theme.badgeBg, `${name} badge`) >= TEXT_MIN, `${name}: badge text`)
      assert.ok(ratio(theme.error, theme.surface, `${name} error`) >= TEXT_MIN, `${name}: error text`)
    }
  }
})

test("every filled control uses a readable label", () => {
  for (const skin of SKINS) {
    for (const option of skin.options) {
      const theme = skin.resolve(option.id, "light")
      const name = `${skin.id}/${theme.variant}`
      const fills: Array<[string, string]> = [
        ["accent gradient", theme.accentGradient[0]],
        ["accent", theme.accent],
        ["allow", theme.allow],
        ["deny", theme.deny],
        ["option", theme.option],
      ]
      for (const [label, fill] of fills) {
        const ink = readableInk(fill)
        assert.ok(ratio(fill, ink, `${name} ${label}`) >= TEXT_MIN, `${name}: ${label} label ${ink} on ${fill}`)
      }
      assert.ok(ratio(theme.inputBorder, theme.surface, `${name} input border`) >= UI_MIN, `${name}: input border`)
    }
  }
})
