const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const SAFE = /^[A-Za-z0-9._-]{1,100}$/;
const DOTS = /^\.+$/;

export function entryPath(input: string): string | null {
    const s = input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
    const [owner, rawRepo, kind, ...rest] = s.split("/");
    const repo = rawRepo?.replace(/\.git$/, "");
    if (!owner || !repo || !OWNER.test(owner) || !REPO.test(repo) || DOTS.test(repo)) return null;
    const base = `/gh/${owner}/${repo}`;
    if ((kind === "issues" || kind === "pull") && /^\d{1,9}$/.test(rest[0] ?? "")) return `${base}/${rest[0]}`;
    if (kind === "tree" && rest.length && rest.every((p) => SAFE.test(p) && !DOTS.test(p))) return `${base}/tree/${rest.join("/")}`;
    return base;
}

export const langPrefix = (lang: "pl" | "en") => (lang === "en" ? "/en" : "");
export const GAME_API = "/api/game";

export function entryRedirect(url: URL, lang: "pl" | "en"): Response {
    const prefix = langPrefix(lang);
    const path = entryPath(url.searchParams.get("r") ?? "");
    return new Response(null, {
        status: 302,
        headers: { Location: path ? prefix + path : prefix || "/", "Cache-Control": "private, no-store" },
    });
}
