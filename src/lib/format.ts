const NBSP = String.fromCharCode(160);
const ORPHAN = /(?<=^|[\s(„])([aiouwzAIOUWZ]) /g;
export function glue(text: string): string {
    return text.replace(ORPHAN, `$1${NBSP}`);
}

export const clock = (iso: string): string =>
    new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
