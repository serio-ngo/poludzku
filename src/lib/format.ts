const NBSP = String.fromCharCode(160);
// Polish orphan rule: a one-letter word never ends a line.
const ORPHAN = /(?<=^|[\s(„])([aiouwzAIOUWZ]) /g;
export function glue(text: string): string {
    return text.replace(ORPHAN, `$1${NBSP}`);
}
