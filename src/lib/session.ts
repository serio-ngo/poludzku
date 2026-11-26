import { SITE } from "../config/site.ts";

export type SessionRec = { token: string; login: string; expiresAt: number };
type Stub = {
    put(r: SessionRec): Promise<void>;
    get(): Promise<SessionRec | null>;
    delete(): Promise<void>;
};
type Store = {
    put(k: string, v: SessionRec): Promise<void>;
    get(k: string): Promise<SessionRec | undefined>;
    deleteAll(): Promise<void>;
    setAlarm(t: number): Promise<void>;
    deleteAlarm(): Promise<void>;
};

// Durable Object logic, kept free of cloudflare:workers so node tests can import it.
export async function deleteRec(s: Store) {
    await s.deleteAll();
    await s.deleteAlarm();
}
export async function putRec(s: Store, rec: SessionRec, now = Date.now()) {
    const expiresAt = Math.min(rec.expiresAt, now + SITE.sessionHours * 3_600_000);
    await s.put("rec", { ...rec, expiresAt });
    await s.setAlarm(expiresAt);
}
export async function getRec(s: Store, now = Date.now()) {
    const rec = await s.get("rec");
    if (!rec) return null;
    if (rec.expiresAt <= now) {
        await deleteRec(s);
        return null;
    }
    return rec;
}

const ID = /^[0-9a-f]{64}$/;
type Env = { SESSIONS: DurableObjectNamespace };
const stub = (env: Env, id: string) =>
    env.SESSIONS.get(env.SESSIONS.idFromName(id)) as unknown as Stub;

export const newId = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0"),
    ).join("");

export async function createSession(env: Env, rec: SessionRec) {
    const id = newId();
    await stub(env, id).put(rec);
    return id;
}
export async function getSession(env: Env, id: string) {
    return ID.test(id) ? stub(env, id).get() : null;
}
export async function deleteSession(env: Env, id: string) {
    if (ID.test(id)) await stub(env, id).delete();
}

const secure = (origin: string) => origin.startsWith("https:");
const sessionName = (origin: string) => (secure(origin) ? "__Host-pl_session" : "pl_session");
const attrs = (origin: string, maxAge: number) =>
    `Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure(origin) ? "; Secure" : ""}`;

export const sessionCookie = (id: string, origin: string, maxAge: number) =>
    `${sessionName(origin)}=${id}; ${attrs(origin, maxAge)}`;
export const clearSessionCookie = (origin: string) =>
    `${sessionName(origin)}=; ${attrs(origin, 0)}`;

function cookie(request: Request, name: string) {
    for (const part of (request.headers.get("cookie") ?? "").split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return v.join("=");
    }
    return null;
}
export const readSessionId = (request: Request) =>
    cookie(request, sessionName(new URL(request.url).origin));

export function makeState(origin: string) {
    const state = newId();
    return {
        state,
        cookie: `pl_oauth=${state}; ${attrs(origin, 600).replace("Path=/;", "Path=/zaloguj;")}`,
    };
}
export function checkState(request: Request, param: string | null) {
    const a = cookie(request, "pl_oauth") ?? "";
    const b = param ?? "";
    let diff = a.length ^ b.length;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
    return a !== "" && diff === 0;
}

export const safeNext = (next: string | null | undefined) =>
    next && /^\/(?![/\\])[^\\]*$/.test(next) && next.length <= 200 ? next : "/";
