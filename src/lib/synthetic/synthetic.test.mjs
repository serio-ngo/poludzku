import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { derive, present } from "../stages.mjs";
import { createGithub } from "../github.ts";
import { __reset, __setVisibility, syntheticFetch } from "./index.ts";

const env = { GITHUB_UPSTREAM: "synthetic" };
const read = async (repo, n) =>
    present(derive((await createGithub({ env }).getTask("przyklad", repo, n)).data));

beforeEach(() => __reset());

// repo, number, outcome, stage, health, mover
const TABLE = [
    ["strona", 1, "open", 1, "no-checks", "nobody"],
    ["strona", 2, "open", 2, "pending", "agent"],
    ["strona", 3, "open", 3, "no-checks", "person"],
    ["strona", 4, "open", 4, "pending", "agent"],
    ["strona", 5, "open", 4, "no-checks", "person"],
    ["strona", 6, "open", 5, "passing", "person"],
    ["strona", 7, "open", 6, "passing", "agent"],
    ["strona", 8, "open", 7, "passing", "person"],
    ["strona", 9, "open", 7, "parked", "person"],
    ["strona", 10, "open", 7, "failed", "person"],
    ["strona", 11, "done", 7, "unknown", "nobody"],
    ["strona", 13, "closed", null, "unknown", "nobody"],
    ["sklep", 1, "open", 1, "no-checks", "nobody"],
    ["sklep", 2, "open", 2, "no-checks", "person"],
    ["sklep", 3, "open", 3, "pending", "automation"],
    ["sklep", 4, "open", 4, "passing", "person"],
    ["sklep", 5, "open", 5, "passing", "person"],
    ["sklep", 6, "open", 4, "no-checks", "person"],
    ["wlasne", 1, "open", 1, "no-checks", "person"],
    ["wlasne", 2, "open", 2, "no-checks", "agent"],
    ["wlasne", 4, "open", null, "no-checks", "unknown"],
];
for (const [repo, n, outcome, stage, health, mover] of TABLE) {
    test(`${repo}#${n} derives ${outcome} stage ${stage} ${health} ${mover}`, async () => {
        const v = await read(repo, n);
        assert.deepEqual(
            [v.outcome, v.stage?.index ?? null, v.health, v.mover.kind],
            [outcome, stage, health, mover],
        );
    });
}

test("parked acceptance is assigned to ola, who sees herself as the mover", async () => {
    const task = (
        await createGithub({ env, viewerToken: "ghu_synthetic_ola", viewerLogin: "ola" }).getTask(
            "przyklad",
            "strona",
            9,
        )
    ).data;
    assert.equal(present(derive(task)).mover.kind, "viewer");
});

test("the custom repository selects its own preset and strip length", async () => {
    const v = await read("wlasne", 1);
    assert.deepEqual([v.preset, v.stage.total], ["custom", 3]);
    assert.equal((await read("sklep", 1)).preset, "generic");
    assert.equal((await read("strona", 1)).preset, "lifecycle");
});

test("mutators change the next answer and __reset restores the world", async () => {
    const call = () =>
        syntheticFetch("https://api.github.com/repos/przyklad/strona", {
            headers: { authorization: "Bearer synthetic-inst-2001" },
        });
    assert.equal((await (await call()).json()).private, false);
    __setVisibility("przyklad/strona", "private");
    assert.equal((await (await call()).json()).private, true);
    __reset();
    assert.equal((await (await call()).json()).private, false);
});

test("avatars are deterministic SVG and the sign-in code maps to its user", async () => {
    const svg = async (n) =>
        (await syntheticFetch(`https://avatars.githubusercontent.com/${n}?s=64`)).text();
    assert.equal(await svg("ola"), await svg("ola"));
    assert.notEqual(await svg("ola"), await svg("ben"));
    assert.match(await svg("ola"), /^<svg[^>]*>.*>O<\/text><\/svg>$/);
    const res = await syntheticFetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        body: JSON.stringify({ code: "synthetic-ben" }),
    });
    const { access_token } = await res.json();
    assert.equal(
        (
            await (
                await syntheticFetch("https://api.github.com/user", {
                    headers: { authorization: `Bearer ${access_token}` },
                })
            ).json()
        ).login,
        "ben",
    );
});
