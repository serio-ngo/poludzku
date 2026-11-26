import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { isSynthetic } from "../../lib/auth.ts";
import { createGithub } from "../../lib/github.ts";

export const prerender = false;
export const GET: APIRoute = async ({ params }) => {
    const r = await createGithub({ env }).avatar(params.login ?? "");
    if (!r.ok) return new Response(null, { status: r.reason === "not-found" ? 404 : 502 });
    const type = /^image\/(png|jpeg|gif|webp|svg\+xml)\b/.exec(r.data.contentType)?.[0];
    if (!type || (type === "image/svg+xml" && !isSynthetic(env))) return new Response(null, { status: 502 });
    return new Response(r.data.body, {
        headers: {
            "content-type": type,
            "x-pl-snapshot": "public",
            "x-content-type-options": "nosniff",
            ...(type === "image/svg+xml" ? { "content-security-policy": "default-src 'none'" } : {}),
        },
    });
};
