import test from "node:test";
import assert from "node:assert/strict";
import {
    authorizeUrl, callbackUrl, clearOauthCookies, defaultNext, isSynthetic, nextCookie, originOf, readNext, syntheticCode,
} from "./auth.ts";

test("origin: localhost keeps the request origin, otherwise SITE_ORIGIN", () => {
    assert.equal(originOf(new URL("http://localhost:4321/x"), { SITE_ORIGIN: "https://a.test" }), "http://localhost:4321");
    assert.equal(originOf(new URL("https://b.test/x"), { SITE_ORIGIN: "https://a.test" }), "https://a.test");
    assert.equal(callbackUrl("https://a.test"), "https://a.test/zaloguj/callback");
});

test("authorize url has no scope and encodes the redirect", () => {
    const u = new URL(authorizeUrl("id1", "https://a.test/zaloguj/callback", "s"));
    assert.equal(u.origin + u.pathname, "https://github.com/login/oauth/authorize");
    assert.deepEqual([...u.searchParams.keys()], ["client_id", "redirect_uri", "state"]);
    assert.equal(u.searchParams.get("redirect_uri"), "https://a.test/zaloguj/callback");
});

test("synthetic: never in production", () => {
    assert.equal(isSynthetic({ SITE_ORIGIN: "https://poludzku.info", GITHUB_UPSTREAM: "synthetic" }), false);
    assert.equal(isSynthetic({ SITE_ORIGIN: "http://localhost:4321" }), true);
    assert.equal(isSynthetic({ SITE_ORIGIN: "http://localhost:4321", GITHUB_CLIENT_ID: "x" }), false);
    assert.equal(syntheticCode("ben"), "synthetic-ben");
    assert.equal(syntheticCode("x"), "synthetic-ola");
});

test("next survives the cookie round trip and is re-validated", () => {
    const req = (c) => new Request("http://x.test/", { headers: { cookie: c } });
    const v = nextCookie("/gh/a/b?x=1&y=2", "http://localhost").split(";")[0];
    assert.equal(readNext(req(`pl_oauth=1; ${v}`)), "/gh/a/b?x=1&y=2");
    assert.equal(readNext(req("pl_next=%2F%2Fevil.test")), "/");
    assert.equal(readNext(req("pl_next=%E0%A4%A")), "/");
    assert.equal(readNext(req("")), "/");
    assert.equal(defaultNext("/en/zaloguj"), "/en");
    assert.equal(defaultNext("/zaloguj"), "/");
    assert.ok(clearOauthCookies("https://a.test").every((c) => c.includes("Max-Age=0") && c.includes("Secure")));
});
