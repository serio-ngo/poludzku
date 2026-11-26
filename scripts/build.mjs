// astro build, then always drop dist/server/.dev.vars: the adapter copies it there and locally it holds a live gh token.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
const r = spawnSync("npx", ["astro", "build"], { stdio: "inherit", shell: true });
rmSync("dist/server/.dev.vars", { force: true });
process.exit(r.status ?? 1);
