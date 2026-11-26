import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createGithub } from "./github.ts";
import {
    __removeInstallation,
    __reset,
    __revokeAccess,
    __setVisibility,
    syntheticFetch,
} from "./synthetic/index.ts";

const env = {
    GITHUB_UPSTREAM: "synthetic",
    SITE_ORIGIN: "http://localhost:4321",
    GITHUB_APP_SLUG: "po-ludzku",
};
const OLA = { viewerToken: "ghu_synthetic_ola", viewerLogin: "ola" };
const BEN = { viewerToken: "ghu_synthetic_ben", viewerLogin: "ben" };
const api = (o = {}) => createGithub({ env, ...o });
const NO_ACCESS = { ok: false, reason: "no-access" };

// A Workers-cache stand-in that counts its use.
const memory = () => {
    const store = new Map();
    const c = {
        calls: 0,
        puts: 0,
        async match(k) {
            c.calls++;
            return store.get(k)?.clone();
        },
        async put(k, r) {
            c.puts++;
            store.set(k, r);
        },
    };
    return c;
};

beforeEach(() => __reset());

test("an empty list, a failed read and a partial list are three different answers", async () => {
    const empty = await api().listTasks("przyklad", "pusto");
    assert.deepEqual(empty.data, { rows: [], partial: false });
    assert.equal(empty.ok, true);

    assert.deepEqual(await api().listTasks("przyklad", "awaria"), {
        ok: false,
        reason: "unavailable",
    });

    const partial = await createGithub({ env: { ...env, REQUEST_BUDGET: "1" } }).listTasks(
        "przyklad",
        "duzo",
    );
    assert.equal(partial.data.partial, true);
    assert.deepEqual(
        partial.data.rows.map((r) => r.number),
        [1, 2],
    );
    const full = await api().listTasks("przyklad", "duzo");
    assert.equal(full.data.partial, false);
    assert.equal(full.data.rows.length, 6);
});

test("private repository: no token, wrong viewer and right viewer", async () => {
    assert.deepEqual(await api().getRepo("przyklad", "tajne"), NO_ACCESS);
    assert.deepEqual(await api().listTasks("przyklad", "tajne"), NO_ACCESS);
    assert.deepEqual(await api(BEN).getRepo("przyklad", "tajne"), NO_ACCESS);
    const ola = await api(OLA).listTasks("przyklad", "tajne");
    assert.equal(ola.ok, true);
    assert.equal(ola.data.rows.length, 2);
    const repo = await api(OLA).getRepo("przyklad", "tajne");
    assert.equal(repo.data.private, true);
    __revokeAccess("ola", "przyklad/tajne");
    assert.deepEqual(await api(OLA).getRepo("przyklad", "tajne"), NO_ACCESS);
});

test("an expired viewer token and an upstream outage are reported as such", async () => {
    assert.deepEqual(
        await api({ viewerToken: "ghu_synthetic_expired" }).getRepo("przyklad", "strona"),
        { ok: false, reason: "expired" },
    );
    assert.deepEqual(await api().getTask("przyklad", "awaria", 1), {
        ok: false,
        reason: "unavailable",
    });
    assert.deepEqual(
        await createGithub({
            env,
            fetch: async () => {
                throw new Error("offline");
            },
        }).getRepo("przyklad", "strona"),
        { ok: false, reason: "unavailable" },
    );
    const limited = async () =>
        new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } });
    assert.deepEqual(await createGithub({ env, fetch: limited }).getRepo("przyklad", "strona"), {
        ok: false,
        reason: "unavailable",
    });
    const graphLimited = async (u, i) =>
        u.endsWith("/graphql")
            ? new Response(JSON.stringify({ errors: [{ type: "RATE_LIMITED" }] }))
            : syntheticFetch(u, i);
    assert.deepEqual(
        await createGithub({ env, fetch: graphLimited }).getTask("przyklad", "strona", 1),
        { ok: false, reason: "unavailable" },
    );
});

test("a repository without the App looks the same as a missing one", async () => {
    const missing = await api().getRepo("przyklad", "nie-ma-takiego");
    assert.deepEqual(missing, NO_ACCESS);
    assert.deepEqual(await api().getRepo("przyklad", "bez-aplikacji"), missing);
    assert.deepEqual(await api(OLA).getRepo("przyklad", "bez-aplikacji"), missing);
    assert.deepEqual(await api().getRepo("../x", "strona"), missing);
    __removeInstallation("przyklad/strona");
    assert.deepEqual(await api().getTask("przyklad", "strona", 1), NO_ACCESS);
});

test("same-title tasks get different movers", async () => {
    const list = await api().listTasks("przyklad", "strona");
    const [a, b] = [4, 5].map((n) => list.data.rows.find((r) => r.number === n));
    assert.equal(a.title, b.title);
    assert.equal(a.view.mover.kind, "agent");
    assert.deepEqual([b.view.mover.kind, b.view.mover.login], ["person", "ben"]);
    assert.equal(
        list.data.rows.some((r) => r.number === 18),
        false,
        "a PR resolving to a listed issue is not listed twice",
    );
    assert.equal(
        list.data.rows.some((r) => r.number === 30),
        true,
    );
    const task = await api().getTask("przyklad", "strona", 4);
    assert.equal(task.data.runs.length, 1);
});

test("a pull request with exactly one closing issue redirects; zero or two stay standalone", async () => {
    assert.equal((await api().getTask("przyklad", "strona", 16)).data.canonical, 6);
    assert.equal((await api().getTask("przyklad", "strona", 32)).data.canonical, 34);
    const standalone = await api().getTask("przyklad", "strona", 30);
    assert.equal(standalone.data.canonical, undefined);
    assert.equal(standalone.data.kind, "pr");
    const ambiguous = await api().getTask("przyklad", "strona", 31);
    assert.equal(ambiguous.data.canonical, undefined);
    assert.deepEqual(ambiguous.data.prs[0].closingIssues, [14, 15]);
    assert.deepEqual(await api().getTask("przyklad", "strona", 999), {
        ok: false,
        reason: "not-found",
    });
});

test("branches resolve to a task or to GitHub", async () => {
    const g = api();
    assert.deepEqual((await g.resolveBranch("przyklad", "strona", "poprawka-kontrastu")).data, {
        to: 34,
    });
    assert.deepEqual((await g.resolveBranch("przyklad", "strona", "agent/12-stopka")).data, {
        to: 12,
    });
    assert.deepEqual((await g.resolveBranch("przyklad", "strona", "pusta-galaz")).data, {
        to: null,
        url: "https://github.com/przyklad/strona/tree/pusta-galaz",
    });
    assert.deepEqual((await g.resolveBranch("przyklad", "strona", "agent/99-brak")).data.to, null);
    assert.equal((await g.resolveBranch("przyklad", "strona", "a..b")).ok, false);
});

test("a warmed anonymous cache stops serving when the repository turns private or loses the App", async () => {
    const cache = memory();
    const g = () => api({ cache });
    const first = await g().getTask("przyklad", "strona", 4);
    assert.equal(cache.puts, 1);
    const second = await g().getTask("przyklad", "strona", 4);
    assert.equal(cache.puts, 1, "second read came from the cache");
    assert.deepEqual(second, JSON.parse(JSON.stringify(first)));
    __setVisibility("przyklad/strona", "private");
    assert.deepEqual(await g().getTask("przyklad", "strona", 4), NO_ACCESS);
    __setVisibility("przyklad/strona", "public");
    assert.equal((await g().getTask("przyklad", "strona", 4)).ok, true);
    __removeInstallation("przyklad/strona");
    assert.deepEqual(await g().getTask("przyklad", "strona", 4), NO_ACCESS);
    assert.deepEqual(await g().listTasks("przyklad", "strona"), NO_ACCESS);
});

test("failures and viewer reads never reach the cache", async () => {
    const cache = memory();
    await api({ cache }).listTasks("przyklad", "awaria");
    await api({ cache }).getTask("przyklad", "strona", 999);
    await api({ cache }).getTask("przyklad", "tajne", 1);
    assert.equal(cache.puts, 0);
    cache.calls = 0;
    await api({ cache, ...OLA }).getTask("przyklad", "tajne", 1);
    await api({ cache, ...OLA }).listTasks("przyklad", "strona");
    assert.deepEqual([cache.calls, cache.puts], [0, 0]);
});

test("signed in, the viewer owns their moves", async () => {
    const task = await api(OLA).getTask("przyklad", "strona", 6);
    assert.equal(task.data.viewer, "ola");
    const anon = await api().getTask("przyklad", "strona", 6);
    assert.equal(anon.data.viewer, null);
});

test("custom configuration: valid, invalid, absent and unavailable", async () => {
    const config = (g, name) => g.getTask("przyklad", name, 1).then((r) => r.data.config);
    const custom = await config(api(), "wlasne");
    assert.equal(custom.status, "valid");
    assert.deepEqual(
        custom.stages.map((s) => s.label),
        ["idea", "prace", "odbior"],
    );
    assert.deepEqual(custom.stages[0].name, { pl: "Pomysł", en: "Idea" });
    assert.equal(custom.stages[2].name, "Odbiór");
    assert.deepEqual(await config(api(), "sklep"), { status: "absent" });

    const withFile = (respond) =>
        createGithub({
            env,
            fetch: async (u, i) =>
                String(u).includes("/contents/") ? respond() : syntheticFetch(u, i),
        });
    const yaml = (text) => () =>
        new Response(JSON.stringify({ encoding: "base64", content: btoa(text) }));
    for (const bad of [
        "stages: []",
        "nope:\n  - name: A",
        "stages:\n  - name: A\n    label: a\n    mover: robot",
        "stages:\n  - name: A\n    label: a",
        "stages:\n    name: A",
    ]) {
        assert.deepEqual(await config(withFile(yaml(bad)), "wlasne"), { status: "invalid" }, bad);
    }
    assert.deepEqual(
        await config(
            withFile(() => new Response("{}", { status: 502 })),
            "wlasne",
        ),
        { status: "unavailable" },
    );
    assert.equal(
        (
            await config(
                withFile(yaml("# note\nstages:\n  - name: A\n    label: a\n    mover: nobody\n")),
                "wlasne",
            )
        ).status,
        "valid",
    );
});

test("every emitted link is a github.com address", async () => {
    const list = await api().listTasks("przyklad", "strona");
    for (const r of list.data.rows) assert.match(r.url, /^https:\/\/github\.com\//);
    const task = (await api().getTask("przyklad", "strona", 8)).data;
    const urls = [
        task.url,
        ...task.prs.flatMap((p) => [p.url, ...p.checks.items.map((i) => i.url)]),
        ...task.runs.map((r) => r.url),
    ];
    assert.ok(urls.length > 3);
    for (const u of urls) assert.match(u, /^https:\/\/github\.com\//);
    const hostile = createGithub({
        env,
        fetch: async (u, i) =>
            String(u).endsWith("/graphql")
                ? new Response(
                      (await (await syntheticFetch(u, i)).text()).replaceAll(
                          "https://github.com/",
                          "https://evil.example/",
                      ),
                  )
                : syntheticFetch(u, i),
    });
    assert.deepEqual(await hostile.getTask("przyklad", "strona", 1), {
        ok: false,
        reason: "unavailable",
    });
});

test("sign-in exchange, viewer, avatar and install link", async () => {
    const g = api();
    const t = await g.exchangeCode("synthetic-ola", "http://localhost:4321/zaloguj/callback");
    assert.equal(t.ok, true);
    assert.ok(t.data.expiresAt > Date.now());
    assert.deepEqual((await g.getViewer(t.data.token)).data, { login: "ola" });
    assert.deepEqual(await g.exchangeCode("zly-kod", "x"), { ok: false, reason: "expired" });
    assert.deepEqual(await g.getViewer("ghu_synthetic_expired"), { ok: false, reason: "expired" });
    const a = await g.avatar("ola");
    assert.equal(a.data.contentType, "image/svg+xml");
    assert.ok(a.data.body.byteLength > 50);
    assert.equal((await g.avatar("../etc")).ok, false);
    assert.equal((await g.avatar("github-actions[bot]")).ok, true);
    assert.equal(g.installUrl(), "https://github.com/apps/po-ludzku/installations/new");
});

test("production never falls back to the synthetic upstream", async () => {
    const real = globalThis.fetch;
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    try {
        const prod = createGithub({
            env: { SITE_ORIGIN: "https://poludzku.info", GITHUB_UPSTREAM: "synthetic" },
        });
        assert.deepEqual(await prod.getRepo("przyklad", "strona"), {
            ok: false,
            reason: "unavailable",
        });
    } finally {
        globalThis.fetch = real;
    }
});
