import { SITE } from "../config/site.ts";
import { safeNext } from "./session.ts";

type Env = Record<string, any>;

// The deployed origin wins except on localhost, where the request origin is the dev server.
export const originOf = (url: URL, env: Env): string =>
    url.hostname === "localhost" ? url.origin : (env.SITE_ORIGIN ?? url.origin);
export const callbackUrl = (origin: string) => `${origin}/zaloguj/callback`;
// No scope: a GitHub App user token carries the App's permissions.
export const authorizeUrl = (clientId: string, redirectUri: string, state: string) => {
    const u = new URL("https://github.com/login/oauth/authorize");
    u.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state }).toString();
    return u.href;
};
// Never synthetic in production, whatever else is set.
export const isSynthetic = (env: Env) =>
    env.SITE_ORIGIN !== SITE.url &&
    (env.GITHUB_UPSTREAM === "synthetic" || (!env.GITHUB_CLIENT_ID && env.GITHUB_UPSTREAM !== "gh"));
// Local `gh` mode without an App: the server already reads as the developer, so sign-in has nothing to do.
export const isLocalGh = (env: Env) =>
    env.SITE_ORIGIN !== SITE.url && env.GITHUB_UPSTREAM === "gh" && !env.GITHUB_CLIENT_ID;
export const syntheticCode = (as: string | null) => (as === "ben" ? "synthetic-ben" : "synthetic-ola");

export const langOf = (next: string) => (/^\/en(\/|$)/.test(next) ? "en" : "pl");
export const defaultNext = (pathname: string) => (langOf(pathname) === "en" ? "/en" : "/");

const attrs = (origin: string, maxAge: number) =>
    `Max-Age=${maxAge}; Path=/zaloguj; HttpOnly; SameSite=Lax${origin.startsWith("https:") ? "; Secure" : ""}`;
export const nextCookie = (next: string, origin: string) =>
    `pl_next=${encodeURIComponent(next)}; ${attrs(origin, 600)}`;
export const clearOauthCookies = (origin: string) =>
    ["pl_oauth", "pl_next"].map((n) => `${n}=; ${attrs(origin, 0)}`);
export const readNext = (request: Request) => {
    const v = /(?:^|;\s*)pl_next=([^;]*)/.exec(request.headers.get("cookie") ?? "")?.[1] ?? "";
    return safeNext(new URLSearchParams(`n=${v.replace(/\+/g, "%2B")}`).get("n"));
};
