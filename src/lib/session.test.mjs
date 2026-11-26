import { test } from "node:test";
import assert from "node:assert/strict";
import {
    checkState,
    clearSessionCookie,
    getRec,
    makeState,
    newId,
    putRec,
    safeNext,
    sessionCookie,
} from "./session.ts";

const fake = () => {
    const m = new Map();
    const s = { alarm: null, put: async (k, v) => void m.set(k, v), get: async (k) => m.get(k) };
    s.deleteAll = async () => m.clear();
    s.setAlarm = async (t) => void (s.alarm = t);
    s.deleteAlarm = async () => void (s.alarm = null);
    return { s, m };
};
const rec = (expiresAt) => ({ token: "t", login: "ala", expiresAt });

test("cookie flags", () => {
    const c = sessionCookie("a", "https://poludzku.info", 5);
    assert.match(c, /^__Host-pl_session=a; .*Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    const l = sessionCookie("a", "http://localhost:4321", 5);
    assert.match(l, /^pl_session=a; /);
    assert.doesNotMatch(l, /Secure/);
    assert.match(clearSessionCookie("https://poludzku.info"), /Max-Age=0/);
    assert.equal(newId().length, 64);
});

test("safeNext", () => {
    for (const bad of ["//evil", "https://evil", "/\\evil", "/a\\b", "/" + "a".repeat(200)])
        assert.equal(safeNext(bad), "/");
    assert.equal(safeNext("/gh/a/b"), "/gh/a/b");
    assert.equal(safeNext(null), "/");
});

test("checkState", () => {
    const { state, cookie } = makeState("https://x.y");
    assert.match(cookie, /Path=\/zaloguj;/);
    const req = new Request("https://x.y/zaloguj/callback", {
        headers: { cookie: `pl_oauth=${state}` },
    });
    assert.equal(checkState(req, state), true);
    assert.equal(checkState(req, newId()), false);
    assert.equal(checkState(req, null), false);
    assert.equal(checkState(new Request("https://x.y"), ""), false);
});

test("session record lifetime", async () => {
    const { s, m } = fake();
    await putRec(s, rec(10 ** 15), 1000);
    assert.equal(s.alarm, 1000 + 8 * 3_600_000);
    assert.equal((await getRec(s, 2000)).login, "ala");
    assert.equal(await getRec(s, s.alarm), null);
    assert.equal(m.size, 0);
    await putRec(s, rec(5000), 1000);
    assert.equal(s.alarm, 5000);
    await s.deleteAll();
    assert.equal(await getRec(s, 2000), null);
});
