// Local start: create .dev.vars from the example, and in "gh" mode put the developer's own `gh` token in it.
// .dev.vars is git-ignored; the token stays on this machine and is read only by the local server.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync(".dev.vars")) copyFileSync(".dev.vars.example", ".dev.vars");
const vars = readFileSync(".dev.vars", "utf8");
if (/^GITHUB_UPSTREAM=gh\s*$/m.test(vars)) {
    let token = "";
    try {
        token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
    } catch {
        console.error("GITHUB_UPSTREAM=gh needs the GitHub CLI signed in: run `gh auth login`.");
        process.exit(1);
    }
    const line = `GITHUB_DEV_TOKEN=${token}`;
    writeFileSync(
        ".dev.vars",
        /^GITHUB_DEV_TOKEN=.*$/m.test(vars)
            ? vars.replace(/^GITHUB_DEV_TOKEN=.*$/m, line)
            : `${vars.trimEnd()}\n${line}\n`,
    );
}
