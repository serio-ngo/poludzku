// Give a fresh checkout a working local setup: the synthetic upstream, no account needed.
import { copyFileSync, existsSync } from "node:fs";
if (!existsSync(".dev.vars")) copyFileSync(".dev.vars.example", ".dev.vars");
