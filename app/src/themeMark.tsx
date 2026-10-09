import { Image, Text } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import type { Theme } from "./theme"

// Theme marks. Star Wars emblems are public-domain (Wikimedia); the Evangelion unit
// art and the Sanrio characters are trademarks of their owners - used here per request.
import rebelImg from "../assets/logos/rebel.png"
import empireImg from "../assets/logos/empire.png"
import kittyImg from "../assets/logos/kitty.png"
import chococatImg from "../assets/logos/chococat.png"
import eva00Img from "../assets/logos/eva00.png"
import eva01Img from "../assets/logos/eva01.png"
import eva02Img from "../assets/logos/eva02.png"

const EVA_HEADS: Record<string, number> = { unit00: eva00Img, unit01: eva01Img, unit02: eva02Img }

/** The mark for the theme, shown in the header and as the hero watermark. */
export function ThemeMark({ theme, size = 30 }: { theme: Theme; size?: number }) {
  const box = { width: size, height: size }
  if (theme.skin === "starwars") {
    return <Image source={theme.variant === "sith" ? empireImg : rebelImg} style={[box, { tintColor: theme.accent }]} resizeMode="contain" />
  }
  if (theme.skin === "evangelion") {
    return <Image source={EVA_HEADS[theme.variant ?? "unit01"] ?? eva01Img} style={box} resizeMode="contain" />
  }
  if (theme.skin === "sanrio") {
    return <Image source={theme.variant === "chococat" ? chococatImg : kittyImg} style={box} resizeMode="contain" />
  }
  return <DefaultMark theme={theme} size={size} />
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
