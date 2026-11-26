import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { defaultNext } from "../lib/auth.ts";
import { clearSessionCookie, deleteSession, readSessionId, safeNext } from "../lib/session.ts";

export const prerender = false;
export const ALL: APIRoute = async ({ request, url }) => {
    if (request.method !== "GET" && request.method !== "POST")
        return new Response(null, { status: 405, headers: { allow: "GET, POST" } });
    const id = readSessionId(request);
    if (id) await deleteSession(env, id);
    const next = safeNext(url.searchParams.get("next") ?? defaultNext(url.pathname));
    const headers = new Headers({ location: next });
    headers.append("set-cookie", clearSessionCookie(url.origin));
    return new Response(null, { status: 303, headers });
};
