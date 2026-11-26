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

export const board = <R extends { updatedAt: string; view: View }>(rows: R[], lang: Lang) => {
    const preset = rows.find((r) => r.view.stage)?.view.preset;
    const fits = (r: R) => r.view.stage && r.view.preset === preset;
    const named: [number, string][] =
        preset === "custom"
            ? [...new Map(rows.filter(fits).map((r) => [r.view.stage!.index, stageName(lang, r.view.stageNameKey)] as [number, string]))].sort((a, b) => a[0] - b[0])
            : Object.entries(t(lang).stages[preset as "lifecycle"] ?? {}).map(([i, n]) => [Number(i), n as string]);
    const recent = (a: R, b: R) => b.updatedAt.localeCompare(a.updatedAt);
    const columns: { index: number | null; name: string; rows: R[] }[] = named.map(([index, name]) => ({
        index,
        name,
        rows: rows.filter((r) => fits(r) && r.view.stage!.index === index).sort(recent),
    }));
    const rest = rows.filter((r) => !fits(r)).sort(recent);
    if (rest.length) columns.push({ index: null, name: t(lang).glyph["circle-help"].word, rows: rest });
    return columns;
};

export const tone = (glyph: string): string => {
    const k = { hourglass: "watch", "circle-dashed": "nochange", "circle-check": "nochange", "circle-alert": "change", "circle-pause": "change" }[glyph as "hourglass"];
    return k ? `--c:var(--state-${k});--s:var(--state-${k}-surface)` : "--c:var(--text-faint);--s:var(--surface-card)";
};
