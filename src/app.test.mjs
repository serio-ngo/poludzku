import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createGithub } from "./lib/github.ts";
import { derive, present } from "./lib/stages.mjs";
import { parseRoute } from "./lib/route.ts";
import { entryPath } from "./lib/entry.ts";
import { getRec, putRec, safeNext, sessionCookie } from "./lib/session.ts";
import { isLocalGh, isSynthetic, readNext } from "./lib/auth.ts";
import { __removeInstallation, __reset, __revokeAccess, __setVisibility, syntheticFetch } from "./lib/synthetic/index.ts";
import pl from "./locales/pl.ts";
import en from "./locales/en.ts";
import { SITE } from "./config/site.ts";

const env = { GITHUB_UPSTREAM: "synthetic" };
const OLA = { viewerToken: "ghu_synthetic_ola", viewerLogin: "ola" };
const BEN = { viewerToken: "ghu_synthetic_ben", viewerLogin: "ben" };
const api = (o = {}) => createGithub({ env, ...o });
const NO_ACCESS = { ok: false, reason: "no-access" };
const UNAVAILABLE = { ok: false, reason: "unavailable" };
const memory = () => {
    const store = new Map();
    const c = { puts: 0, match: async (k) => store.get(k)?.clone(), put: async (k, r) => void (c.puts++, store.set(k, r)) };
    return c;
};

beforeEach(() => __reset());

test("every synthetic task derives its stage, health and mover through the real adapter", async () => {
    for (const [repo, n, outcome, stage, health, mover] of [
        ["website", 1, "open", 1, "no-checks", "nobody"],
        ["website", 2, "open", 2, "pending", "agent"],
        ["website", 3, "open", 3, "no-checks", "person"],
        ["website", 4, "open", 4, "pending", "agent"],
        ["website", 5, "open", 4, "no-checks", "person"],
        ["website", 6, "open", 5, "passing", "person"],
        ["website", 7, "open", 6, "passing", "agent"],
        ["website", 8, "open", 7, "passing", "person"],
        ["website", 9, "open", 7, "parked", "person"],
        ["website", 10, "open", 7, "failed", "person"],
        ["website", 11, "done", 7, "unknown", "nobody"],
        ["website", 13, "closed", null, "unknown", "nobody"],
        ["store", 3, "open", 3, "pending", "automation"],
        ["store", 5, "open", 5, "passing", "person"],
        ["custom", 2, "open", 2, "no-checks", "agent"],
        ["custom", 4, "open", null, "no-checks", "unknown"],
    ]) {
        const v = present(derive((await api().getTask("example", repo, n)).data));
        assert.deepEqual([v.outcome, v.stage?.index ?? null, v.health, v.mover.kind], [outcome, stage, health, mover], `${repo}#${n}`);
    }
    const preset = async (repo) => present(derive((await api().getTask("example", repo, 1)).data));
    assert.deepEqual([(await preset("website")).preset, (await preset("store")).preset, (await preset("custom")).stage.total], ["lifecycle", "generic", 3]);
});

test("a parked task assigned to the viewer names the viewer as the mover", async () => {
    const v = derive((await api(OLA).getTask("example", "website", 9)).data);
    assert.equal(v.mover.kind, "viewer");
});

test("same-title tasks keep their own runs and movers", async () => {
    const rows = (await api().listTasks("example", "website")).data.rows;
    const [a, b] = [4, 5].map((n) => rows.find((r) => r.number === n));
    assert.equal(a.title, b.title);
    assert.deepEqual([a.view.mover.kind, b.view.mover.kind, b.view.mover.login], ["agent", "person", "ben"]);
    assert.equal(rows.some((r) => r.number === 18), false, "a pull request closing a listed issue is not listed twice");
});

test("empty, failed and partial lists are three different answers", async () => {
    assert.deepEqual((await api().listTasks("example", "empty")).data, { rows: [], partial: false });
    assert.deepEqual(await api().listTasks("example", "outage"), UNAVAILABLE);
    const budget = SITE.requestBudget.requests;
    const run = (n) => ((SITE.requestBudget.requests = n), api().listTasks("example", "many"));
    const [partial, full] = [await run(1), await run(99)];
    SITE.requestBudget.requests = budget;
    assert.equal(partial.data.partial, true);
    assert.deepEqual([full.data.partial, full.data.rows.length], [false, 30]);
});

test("private data reaches only a viewer GitHub lets in", async () => {
    assert.deepEqual(await api().getRepo("example", "private"), NO_ACCESS);
    assert.deepEqual(await api(BEN).getRepo("example", "private"), NO_ACCESS);
    assert.equal((await api(OLA).listTasks("example", "private")).ok, true);
    __revokeAccess("ola", "example/private");
    assert.deepEqual(await api(OLA).getRepo("example", "private"), NO_ACCESS);
    assert.deepEqual(await api({ viewerToken: "ghu_synthetic_expired" }).getRepo("example", "website"), { ok: false, reason: "expired" });
    const missing = await api().getRepo("example", "missing");
    assert.deepEqual([await api().getRepo("example", "no-app"), await api(OLA).getRepo("example", "no-app")], [missing, missing]);
});

test("a warmed public cache stops serving on visibility or installation loss and never holds private reads", async () => {
    const cache = memory();
    const get = (o = {}) => api({ cache, ...o }).getTask("example", "website", 4);
    const first = await get();
    assert.deepEqual(await get(), JSON.parse(JSON.stringify(first)));
    assert.equal(cache.puts, 1, "second read came from the cache");
    __setVisibility("example/website", "private");
    assert.deepEqual(await get(), NO_ACCESS);
    __setVisibility("example/website", "public");
    assert.equal((await get()).ok, true);
    __removeInstallation("example/website");
    assert.deepEqual(await get(), NO_ACCESS);
    __reset();
    const fresh = memory();
    await api({ cache: fresh }).listTasks("example", "outage");
    await api({ cache: fresh, ...OLA }).getTask("example", "private", 1);
    await api({ cache: fresh, ...OLA }).listTasks("example", "website");
    assert.equal(fresh.puts, 0);
});

test("upstream failures and hostile links become unavailable, never invented data", async () => {
    const via = (fetch) => createGithub({ env, fetch });
    assert.deepEqual(await via(async () => { throw new Error("offline"); }).getRepo("example", "website"), UNAVAILABLE);
    assert.deepEqual(await via(async () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } })).getRepo("example", "website"), UNAVAILABLE);
    const hostile = via(async (u, i) =>
        String(u).endsWith("/graphql")
            ? new Response((await (await syntheticFetch(u, i)).text()).replaceAll("https://github.com/", "https://evil.example/"))
            : syntheticFetch(u, i),
    );
    assert.deepEqual(await hostile.getTask("example", "website", 1), UNAVAILABLE);
    const task = (await api().getTask("example", "website", 8)).data;
    for (const u of [task.url, ...task.prs.flatMap((p) => [p.url, ...p.checks.items.map((i) => i.url)]), ...task.runs.map((r) => r.url)])
        assert.match(u, /^https:\/\/github\.com\//);
});

test("production never uses the synthetic upstream", () => {
    assert.equal(isSynthetic({ GITHUB_UPSTREAM: "synthetic" }, true), false);
    const gh = { GITHUB_UPSTREAM: "gh" };
    assert.deepEqual([isLocalGh(gh, new URL("http://localhost:4321/")), isLocalGh(gh, new URL("https://x.workers.dev/")), isLocalGh(gh, new URL("http://localhost/"), true)], [true, false, false], "the developer's token is used only on loopback outside production");
});

test("pull requests and branches resolve to one canonical task", async () => {
    assert.equal((await api().getTask("example", "website", 16)).data.canonical, 6);
    assert.equal((await api().getTask("example", "website", 31)).data.canonical, undefined);
    assert.deepEqual(await api().getTask("example", "website", 999), { ok: false, reason: "not-found" });
    assert.deepEqual((await api().resolveBranch("example", "website", "agent/12-footer")).data, { to: 12 });
    assert.deepEqual((await api().resolveBranch("example", "website", "empty-branch")).data, { to: null, url: "https://github.com/example/website/tree/empty-branch" });
});

test("routes and the entry box accept GitHub addresses and reject everything else", () => {
    assert.deepEqual(parseRoute("example", "website", "42"), { kind: "task", number: 42 });
    assert.deepEqual(parseRoute("example", "website", "tree/agent/12-x"), { kind: "branch", branch: "agent/12-x" });
    for (const [o, r, rest] of [["", "website", ""], ["example", "..", "x"], ["example", "website", "007"], ["example", "website", "12345678901"], ["example", "website", "tree/a/../b"], ["example", "website", "tree/a\nb"]])
        assert.deepEqual(parseRoute(o, r, rest), { kind: "invalid" }, `${o}/${r}/${rest}`);
    assert.equal(entryPath("https://github.com/example/website/pull/7"), "/gh/example/website/7");
    assert.equal(entryPath("example/website"), "/gh/example/website");
});

test("sign-in never redirects off-site and sessions end on time", async () => {
    for (const bad of ["//evil", "https://evil", "/\\evil", "/\t/evil.test", null])
        assert.equal(safeNext(bad), "/", String(bad));
    assert.equal(safeNext("/gh/a/b"), "/gh/a/b");
    assert.equal(readNext(new Request("http://x.test/", { headers: { cookie: "pl_next=%2F%2Fevil.test" } })), "/");
    assert.match(sessionCookie("a", "https://poludzku.info", 5), /^__Host-pl_session=a; .*HttpOnly; SameSite=Lax; Secure$/);
    const m = new Map();
    const s = { alarm: 0, put: async (k, v) => void m.set(k, v), get: async (k) => m.get(k), deleteAll: async () => m.clear(), setAlarm: async (t) => void (s.alarm = t), deleteAlarm: async () => {} };
    await putRec(s, { token: "t", login: "ola", expiresAt: 10 ** 15 }, 1000);
    assert.equal(s.alarm, 1000 + 8 * 3_600_000);
    assert.equal((await getRec(s, 2000)).login, "ola");
    assert.equal(await getRec(s, s.alarm), null);
});

test("sign-in exchange reports a bad code as expired", async () => {
    const t = await api().exchangeCode("synthetic-ola", "http://localhost:4321/sign-in/callback");
    assert.deepEqual((await api().getViewer(t.data.token)).data, { login: "ola" });
    assert.deepEqual(await api().exchangeCode("bad-code", "x"), { ok: false, reason: "expired" });
});

test("PL and EN carry the same words", () => {
    const shape = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) ? shape(v) : typeof v]));
    assert.deepEqual(shape(pl), shape(en));
});
