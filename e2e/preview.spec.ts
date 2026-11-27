import { expect, test } from "@playwright/test";
import pl from "../src/locales/pl.ts";

test("an expired session on the home page shows sign-in and clears the session cookie", async ({ request }) => {
    const res = await request.get("/", { headers: { cookie: `pl_session=${"a1".repeat(32)}` } });
    expect(res.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^pl_session=;.*Max-Age=0/i)]),
    );
    expect(await res.text()).toContain(pl.glyph["log-in"].word);
});
