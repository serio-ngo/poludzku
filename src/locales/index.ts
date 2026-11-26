import pl from "./pl.ts"
import en from "./en.ts"

export type { View } from "./pl.ts"
export type Dict = typeof pl
export const t = (lang: "pl" | "en"): Dict => (lang === "en" ? en : pl)
