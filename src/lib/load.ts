import type { AstroGlobal } from "astro";
import { env } from "cloudflare:workers";
import { isLocalGh } from "./auth.ts";
import { createGithub } from "./github.ts";
import { parseRoute } from "./route.ts";
import { derive, present } from "./stages.mjs";
import type { TaskDetails } from "../components/Details.astro";

type Lang = "pl" | "en";
export type Kind = "noAccess" | "unavailable" | "expired" | "noTask" | "notFound" | "empty" | "partial";
type Action = { href: string; glyph: "external-link" | "refresh-cw" | "log-in"; label?: string };
export type Page =
    | { page: "invalid" }
    | { page: "unavailable"; kind: Kind; action?: Action }
    | { page: "list"; rows: any[]; partial: boolean; readAt: string }
    | { page: "task"; ev: any; view: any; task: TaskDetails; readAt: string };

const STATUS = { noAccess: 404, notFound: 404, unavailable: 503, expired: 401, noTask: 200 } as Record<string, number>;
const REASON = { "no-access": "noAccess", unavailable: "unavailable", expired: "expired", "not-found": "notFound" } as const;
const gh = (u: unknown) => (typeof u === "string" && /^https:\/\/github\.com\//.test(u) ? u : undefined);

export async function loadGh(Astro: AstroGlobal, lang: Lang): Promise<Response | Page> {
    const { owner = "", repo = "", rest = "" } = Astro.params;
    const route = parseRoute(owner, repo, rest);
    const prefix = lang === "en" ? "/en" : "";
    const base = `${prefix}/gh/${owner}/${repo}`;
    const path = Astro.url.pathname;
    const signIn: Action = { href: `/sign-in?next=${encodeURIComponent(path)}`, glyph: "log-in" };
    const fail = (kind: Kind, action?: Action): Page => {
        Astro.response.status = STATUS[kind]!;
        return { page: "unavailable", kind, action };
    };
    if (route.kind === "invalid") {
        Astro.response.status = 404;
        return { page: "invalid" };
    }
    const { viewer, sessionState } = Astro.locals;
    if (sessionState === "expired") return fail("expired", signIn);

    const g = createGithub({
        env,
        viewerToken: viewer?.token,
        viewerLogin: viewer?.login,
        cache: viewer || typeof caches === "undefined" ? undefined : (caches as any).default,
        localGh: isLocalGh(env, Astro.url),
    });
    const failed = (reason: keyof typeof REASON) => {
        const kind = REASON[reason];
        if (kind === "noAccess") return fail(kind, viewer ? { href: g.installUrl(), glyph: "external-link" } : signIn);
        return fail(kind, kind === "unavailable" ? { href: path, glyph: "refresh-cw" } : kind === "expired" ? signIn : undefined);
    };
    const ok = () => viewer || Astro.response.headers.set("x-pl-snapshot", "public");

    if (route.kind === "branch") {
        const r = await g.resolveBranch(owner, repo, route.branch);
        if (!r.ok) return failed(r.reason);
        if (r.data.to) return Astro.redirect(`${base}/${r.data.to}`);
        return fail("noTask", { href: (r.data as any).url, glyph: "external-link" });
    }
    if (route.kind === "task") {
        const r = await g.getTask(owner, repo, route.number);
        if (!r.ok) return failed(r.reason);
        const ev: any = r.data;
        if (ev.canonical) return Astro.redirect(`${base}/${ev.canonical}`);
        ok();
        const prs: any[] = ev.prs;
        const active = ev.kind === "pr" ? prs[0] : (prs.find((p) => p.state === "open") ?? prs.findLast((p) => p.state === "merged"));
        const task: TaskDetails = {
            checks: (active?.checks.items ?? []).map((c: any) => ({ name: c.name, conclusion: c.conclusion, url: c.url })),
            reviews: (active?.reviews ?? []).map((v: any) => ({ state: v.state, author: v.author })),
            labels: ev.labels,
            prs: prs.filter((p) => p.number !== ev.number).map((p) => ({ number: p.number, url: p.url, title: p.title })),
            commits: prs.map((p) => ({ sha: p.headSha, url: gh(p.url) && `${p.url}/commits/${p.headSha}` })),
        };
        return { page: "task", ev, view: present(derive(ev)), task, readAt: r.readAt };
    }
    const r = await g.listTasks(owner, repo);
    if (!r.ok) return failed(r.reason);
    ok();
    return { page: "list", rows: r.data.rows, partial: r.data.partial, readAt: r.readAt };
}
