import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRoute } from "./route.ts";

test("route kinds", () => {
    assert.deepEqual(parseRoute("przyklad", "strona"), { kind: "list" });
    assert.deepEqual(parseRoute("przyklad", "strona", "42"), { kind: "task", number: 42 });
    assert.deepEqual(parseRoute("przyklad", "strona", "tree/agent/12-x"), { kind: "branch", branch: "agent/12-x" });
    assert.deepEqual(parseRoute("a-b", "x.y_z", "999999999"), { kind: "task", number: 999999999 });
});

test("route rejects bad input", () => {
    for (const [o, r, rest] of [
        ["", "strona", ""],
        ["-".repeat(40), "strona", ""],
        ["prz yklad", "strona", ""],
        ["przyklad", "..", "x"],
        ["przyklad", "st/rona", ""],
        ["przyklad", "strona", "0"],
        ["przyklad", "strona", "007"],
        ["przyklad", "strona", "12345678901"],
        ["przyklad", "strona", "pull/4"],
        ["przyklad", "strona", "tree/"],
        ["przyklad", "strona", "tree/a/../b"],
        ["przyklad", "strona", "tree/a\nb"],
        ["przyklad", "strona", `tree/${"a".repeat(256)}`],
    ])
        assert.deepEqual(parseRoute(o, r, rest), { kind: "invalid" }, `${o}/${r}/${rest}`);
});
