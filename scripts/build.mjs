import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
const r = spawnSync("npx", ["astro", "build"], { stdio: "inherit", shell: true });
rmSync("dist/server/.dev.vars", { force: true });
process.exit(r.status ?? 1);
