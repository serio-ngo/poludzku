import { test } from "node:test";
import assert from "node:assert/strict";
import { entryPath } from "./entry.ts";

test("entry accepts names and github addresses", () => {
    assert.equal(entryPath("przyklad/strona"), "/gh/przyklad/strona");
    assert.equal(entryPath("https://github.com/przyklad/strona.git"), "/gh/przyklad/strona");
    assert.equal(entryPath("https://github.com/przyklad/strona/pull/7"), "/gh/przyklad/strona/7");
    assert.equal(entryPath("https://github.com/przyklad/strona/issues/42?x=1"), "/gh/przyklad/strona/42");
    assert.equal(entryPath("https://github.com/przyklad/strona/tree/feat/x-1"), "/gh/przyklad/strona/tree/feat/x-1");
});

test("entry rejects unsafe input", () => {
    assert.equal(entryPath("https://evil.com/a/b"), null);
    assert.equal(entryPath("a/b/tree/../x"), "/gh/a/b");
    assert.equal(entryPath("a_b/c"), null);
    assert.equal(entryPath("a/.."), null);
});
