import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { clearSessionCookie, getSession, readSessionId } from "./lib/session.ts";
import { SITE } from "./config/site.ts";

const DYNAMIC = /^(\/en)?\/(gh(\/|$)|zaloguj|wyloguj$|avatar(\/|$)|otworz$)/;

export const onRequest = defineMiddleware(async ({ request, url, locals }, next) => {
    const id = readSessionId(request);
    const rec = id ? await getSession(env, id) : null;
    locals.viewer = rec ? { token: rec.token, login: rec.login } : null;
    locals.sessionState = rec ? "valid" : id ? "expired" : "none";

    // Copy: redirect and fetched responses have immutable headers.
    const upstream = await next();
    const res = new Response(upstream.body, upstream);
    const h = res.headers;
    const snapshot = h.get("x-pl-snapshot") === "public";
    h.delete("x-pl-snapshot");
    h.set("Referrer-Policy", "same-origin");
    h.set("X-Content-Type-Options", "nosniff");
    if (DYNAMIC.test(url.pathname)) {
        h.set("X-Robots-Tag", "noindex");
        h.set(
            "Cache-Control",
            // HTML is never cached by the browser: every view re-checks access. Only public avatar bytes may be.
            snapshot && url.pathname.startsWith("/avatar/")
                ? `public, max-age=${SITE.cacheSeconds}`
                : "private, no-store",
        );
    }
    if (locals.sessionState === "expired") h.append("Set-Cookie", clearSessionCookie(url.origin));
    return res;
});
