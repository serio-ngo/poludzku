const NBSP = String.fromCharCode(160);
// Polish orphan rule: a one-letter word never ends a line.
const ORPHAN = /(?<=^|[\s(„])([aiouwzAIOUWZ]) /g;
export function glue(text: string): string {
    return text.replace(ORPHAN, `$1${NBSP}`);
}

/** Read time as HH:MM in Warsaw. */
export const clock = (iso: string): string =>
    new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
