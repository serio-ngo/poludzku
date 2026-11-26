import { t, type View as Base } from "../locales/index.ts";

export type Lang = "pl" | "en";
type Key = string | { custom: string | { pl: string; en: string } } | null;
export type View = Base & { stageNameKey: Key; nextNameKey: Key; healthGlyph: string; moverGlyph: string; stateGlyph: string };

export const stageName = (lang: Lang, key: Key): string => {
    if (!key) return "";
    if (typeof key === "object") return typeof key.custom === "string" ? key.custom : key.custom[lang];
    const [preset, i] = key.split(".");
    return t(lang).stages[preset as "lifecycle" | "generic"][Number(i)] ?? "";
};

export const tone = (glyph: string): string => {
    const k = { hourglass: "watch", "circle-dashed": "nochange", "circle-check": "nochange", "circle-alert": "change", "circle-pause": "change" }[glyph as "hourglass"];
    return k ? `--c:var(--state-${k});--s:var(--state-${k}-surface)` : "--c:var(--text-faint);--s:var(--surface-card)";
};
