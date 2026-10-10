import test from "node:test"
import assert from "node:assert/strict"
import {
  DEFAULT_OPTION,
  DEFAULT_SKIN,
  SKINS,
  TUNES_GOLD,
  defaultOptionFor,
  isSkinId,
  markTint,
  migrateStoredTheme,
  resolveTheme,
  skinDef,
} from "../src/theme"

test("the catalog exposes the skins", () => {
  assert.deepEqual(SKINS.map((skin) => skin.id), ["default", "evangelion", "sanrio", "starwars", "tunes", "classic-os"])
  assert.deepEqual(skinDef("default").options.map((option) => option.id), ["light", "dark", "system"])
  assert.deepEqual(skinDef("evangelion").options.map((option) => option.id), ["unit00", "unit01", "unit02"])
  assert.deepEqual(skinDef("sanrio").options.map((option) => option.id), ["kitty", "chococat", "system"])
  assert.deepEqual(skinDef("starwars").options.map((option) => option.id), ["sith", "jedi", "system"])
  assert.deepEqual(skinDef("tunes").options.map((option) => option.id), ["classic", "bento", "system"])
  assert.deepEqual(skinDef("classic-os").options.map((option) => option.id), ["blue", "dark", "system"])
})

test("the tunes and classic os variants resolve to their palettes", () => {
  assert.equal(resolveTheme("tunes", "classic").dark, true)
  assert.equal(resolveTheme("tunes", "bento").dark, false)
  assert.equal(resolveTheme("classic-os", "blue").dark, false)
  assert.equal(resolveTheme("classic-os", "dark").dark, true)
  // System follows the phone: light → Bento/Blue, dark → Classic/Dark.
  assert.equal(resolveTheme("tunes", "system", "light").variant, "bento")
  assert.equal(resolveTheme("tunes", "system", "dark").variant, "classic")
  assert.equal(resolveTheme("classic-os", "system", "light").variant, "blue")
  assert.equal(resolveTheme("classic-os", "system", "dark").variant, "dark")
  // An invalid option falls back to the skin default.
  assert.equal(resolveTheme("tunes", "blue").variant, "classic")
  assert.equal(resolveTheme("classic-os", "sith").variant, "blue")
})

test("the tunes mark is gold on the dark variant and the accent on the light one", () => {
  assert.equal(markTint(resolveTheme("tunes", "classic")), TUNES_GOLD)
  assert.equal(markTint(resolveTheme("tunes", "bento")), resolveTheme("tunes", "bento").accent)
  assert.equal(markTint(resolveTheme("starwars", "sith")), resolveTheme("starwars", "sith").accent)
})

test("star wars variants resolve sith/jedi and system", () => {
  assert.equal(resolveTheme("starwars", "sith").dark, true)
  assert.equal(resolveTheme("starwars", "jedi").dark, false)
  assert.equal(resolveTheme("starwars", "system", "dark").dark, true)
  assert.equal(resolveTheme("starwars", "system", "light").dark, false)
})

test("resolveTheme resolves per skin and follows the system scheme", () => {
  assert.equal(resolveTheme("default", "light").dark, false)
  assert.equal(resolveTheme("default", "dark").dark, true)
  assert.equal(resolveTheme("default", "system", "dark").dark, true)
  assert.equal(resolveTheme("default", "system", "light").dark, false)
  assert.equal(resolveTheme("evangelion", "unit00").dark, false)
  assert.equal(resolveTheme("evangelion", "unit02").dark, true)
  // An invalid option falls back to the skin default; an unknown skin to default.
  assert.equal(resolveTheme("evangelion", "light").skin, "evangelion")
  assert.equal(resolveTheme("bogus", "light").skin, "default")
})

test("skin defaults", () => {
  assert.equal(defaultOptionFor("default"), "system")
  assert.equal(defaultOptionFor("evangelion"), "unit01")
  assert.equal(defaultOptionFor("tunes"), "classic")
  assert.equal(defaultOptionFor("classic-os"), "blue")
  assert.equal(DEFAULT_SKIN, "default")
  assert.equal(DEFAULT_OPTION, "system")
})

test("each unit has a distinct accent and secondary accent", () => {
  const accents = new Set(SKINS.map((skin) => skin.resolve(skin.defaultOption).accent))
  const secondary = new Set(SKINS.map((skin) => skin.resolve(skin.defaultOption).secondaryAccent))
  assert.equal(accents.size, SKINS.length)
  assert.equal(secondary.size, SKINS.length)
})

test("isSkinId accepts only known skins", () => {
  assert.equal(isSkinId("default"), true)
  assert.equal(isSkinId("evangelion"), true)
  assert.equal(isSkinId("tunes"), true)
  assert.equal(isSkinId("classic-os"), true)
  assert.equal(isSkinId("unit01"), false)
})

test("migrateStoredTheme maps legacy values", () => {
  assert.deepEqual(migrateStoredTheme("dark"), { skin: "default", option: "dark" })
  assert.deepEqual(migrateStoredTheme("system"), { skin: "default", option: "system" })
  assert.deepEqual(migrateStoredTheme("unit02"), { skin: "evangelion", option: "unit02" })
  assert.equal(migrateStoredTheme("nope"), null)
  assert.equal(migrateStoredTheme(null), null)
})

test("theme names are renamed and de-trademarked", () => {
  assert.equal(skinDef("default").name, "Default")
  assert.equal(skinDef("evangelion").name, "Nerv")
  assert.equal(skinDef("sanrio").name, "Cat")
  assert.equal(skinDef("starwars").name, "The Force")
  assert.equal(skinDef("tunes").name, "Tunes")
  assert.equal(skinDef("classic-os").name, "Classic OS")
  const banned = /evangelion|hello kitty|chococat|sanrio|star wars|sith|jedi|winamp|windows|luna|bento/i
  for (const skin of SKINS) {
    assert.doesNotMatch(skin.name, banned, `${skin.id} name`)
    assert.doesNotMatch(skin.description, banned, `${skin.id} description`)
  }
})
