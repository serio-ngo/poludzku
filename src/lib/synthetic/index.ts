import { specHash } from "../stages.mjs";
import { BODY, makeWorld, type Def, type Repo } from "./repos.ts";

let world = makeWorld();

export const __reset = () => {
    world = makeWorld();
};
export const __setVisibility = (full: string, v: "private" | "public") => {
    world[full]!.private = v === "private";
};
export const __removeInstallation = (full: string) => {
    world[full]!.installationId = null;
};
export const __revokeAccess = (login: string, full: string) => {
    world[full]!.access = world[full]!.access.filter((l) => l !== login);
};

type Auth = { kind: "jwt" } | { kind: "inst"; id: number } | { kind: "user"; login: string } | null;
const authOf = (header: string | null): Auth => {
    const token = (header ?? "").replace(/^(Bearer|token) /, "");
    if (token === "synthetic-jwt") return { kind: "jwt" };
    const inst = /^synthetic-inst-(\d+)$/.exec(token);
    if (inst) return { kind: "inst", id: Number(inst[1]) };
    const user = /^ghu_synthetic_(\w+)$/.exec(token);
    return user && user[1] !== "expired" ? { kind: "user", login: user[1]! } : null;
};
const canRead = (a: Auth, r: Repo) =>
    a?.kind === "inst"
        ? a.id === r.installationId
        : a?.kind === "user"
          ? !r.private || r.access.includes(a.login)
          : false;

const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
const minute = (n: number) =>
    new Date(Date.UTC(2026, 1, 1, 8, n)).toISOString().replace(".000", "");
const person = (login: string, bot = false) => ({ login, __typename: bot ? "Bot" : "User" });

const common = (r: Repo, d: Def, hash: string) => ({
    __typename: d.head ? "PullRequest" : "Issue",
    number: d.n,
    title: d.title,
    state: d.state,
    url: `https://github.com/${r.full}/${d.head ? "pull" : "issues"}/${d.n}`,
    updatedAt: minute(d.n),
    author: person(d.author, d.bot),
    assignees: { nodes: d.assignees.map((login: string) => ({ login })) },
    labels: { nodes: d.labels.map((name: string) => ({ name })) },
    timelineItems: {
        nodes: d.labels.map((name: string) => ({
            createdAt: minute(2),
            label: { name },
            actor: { login: "ola" },
        })),
    },
    comments: {
        nodes: d.comments.map((c: Def) => ({
            body: c.body.replace("{hash}", hash),
            createdAt: minute(c.at),
            author: person(c.login, c.bot),
        })),
    },
});
const check = (full: string, [name, state]: string[]) => ({
    __typename: "CheckRun",
    name,
    status: state === "PENDING" ? "IN_PROGRESS" : "COMPLETED",
    conclusion: state === "PENDING" ? null : state,
    detailsUrl: `https://github.com/${full}/runs/${name}`,
});
const prNode = (r: Repo, d: Def) => ({
    ...common(r, d, ""),
    body: d.body ?? "",
    createdAt: minute(d.n),
    isDraft: d.draft,
    headRefOid: d.sha,
    headRefName: d.head,
    repository: { nameWithOwner: r.full },
    reviewRequests: {
        nodes: d.reviewers.map((login: string) => ({ requestedReviewer: { login } })),
    },
    reviews: {
        pageInfo: { hasPreviousPage: false },
        nodes: d.reviews.map((v: Def) => ({
            state: v.state,
            body: v.body,
            submittedAt: minute(v.at),
            commit: { oid: v.sha },
            author: { login: v.login },
        })),
    },
    statusCheckRollup: d.checks
        ? {
              contexts: {
                  pageInfo: { hasNextPage: false },
                  nodes: d.checks.map((c: string[]) => check(r.full, c)),
              },
          }
        : null,
    closingIssuesReferences: {
        pageInfo: { hasNextPage: false },
        nodes: d.closes.map((number: number) => ({
            number,
            repository: { nameWithOwner: r.full },
        })),
    },
});
const issueNode = async (r: Repo, d: Def) => ({
    ...common(r, d, await specHash(d.title, BODY)),
    body: BODY,
    stateReason: d.reason ?? null,
    closedByPullRequestsReferences: {
        pageInfo: { hasNextPage: false },
        nodes: r.prs.filter((p) => p.closes.includes(d.n)).map((p) => prNode(r, p)),
    },
});
const node = (r: Repo, d: Def) => (d.head ? prNode(r, d) : issueNode(r, d));

const page = async (r: Repo, list: Def[], after: string | null) => {
    const size = r.pageSize ?? 50;
    const i = Number(after ?? 0);
    return {
        pageInfo: { hasNextPage: i + size < list.length, endCursor: String(i + size) },
        nodes: await Promise.all(list.slice(i, i + size).map((d) => node(r, d))),
    };
};

async function graphql(auth: Auth, body: Def): Promise<Response> {
    const v = body.variables;
    const r = world[`${v.owner}/${v.name}`.toLowerCase()];
    if (r?.fail) return json({ message: "Bad Gateway" }, 502);
    if (!r || !canRead(auth, r))
        return json({ data: { repository: null }, errors: [{ type: "NOT_FOUND" }] });
    const open = (list: Def[]) => list.filter((d) => d.state === "OPEN");
    if (body.operationName === "Task") {
        const d = [...r.issues, ...r.prs].find((x) => x.n === v.number);
        return json({
            data: { repository: { issueOrPullRequest: d ? await node(r, d) : null } },
            ...(d ? {} : { errors: [{ type: "NOT_FOUND" }] }),
        });
    }
    if (body.operationName === "Issues")
        return json({ data: { repository: { issues: await page(r, open(r.issues), v.after) } } });
    if (body.operationName === "Prs")
        return json({
            data: { repository: { pullRequests: await page(r, open(r.prs), v.after) } },
        });
    if (body.operationName === "Branch") {
        const hits = open(r.prs)
            .filter((p) => p.head === v.branch)
            .slice(0, 2);
        return json({
            data: { repository: { pullRequests: { nodes: hits.map((p) => prNode(r, p)) } } },
        });
    }
    return json({ errors: [{ type: "BAD_REQUEST" }] }, 400);
}

const avatar = (login: string) => {
    const hue = [...login].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    const initial = /^[A-Za-z0-9]/.test(login) ? login[0]!.toUpperCase() : "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 45% 40%)"/><text x="32" y="43" font-size="30" text-anchor="middle" fill="#fff" font-family="sans-serif">${initial}</text></svg>`;
    return new Response(svg, { headers: { "content-type": "image/svg+xml" } });
};

export async function syntheticFetch(
    input: string | URL | Request,
    init: RequestInit = {},
): Promise<Response> {
    const u = new URL(input instanceof Request ? input.url : input);
    const header = new Headers(init.headers).get("authorization");
    const auth = authOf(header);
    if (u.hostname === "avatars.githubusercontent.com")
        return avatar(decodeURIComponent(u.pathname.slice(1)));
    if (u.hostname === "github.com" && u.pathname === "/login/oauth/access_token") {
        const code = /^synthetic-(\w+)$/.exec(JSON.parse(String(init.body)).code ?? "");
        return json(
            code
                ? {
                      access_token: `ghu_synthetic_${code[1]}`,
                      expires_in: 28800,
                      token_type: "bearer",
                  }
                : { error: "bad_verification_code" },
        );
    }
    if (u.hostname !== "api.github.com") return json({ message: "Not Found" }, 404);
    if (header && !auth) return json({ message: "Bad credentials" }, 401);
    if (u.pathname === "/user")
        return auth?.kind === "user"
            ? json({ login: auth.login })
            : json({ message: "Bad credentials" }, 401);
    if (u.pathname === "/graphql") return graphql(auth, JSON.parse(String(init.body)));
    const token = /^\/app\/installations\/(\d+)\/access_tokens$/.exec(u.pathname);
    if (token)
        return auth?.kind === "jwt"
            ? json({ token: `synthetic-inst-${token[1]}`, expires_at: minute(60) }, 201)
            : json({ message: "Bad credentials" }, 401);

    const m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(u.pathname);
    const r = m && world[`${m[1]}/${m[2]}`.toLowerCase()];
    if (r && r.fail) return json({ message: "Bad Gateway" }, 502);
    const rest = m?.[3] ?? "";
    if (rest === "/installation")
        return auth?.kind !== "jwt"
            ? json({ message: "Bad credentials" }, 401)
            : r && r.installationId
              ? json({ id: r.installationId })
              : json({ message: "Not Found" }, 404);
    if (!r || !canRead(auth, r)) return json({ message: "Not Found" }, 404);
    if (rest === "") {
        return json({
            id: r.id,
            name: r.full.split("/")[1],
            full_name: r.full,
            owner: { login: "example" },
            private: r.private,
            html_url: `https://github.com/${r.full}`,
            default_branch: "main",
            topics: r.topics,
        });
    }
    if (rest === "/contents/.github/poludzku.yml") {
        return r.config === null
            ? json({ message: "Not Found" }, 404)
            : json({
                  encoding: "base64",
                  content: btoa(String.fromCharCode(...new TextEncoder().encode(r.config))),
              });
    }
    if (rest === "/actions/runs") {
        const head = u.searchParams.get("head_sha");
        return json({ workflow_runs: r.runs.filter((x) => !head || x.head_sha === head) });
    }
    return json({ message: "Not Found" }, 404);
}
