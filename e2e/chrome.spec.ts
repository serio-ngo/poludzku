import { expect, test } from "@playwright/test";
import en from "../src/locales/en.ts";
import pl from "../src/locales/pl.ts";

const pages = [
    ["/", pl, "Stopka"],
    ["/en", en, "Footer"],
    ["/terms", pl, "Stopka"],
    ["/en/terms", en, "Footer"],
    ["/no-such-page", pl, "Stopka"],
    ["/sign-in/callback", pl, "Stopka"],
    ["/gh/example/website", pl, "Stopka"],
] as const;

test("a signed-in viewer sees their login and sign-out in the top bar of every page", async ({ page }) => {
    await page.goto("/sign-in?as=ola&next=%2F");
    for (const path of ["/", "/terms", "/no-such-page", "/gh/example/website"]) {
        await page.goto(path);
        const bar = page.locator("header");
        await expect(bar.getByText("ola", { exact: true })).toBeVisible();
        await expect(bar.locator('form[action="/sign-out"] button')).toBeVisible();
        await expect(page.getByText(pl.glyph["log-in"].word)).toHaveCount(0);
    }
});

test("every page shows the same labelled footer with the logo and the terms and source links from the locale in order", async ({
    page,
}) => {
    for (const [path, locale, name] of pages) {
        await page.goto(path);
        const nav = page.locator("footer").getByRole("navigation", { name, exact: true });
        const en = name === "Footer";
        await expect(nav.locator("img, a")).toHaveCount(3);
        const logo = nav.locator("img, a").nth(0);
        await expect(logo).toHaveAttribute("alt", locale.footer.publisher);
        await expect(logo).toHaveAttribute("src", "/brand/serio-logo.svg");
        const terms = nav.locator("img, a").nth(1);
        await expect(terms).toHaveText(locale.footer.terms);
        await expect(terms).toHaveAttribute("href", en ? "/en/terms" : "/terms");
        const source = nav.locator("img, a").nth(2);
        await expect(source).toHaveText(locale.footer.source);
        await expect(source).toHaveAttribute("href", "https://github.com/serio-ngo/poludzku");
        await expect(source).toHaveAttribute("rel", /noopener/);
    }
});

test("the task page at the narrowest phone width has no horizontal scroll and touch-sized top-bar and footer links", async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/gh/example/website");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const targets = page.locator("header a:visible, header button:visible, footer a:visible, footer button:visible");
    await expect(page.locator("footer a")).toHaveCount(2);
    for (const el of await targets.all()) {
        const box = await el.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
    }
});
