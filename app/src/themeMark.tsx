import { Image, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { markTint, type Theme } from "./theme"
import { MONO_FONT, TERMINAL_MARK, TERMINAL_OI_ART } from "./terminalArt"

// Theme marks. Star Wars emblems are public-domain (Wikimedia); the Evangelion unit
// art and the Sanrio characters are trademarks of their owners - used here per request.
import rebelImg from "../assets/logos/rebel.png"
import empireImg from "../assets/logos/empire.png"
import kittyImg from "../assets/logos/kitty.png"
import chococatImg from "../assets/logos/chococat.png"
import eva00Img from "../assets/logos/eva00.png"
import eva01Img from "../assets/logos/eva01.png"
import eva02Img from "../assets/logos/eva02.png"
import boltImg from "../assets/logos/bolt.png"
import osImg from "../assets/logos/os.png"
import crestGryffindor from "../assets/logos/crest-gryffindor.png"
import crestSlytherin from "../assets/logos/crest-slytherin.png"
import crestRavenclaw from "../assets/logos/crest-ravenclaw.png"
import crestHufflepuff from "../assets/logos/crest-hufflepuff.png"

const CRESTS: Record<string, number> = {
  gryffindor: crestGryffindor,
  slytherin: crestSlytherin,
  ravenclaw: crestRavenclaw,
  hufflepuff: crestHufflepuff,
}

const EVA_HEADS: Record<string, number> = { unit00: eva00Img, unit01: eva01Img, unit02: eva02Img }

/** The mark for the theme, shown in the header and as the hero watermark. */
export function ThemeMark({ theme, size = 30 }: { theme: Theme; size?: number }) {
  const box = { width: size, height: size }
  if (theme.skin === "starwars") {
    return <Image source={theme.variant === "sith" ? empireImg : rebelImg} style={[box, { tintColor: markTint(theme) }]} resizeMode="contain" />
  }
  if (theme.skin === "evangelion") {
    return <Image source={EVA_HEADS[theme.variant ?? "unit01"] ?? eva01Img} style={box} resizeMode="contain" />
  }
  if (theme.skin === "sanrio") {
    return <Image source={theme.variant === "chococat" ? chococatImg : kittyImg} style={box} resizeMode="contain" />
  }
  if (theme.skin === "tunes") {
    return <Image source={boltImg} style={[box, { tintColor: markTint(theme) }]} resizeMode="contain" />
  }
  if (theme.skin === "classic-os") {
    return <Image source={osImg} style={box} resizeMode="contain" />
  }
  if (theme.skin === "wizard") {
    return <Image source={CRESTS[theme.variant ?? "gryffindor"] ?? crestGryffindor} style={box} resizeMode="contain" />
  }
  if (theme.skin === "terminal") {
    return <TerminalMark theme={theme} size={size} />
  }
  return <DefaultMark theme={theme} size={size} />
}

/** The Terminal skin's mark: a prompt glyph in a square frame, or the ASCII "OI" art at hero size. */
function TerminalMark({ theme, size }: { theme: Theme; size: number }) {
  if (size >= 100) {
    const fontSize = Math.round(size / 7.5)
    return (
      <Text style={{ color: theme.text, fontFamily: MONO_FONT, fontSize, lineHeight: Math.round(fontSize * 1.1), textAlign: "left" }}>
        {TERMINAL_OI_ART.join("\n")}
      </Text>
    )
  }
  return (
    <View style={{ width: size, height: size, borderWidth: 1, borderColor: theme.text, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: theme.text, fontFamily: MONO_FONT, fontSize: Math.round(size * 0.38), fontWeight: "700", lineHeight: Math.round(size * 0.5) }}>
        {TERMINAL_MARK}
      </Text>
    </View>
  )
}

function DefaultMark({ theme, size }: { theme: Theme; size: number }) {
  return (
    <LinearGradient
      colors={theme.accentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: size * 0.43, letterSpacing: 0.3 }}>OI</Text>
    </LinearGradient>
  )
}
