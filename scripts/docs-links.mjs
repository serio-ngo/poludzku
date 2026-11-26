import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ROOTS = [".prd", ".sessions"];
const TOP_LEVEL = ["README.md", "AGENTS.md"];

function walk(dir, out = []) {
    if (!existsSync(dir)) return out;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full, out);
        else if (e.name.endsWith(".md")) out.push(full);
    }
    return out;
}

const files = [
    ...TOP_LEVEL.map((f) => path.join(ROOT, f)).filter(existsSync),
    ...ROOTS.flatMap((r) => walk(path.join(ROOT, r))),
];

const problems = [];
const MD_LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMPORT = /^@(\S+)\s*$/;

for (const file of files) {
    const rel = path.relative(ROOT, file);
    const dir = path.dirname(file);
    const text = readFileSync(file, "utf8");

    for (const [, raw] of text.matchAll(MD_LINK)) {
        if (/^(https?:|mailto:|#|data:)/i.test(raw)) continue;
        const target = raw.split("#")[0];
        if (!target) continue;
        const resolved = path.resolve(dir, decodeURIComponent(target));
        if (!existsSync(resolved)) {
            problems.push(`${rel} → ${raw}`);
            continue;
        }
        const isDir = statSync(resolved).isDirectory();
        if (target.endsWith("/") !== isDir) {
            problems.push(
                `${rel} → ${raw} (${isDir ? "is a directory, link needs a trailing /" : "is a file, link must not end in /"})`,
            );
        }
    }

    for (const line of text.split("\n")) {
        const m = line.match(IMPORT);
        if (m && !existsSync(path.resolve(ROOT, m[1]))) {
            problems.push(`${rel} → @${m[1]} (import target missing)`);
        }
    }
}

if (problems.length > 0) {
    console.error(`docs:links — ${problems.length} broken:\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
}
console.log(`docs:links — ${files.length} files, 0 dead links.`);
