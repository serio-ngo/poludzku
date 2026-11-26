import { spawn, spawnSync } from "node:child_process";
import { createPrivateKey, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const org = "serio-ngo";
const manifest = readFileSync("app-manifest.json", "utf8");
const state = randomUUID();
const open = (url) =>
    spawn(
        process.platform === "win32"
            ? "explorer"
            : process.platform === "darwin"
              ? "open"
              : "xdg-open",
        [url],
        { stdio: "ignore", detached: true },
    ).unref();
const esc = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const putSecret = (name, value) => {
    const r = spawnSync(
        "npx",
        ["wrangler", "versions", "secret", "put", name, "--name", "poludzku"],
        {
            input: value,
            stdio: ["pipe", "inherit", "inherit"],
            shell: true,
            env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: "8011c8ad26f19291388f592410d2d9fd" },
        },
    );
    if (r.status !== 0) throw new Error(`wrangler secret put ${name} failed`);
};

const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:4321");
    if (url.pathname !== "/") return res.writeHead(404).end();
    const code = url.searchParams.get("code");
    if (!code) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        return res.end(
            `<form method="post" action="https://github.com/organizations/${org}/settings/apps/new?state=${state}"><input type="hidden" name="manifest" value="${esc(manifest)}"></form><script>document.forms[0].submit()</script>`,
        );
    }
    if (url.searchParams.get("state") !== state) return res.writeHead(400).end("state mismatch");
    try {
        const r = await fetch(
            `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`,
            {
                method: "POST",
                headers: { accept: "application/vnd.github+json", "user-agent": "po-ludzku" },
            },
        );
        if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
        const app = await r.json();
        const site = readFileSync("src/config/site.ts", "utf8").replace(
            /app: \{[^}]*\}/,
            `app: { id: "${app.id}", slug: "${app.slug}", clientId: "${app.client_id}" }`,
        );
        writeFileSync("src/config/site.ts", site);
        putSecret(
            "GITHUB_APP_PRIVATE_KEY",
            createPrivateKey(app.pem).export({ type: "pkcs8", format: "pem" }),
        );
        putSecret("GITHUB_CLIENT_SECRET", app.client_secret);
        const install = `${app.html_url}/installations/new`;
        res.writeHead(302, { location: install }).end();
        console.log(
            `App ${app.slug} (id ${app.id}) created; both secrets are on the poludzku Worker; src/config/site.ts updated. Install it: ${install}`,
        );
    } catch (e) {
        res.writeHead(500).end(String(e.message));
        console.error(e.message);
        process.exitCode = 1;
    }
    server.close();
});
server.listen(4321, () => open("http://localhost:4321/"));
