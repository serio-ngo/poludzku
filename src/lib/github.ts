import githubAppJwt from "universal-github-app-jwt";
import { SITE } from "../config/site.ts";
import { isSynthetic } from "./auth.ts";
import { derive, present, specHash } from "./stages.mjs";
import { syntheticFetch } from "./synthetic/index.ts";

type Reason = "no-access" | "unavailable" | "expired" | "not-found";
export type Result<T> = { ok: true; data: T; readAt: string } | { ok: false; reason: Reason };
type Cache = {
    match(key: string): Promise<Response | undefined>;
    put(key: string, res: Response): Promise<void>;
};
type Env = Record<string, any>;
type Access = { repo: any; token: string };

class Fail extends Error {
    reason: Reason;
    status: number;
    constructor(reason: Reason, status = 0) {
        super(reason);
        this.reason = reason;
        this.status = status;
    }
}

const API = "https://api.github.com";
const tokens = new Map<number, { token: string; until: number }>();
const now = () => new Date().toISOString();
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const ghUrl = (u: unknown) =>
    typeof u === "string" && /^https:\/\/github\.com\//.test(u) ? u : undefined;
const gh = (u: unknown): string => ghUrl(u) ?? fail("unavailable");
const fail = (r: Reason, status = 0): never => {
    throw new Fail(r, status);
};
const login = (a: any) => a?.login ?? "ghost";

const BIG = { rev: 50, com: 100, ctx: 50, tl: 100, prs: 10 };
const SMALL = { rev: 5, com: 30, ctx: 30, tl: 30, prs: 3 };
type Size = typeof BIG;
const COMMON = (
    s: Size,
) => `__typename number title body state url updatedAt author{login __typename} assignees(first:10){nodes{login}}
 labels(first:50){nodes{name}} timelineItems(last:${s.tl},itemTypes:[LABELED_EVENT]){nodes{... on LabeledEvent{createdAt label{name} actor{login}}}}
 comments(last:${s.com}){nodes{body createdAt author{login __typename}}}`;
const PR_FIELDS = (
    s: Size,
) => `${COMMON(s)} createdAt isDraft headRefOid headRefName repository{nameWithOwner}
 reviewRequests(first:10){nodes{requestedReviewer{... on User{login}}}}
 reviews(last:${s.rev}){pageInfo{hasPreviousPage} nodes{state body submittedAt commit{oid} author{login}}}
 statusCheckRollup{contexts(first:${s.ctx}){pageInfo{hasNextPage} nodes{__typename ... on CheckRun{name conclusion status detailsUrl} ... on StatusContext{context state targetUrl}}}}
 closingIssuesReferences(first:10){pageInfo{hasNextPage} nodes{number repository{nameWithOwner}}}`;
const ISSUE_FIELDS = (s: Size) => `${COMMON(s)} stateReason
 closedByPullRequestsReferences(first:${s.prs},includeClosedPrs:true){pageInfo{hasNextPage} nodes{${PR_FIELDS(s)}}}`;
const REPO = "repository(owner:$owner,name:$name)";
const ARGS = "$owner:String!,$name:String!";
const TASK = `query Task(${ARGS},$number:Int!){${REPO}{issueOrPullRequest(number:$number){__typename ... on Issue{${ISSUE_FIELDS(BIG)}} ... on PullRequest{${PR_FIELDS(BIG)}}}}}`;
const ISSUES = `query Issues(${ARGS},$after:String){${REPO}{issues(first:${SITE.listPageSize},states:OPEN,after:$after,orderBy:{field:UPDATED_AT,direction:DESC}){pageInfo{hasNextPage endCursor} nodes{${ISSUE_FIELDS(SMALL)}}}}}`;
const PRS = `query Prs(${ARGS},$after:String){${REPO}{pullRequests(first:${SITE.listPageSize},states:OPEN,after:$after,orderBy:{field:UPDATED_AT,direction:DESC}){pageInfo{hasNextPage endCursor} nodes{${PR_FIELDS(SMALL)}}}}}`;
const BRANCH = `query Branch(${ARGS},$branch:String!){${REPO}{pullRequests(headRefName:$branch,states:OPEN,first:2){nodes{number repository{nameWithOwner} closingIssuesReferences(first:5){pageInfo{hasNextPage} nodes{number repository{nameWithOwner}}}}}}}`;

const MOVERS = ["person", "agent", "automation", "nobody"];
function parseConfig(text: string) {
    const invalid = { status: "invalid" };
    const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
    if (lines.shift()?.trimEnd() !== "stages:") return invalid;
    const items: Record<string, string>[] = [];
    for (const l of lines) {
        const m = /^\s+(- )?(name|name_en|label|mover):\s*(.+?)\s*$/.exec(l);
        if (!m || (!m[1] && !items.length)) return invalid;
        if (m[1]) items.push({});
        const item = items.at(-1)!;
        if (m[2]! in item) return invalid;
        item[m[2]!] = m[3]!.replace(/^(["'])(.*)\1$/, "$2");
    }
    if (!items.length || items.some((s) => !s.name || !s.label || !MOVERS.includes(s.mover ?? "")))
        return invalid;
    return {
        status: "valid",
        stages: items.map((s) => ({
            name: s.name_en ? { pl: s.name, en: s.name_en } : s.name,
            label: s.label,
            mover: s.mover,
        })),
    };
}

const conclusion = (c: string | null) => {
    const v = (c ?? "").toLowerCase();
    return !v
        ? "pending"
        : [
                "success",
                "failure",
                "pending",
                "neutral",
                "skipped",
                "cancelled",
                "timed_out",
                "action_required",
            ].includes(v)
          ? v
          : "failure";
};
const checkOf = (n: any) =>
    n.__typename === "CheckRun"
        ? { name: n.name, conclusion: conclusion(n.conclusion), url: ghUrl(n.detailsUrl) }
        : {
              name: n.context,
              conclusion: conclusion(
                  n.state === "ERROR" ? "failure" : n.state === "EXPECTED" ? null : n.state,
              ),
              url: ghUrl(n.targetUrl),
          };

const labelsOf = (n: any) => {
    const events = new Map<string, any>();
    for (const e of n.timelineItems.nodes) if (e.label) events.set(e.label.name, e);
    return n.labels.nodes.map(({ name }: any) => {
        const e = events.get(name);
        return e ? { name, by: e.actor?.login, at: e.createdAt } : { name };
    });
};
const isBot = (a: any) =>
    a?.__typename === "Bot" && a.login.replace(/\[bot\]$/, "") === "github-actions";
const closing = (p: any, full: string): number[] =>
    p.closingIssuesReferences.nodes
        .filter((i: any) => same(i.repository.nameWithOwner, full))
        .map((i: any) => i.number);
const canonicalOf = (p: any, full: string) => {
    const c = closing(p, full);
    return c.length === 1 && !p.closingIssuesReferences.pageInfo.hasNextPage ? c[0] : undefined;
};

type Ctx = {
    full: string;
    topics: string[];
    config: any;
    runs: any[];
    runsPartial: boolean;
    viewer: string | null;
};

function prOf(n: any, c: Ctx, hash: string, writeTests: any[]) {
    const bots = n.comments.nodes.filter((x: any) => isBot(x.author));
    const hit = (re: RegExp) => {
        const x = bots.findLast((y: any) => re.test(y.body));
        return x && { m: re.exec(x.body)!, at: x.createdAt };
    };
    const reviews = n.reviews.nodes.map((r: any) => ({
        state: r.state,
        body: r.body ?? "",
        commitId: r.commit?.oid ?? "",
        at: r.submittedAt,
        author: login(r.author),
    }));
    const run = (id: number) => c.runs.find((r) => r.id === id && r.prs.includes(n.number));
    const rollup = n.statusCheckRollup?.contexts;

    const acc = bots.findLast((x: any) => /<!-- acceptance v1 sha=[0-9a-f]{40} -->/.test(x.body));
    const ref = acc && /locked at ([0-9a-f]{7,40})\b/.exec(acc.body)?.[1];
    const lockRun = acc && run(Number(/actions\/runs\/(\d+)/.exec(acc.body)?.[1]));
    const commits = [
        ...new Set<string>(
            reviews.map((r: any) => r.commitId).filter((id: string) => ref && id.startsWith(ref)),
        ),
    ];
    const lock = ref
        ? {
              verified:
                  /sha=([0-9a-f]{40})/.exec(acc.body)![1] === n.headRefOid &&
                  lockRun?.conclusion === "success" &&
                  commits.length === 1,
              headSha: n.headRefOid,
              at: acc.createdAt,
              reviewCommit: commits[0],
          }
        : null;

    const marker = writeTests.findLast((w) => w.spec === hash);
    const note = hit(/<!-- write-tests v1 run=(\d+) -->/);
    const testSubmission = marker
        ? {
              kind: "marker",
              at: marker.at,
              verified: marker.verified && !!note && !!run(Number(note.m[1])),
          }
        : /Criterion\s*\|\s*Test\s*\|\s*Red proof/i.test(n.body ?? "")
          ? { kind: "manual", at: n.createdAt, verified: true }
          : null;

    const d = c.runs.find(
        (r) =>
            r.name === "deliver" &&
            r.prs.includes(n.number) &&
            r.headSha === n.headRefOid &&
            r.status !== "completed",
    );
    const dispatch =
        d &&
        reviews
            .filter((r: any) => /^tests-ok\b/i.test(r.body.trim()) && r.at <= d.createdAt)
            .at(-1);
    return {
        number: n.number,
        url: gh(n.url),
        title: n.title,
        state: n.state.toLowerCase(),
        draft: n.isDraft,
        author: login(n.author),
        authorIsBot: n.author?.__typename === "Bot",
        assignees: n.assignees.nodes.map((a: any) => a.login),
        requestedReviewers: n.reviewRequests.nodes
            .map((r: any) => r.requestedReviewer?.login)
            .filter(Boolean),
        headSha: n.headRefOid,
        labels: labelsOf(n),
        closingIssues: closing(n, c.full),
        closingComplete: !n.closingIssuesReferences.pageInfo.hasNextPage,
        reviews,
        reviewsComplete: !n.reviews.pageInfo.hasPreviousPage,
        checks: {
            status: rollup?.pageInfo.hasNextPage ? "incomplete" : "complete",
            items: (rollup?.nodes ?? []).map(checkOf),
        },
        lock,
        testSubmission,
        deliverRun: d
            ? {
                  running: true,
                  headSha: d.headSha,
                  reviewAt: dispatch?.at ?? "",
                  verified: d.actorIsBot,
              }
            : null,
    };
}

async function evidenceOf(n: any, c: Ctx) {
    const isPr = n.__typename === "PullRequest";
    const hash = await specHash(n.title, n.body ?? "");
    const comments: any[] = isPr ? [] : n.comments.nodes;
    const marked = (re: RegExp) =>
        comments.flatMap((x) => {
            const m = re.exec(x.body);
            return m ? [{ m, at: x.createdAt, verified: isBot(x.author) }] : [];
        });
    const labels = labelsOf(n);
    const specOk = labels.find((l: any) => l.name === "spec-ok");
    const writeTests = marked(/<!-- write-tests v1 spec=([0-9a-f]+) -->/).map((x) => ({
        spec: x.m[1],
        at: x.at,
        verified: x.verified,
    }));
    const nodes: any[] = isPr
        ? [n]
        : n.closedByPullRequestsReferences.nodes.filter((p: any) =>
              same(p.repository.nameWithOwner, c.full),
          );
    const prs = nodes.map((p) => prOf(p, c, hash, writeTests));
    const runs = c.runs.flatMap((r) => {
        const prNumber = prs.find((p) => r.prs.includes(p.number))?.number;
        const taskNumber =
            Number(/^agent\/(\d+)-/.exec(r.branch)?.[1]) === n.number ? n.number : undefined;
        return prNumber || taskNumber
            ? [
                  {
                      id: r.id,
                      name: r.name,
                      status: r.status,
                      conclusion: r.conclusion,
                      headSha: r.headSha,
                      prNumber,
                      taskNumber,
                      actorIsBot: r.actorIsBot,
                      url: r.url,
                  },
              ]
            : [];
    });
    return {
        kind: isPr ? "pr" : "issue",
        number: n.number,
        title: n.title,
        body: n.body ?? "",
        url: gh(n.url),
        state: n.state.toLowerCase(),
        stateReason: n.stateReason?.toLowerCase() ?? null,
        labels,
        assignees: n.assignees.nodes.map((a: any) => a.login),
        author: login(n.author),
        updatedAt: n.updatedAt,
        topics: c.topics,
        config: c.config,
        spec: {
            hash,
            markers: marked(
                /<!-- spec-review v1 sha=([0-9a-f]+) verdict=(ready|questions)\b[^>]*-->/,
            ).map((x) => ({ verdict: x.m[2], sha: x.m[1], at: x.at, verified: x.verified })),
            specOk: specOk
                ? { present: true, at: specOk.at, verified: !!specOk.at }
                : { present: false, verified: true },
        },
        writeTests,
        prs,
        prsComplete: isPr || !n.closedByPullRequestsReferences.pageInfo.hasNextPage,
        runs,
        viewer: c.viewer,
        partial: c.runsPartial,
    };
}

export function createGithub(o: {
    fetch?: typeof fetch;
    env: Env;
    viewerToken?: string;
    viewerLogin?: string;
    cache?: Cache;
    localGh?: boolean;
}) {
    const { env, viewerLogin, cache } = o;
    const viewerToken = o.viewerToken ?? (o.localGh ? env.GITHUB_DEV_TOKEN : undefined);
    const synthetic = isSynthetic(env);
    const f = o.fetch ?? (synthetic ? (syntheticFetch as typeof fetch) : globalThis.fetch);
    const budget = {
        requests: Number(env.REQUEST_BUDGET ?? SITE.requestBudget.requests),
        milliseconds: SITE.requestBudget.milliseconds,
    };

    async function req(
        url: string,
        token?: string,
        init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {},
        userToken = !!viewerToken && token === viewerToken,
    ): Promise<any> {
        let res: Response;
        try {
            res = await f(url, {
                ...init,
                headers: {
                    accept: "application/vnd.github+json",
                    "user-agent": "po-ludzku",
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                    ...init.headers,
                },
            });
        } catch {
            return fail("unavailable");
        }
        if (res.ok) return res.json();
        const limited =
            res.headers.get("x-ratelimit-remaining") === "0" || res.headers.has("retry-after");
        if (res.status === 401) return fail(userToken ? "expired" : "unavailable", 401);
        if (res.status === 429 || res.status >= 500 || (res.status === 403 && limited))
            return fail("unavailable", res.status);
        return fail(
            res.status === 403 || res.status === 404 ? "no-access" : "unavailable",
            res.status,
        );
    }

    async function gql(token: string, operationName: string, query: string, variables: object) {
        const body = await req(`${API}/graphql`, token, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ operationName, query, variables }),
        });
        const errors: any[] = body.errors ?? [];
        if (errors.some((e) => e.type !== "NOT_FOUND")) return fail("unavailable");
        return body.data?.repository ?? fail("no-access");
    }

    const jwt = async () =>
        synthetic
            ? "synthetic-jwt"
            : (
                  await githubAppJwt({
                      id: String(env.GITHUB_APP_ID),
                      privateKey: env.GITHUB_APP_PRIVATE_KEY,
                  })
              ).token;
    async function installToken(id: number) {
        const c = tokens.get(id);
        if (c && c.until > Date.now()) return c.token;
        const r = await req(`${API}/app/installations/${id}/access_tokens`, await jwt(), {
            method: "POST",
        });
        tokens.set(id, {
            token: r.token,
            until: Date.now() + SITE.installationTokenMinutes * 60_000,
        });
        return r.token as string;
    }

    async function access(owner: string, name: string): Promise<Access> {
        if (!/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^(?!\.+$)[A-Za-z0-9._-]{1,100}$/.test(name))
            return fail("no-access");
        const base = `${API}/repos/${owner}/${name}`;
        let raw: any, inst: any, token: string;
        if (viewerToken) {
            token = viewerToken;
            raw = await req(base, token);
            inst = env.GITHUB_APP_ID || synthetic ? await req(`${base}/installation`, await jwt()) : { id: 0 };
        } else {
            inst = await req(`${base}/installation`, await jwt());
            token = await installToken(inst.id);
            raw = await req(base, token);
            if (raw.private) return fail("no-access");
        }
        const repo = {
            owner: raw.owner.login,
            name: raw.name,
            fullName: raw.full_name,
            id: raw.id,
            private: raw.private,
            url: gh(raw.html_url),
            defaultBranch: raw.default_branch,
            topics: raw.topics ?? [],
            installationId: inst.id,
        };
        return { repo, token };
    }

    const out = async <T>(fn: () => Promise<{ data: T; readAt?: string }>): Promise<Result<T>> => {
        try {
            const r = await fn();
            return { ok: true, data: r.data, readAt: r.readAt ?? now() };
        } catch (e) {
            return { ok: false, reason: e instanceof Fail ? e.reason : "unavailable" };
        }
    };
    const cached = async <T>(
        a: Access,
        resource: string,
        load: () => Promise<{ data: T; readAt?: string }>,
    ) => {
        if (!cache || viewerToken) return load();
        const key = `https://cache.poludzku/${a.repo.id}/${a.repo.installationId}/${resource}`;
        const hit = await cache.match(key);
        if (hit) return (await hit.json()) as { data: T; readAt: string };
        const v = { data: (await load()).data, readAt: now() };
        await cache.put(
            key,
            new Response(JSON.stringify(v), {
                headers: { "cache-control": `public, max-age=${SITE.cacheSeconds}` },
            }),
        );
        return v;
    };

    async function config(a: Access) {
        try {
            const r = await req(
                `${API}/repos/${a.repo.fullName}/contents/.github/poludzku.yml`,
                a.token,
            );
            return r.encoding === "base64"
                ? parseConfig(
                      new TextDecoder().decode(
                          Uint8Array.from(atob(r.content.replace(/\s/g, "")), (c) =>
                              c.charCodeAt(0),
                          ),
                      ),
                  )
                : { status: "invalid" };
        } catch (e) {
            if (e instanceof Fail && e.reason === "expired") throw e;
            return { status: e instanceof Fail && e.status === 404 ? "absent" : "unavailable" };
        }
    }
    async function runs(a: Access, sha?: string) {
        try {
            const r = await req(
                `${API}/repos/${a.repo.fullName}/actions/runs?per_page=50${sha ? `&head_sha=${sha}` : ""}`,
                a.token,
            );
            const list = r.workflow_runs.map((x: any) => ({
                id: x.id,
                name: x.name ?? "",
                status:
                    x.status === "completed" || x.status === "in_progress" ? x.status : "queued",
                conclusion: x.conclusion ?? null,
                headSha: x.head_sha,
                branch: x.head_branch ?? "",
                prs: (x.pull_requests ?? []).map((p: any) => p.number),
                actorIsBot: x.actor?.type === "Bot",
                url: gh(x.html_url),
                createdAt: x.created_at,
            }));
            return { list, partial: false };
        } catch (e) {
            if (e instanceof Fail && e.reason === "expired") throw e;
            return { list: [], partial: true };
        }
    }
    const ctxOf = async (a: Access, sha?: string): Promise<Ctx> => {
        const [cfg, r] = await Promise.all([config(a), runs(a, sha)]);
        return {
            full: a.repo.fullName,
            topics: a.repo.topics,
            config: cfg,
            runs: r.list,
            runsPartial: r.partial,
            viewer: viewerLogin ?? null,
        };
    };
    const taskNode = async (a: Access, number: number) =>
        (await gql(a.token, "Task", TASK, { owner: a.repo.owner, name: a.repo.name, number }))
            .issueOrPullRequest;

    return {
        getRepo: (owner: string, repo: string) =>
            out(async () => ({ data: (await access(owner, repo)).repo })),

        getTask: (owner: string, repo: string, number: number) =>
            out(async () => {
                if (!Number.isInteger(number) || number < 1) return fail("not-found");
                const a = await access(owner, repo);
                return cached(a, `task/${number}`, async () => {
                    const n = (await taskNode(a, number)) ?? fail("not-found");
                    const open =
                        n.__typename === "PullRequest"
                            ? [n]
                            : n.closedByPullRequestsReferences.nodes.filter(
                                  (p: any) => p.state === "OPEN",
                              );
                    const evidence = await evidenceOf(
                        n,
                        await ctxOf(a, open.length === 1 ? open[0].headRefOid : undefined),
                    );
                    const canonical =
                        n.__typename === "PullRequest"
                            ? canonicalOf(n, a.repo.fullName)
                            : undefined;
                    return { data: { ...evidence, ...(canonical ? { canonical } : {}) } };
                });
            }),

        listTasks: (owner: string, repo: string) =>
            out(async () => {
                const a = await access(owner, repo);
                return cached(a, "list", async () => {
                    const t0 = Date.now();
                    const vars = { owner: a.repo.owner, name: a.repo.name };
                    let used = 0;
                    let partial = false;
                    const all = async (op: string, query: string, key: string) => {
                        const nodes: any[] = [];
                        for (let after: string | null = null; ;) {
                            const c: any = (await gql(a.token, op, query, { ...vars, after }))[key];
                            used++;
                            nodes.push(...c.nodes);
                            if (!c.pageInfo.hasNextPage) return nodes;
                            if (used >= budget.requests || Date.now() - t0 > budget.milliseconds) {
                                partial = true;
                                return nodes;
                            }
                            after = c.pageInfo.endCursor;
                        }
                    };
                    const issues = await all("Issues", ISSUES, "issues");
                    const prs = await all("Prs", PRS, "pullRequests");
                    const c = await ctxOf(a);
                    const listed = new Set(issues.map((n) => n.number));
                    const tasks = [
                        ...issues,
                        ...prs.filter((p) => !listed.has(canonicalOf(p, c.full))),
                    ];
                    const rows = await Promise.all(
                        tasks.map(async (n) => {
                            const e = await evidenceOf(n, c);
                            return {
                                number: n.number as number,
                                title: n.title as string,
                                url: e.url,
                                updatedAt: n.updatedAt as string,
                                view: present(derive(e as any)),
                            };
                        }),
                    );
                    return { data: { rows, partial } };
                });
            }),

        resolveBranch: (owner: string, repo: string, branch: string) =>
            out(async () => {
                if (!/^[^\s~^:?*[\\]{1,200}$/.test(branch) || branch.includes(".."))
                    return fail("not-found");
                const a = await access(owner, repo);
                const unresolved = {
                    to: null,
                    url: `${a.repo.url}/tree/${branch.split("/").map(encodeURIComponent).join("/")}`,
                };
                const hits: any[] = (
                    await gql(a.token, "Branch", BRANCH, {
                        owner: a.repo.owner,
                        name: a.repo.name,
                        branch,
                    })
                ).pullRequests.nodes;
                if (hits.length === 1)
                    return {
                        data: { to: canonicalOf(hits[0], a.repo.fullName) ?? hits[0].number },
                    };
                const agent = hits.length ? null : /^agent\/(\d+)-/.exec(branch);
                if (agent && (await taskNode(a, Number(agent[1])))?.__typename === "Issue")
                    return { data: { to: Number(agent[1]) } };
                return { data: unresolved };
            }),

        exchangeCode: (code: string, redirectUri: string) =>
            out(async () => {
                const r = await req("https://github.com/login/oauth/access_token", undefined, {
                    method: "POST",
                    headers: { accept: "application/json", "content-type": "application/json" },
                    body: JSON.stringify({
                        client_id: env.GITHUB_CLIENT_ID,
                        client_secret: env.GITHUB_CLIENT_SECRET,
                        code,
                        redirect_uri: redirectUri,
                    }),
                });
                if (!r.access_token) return fail("expired");
                return {
                    data: {
                        token: r.access_token as string,
                        expiresAt: Date.now() + (r.expires_in ?? 28_800) * 1000,
                    },
                };
            }),

        getViewer: (token: string) =>
            out(async () => ({
                data: { login: (await req(`${API}/user`, token, {}, true)).login as string },
            })),

        installUrl: () => `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,

        avatar: (name: string) =>
            out(async () => {
                if (!/^[A-Za-z0-9-]{1,39}(\[bot\])?$/.test(name)) return fail("not-found");
                let res: Response;
                try {
                    res = await f(
                        `https://avatars.githubusercontent.com/${encodeURIComponent(name)}?s=64`,
                    );
                } catch {
                    return fail("unavailable");
                }
                const contentType = res.headers.get("content-type") ?? "";
                return res.ok && contentType.startsWith("image/")
                    ? { data: { body: await res.arrayBuffer(), contentType } }
                    : fail(res.status === 404 ? "not-found" : "unavailable");
            }),
    };
}
