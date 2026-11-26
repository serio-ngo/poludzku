import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
    authorizeUrl,
    callbackUrl,
    defaultNext,
    isLocalGh,
    isSynthetic,
    nextCookie,
    originOf,
    syntheticCode,
} from "../../lib/auth.ts";
import { SITE } from "../../config/site.ts";
import { makeState, safeNext } from "../../lib/session.ts";

export const prerender = false;
export const GET: APIRoute = ({ url }) => {
    const origin = originOf(url);
    const next = safeNext(url.searchParams.get("next") ?? defaultNext(url.pathname));
    if (isLocalGh(env, url))
        return new Response(null, { status: 302, headers: { location: next } });
    const { state, cookie } = makeState(origin);
    const callback = callbackUrl(origin);
    const to = isSynthetic(env)
        ? `${callback}?${new URLSearchParams({ code: syntheticCode(url.searchParams.get("as")), state })}`
        : authorizeUrl(SITE.app.clientId, callback, state);
    const headers = new Headers({ location: to });
    headers.append("set-cookie", cookie);
    headers.append("set-cookie", nextCookie(next, origin));
    return new Response(null, { status: 302, headers });
};
