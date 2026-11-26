export type Def = Record<string, any>;
export type Repo = {
    full: string;
    id: number;
    installationId: number | null;
    private: boolean;
    topics: string[];
    config: string | null;
    access: string[];
    fail?: boolean;
    pageSize?: number;
    issues: Def[];
    prs: Def[];
    runs: Def[];
};

export const BODY = "AC1: Criterion text.";
const sha = (n: number) => n.toString(16).padStart(2, "0").repeat(20);

const issue = (n: number, title: string, o: Def = {}): Def => ({
    n,
    title,
    state: "OPEN",
    labels: [],
    assignees: [],
    author: "ala",
    comments: [],
    ...o,
});
const pr = (n: number, title: string, o: Def = {}): Def => ({
    n,
    title,
    head: `agent/${n}-pr`,
    sha: sha(n),
    draft: true,
    state: "OPEN",
    author: "ala",
    bot: false,
    assignees: [],
    reviewers: [],
    reviews: [],
    checks: null,
    closes: [],
    labels: [],
    comments: [],
    ...o,
});
const bot = (body: string, at: number): Def => ({ body, login: "github-actions", bot: true, at });

const ready = bot("<!-- spec-review v1 sha={hash} verdict=ready ac=1 -->", 1);
const wrote = bot("<!-- write-tests v1 spec={hash} -->", 3);
const approved = { labels: ["spec-ok"], comments: [ready, wrote] };

const draft = (n: number, closes: number, o: Def = {}) =>
    pr(n, `Tests ${closes}`, {
        closes: [closes],
        comments: [bot(`<!-- write-tests v1 run=${n + 100} -->`, 3)],
        ...o,
    });
const reviewed = (n: number, closes: number, o: Def = {}) =>
    draft(n, closes, {
        reviews: [{ state: "COMMENTED", body: "tests-ok", sha: sha(n), login: "ola", at: 4 }],
        comments: [
            bot(`<!-- write-tests v1 run=${n + 100} -->`, 3),
            bot(
                `<!-- acceptance v1 sha=${sha(n)} -->\nhttps://github.com/example/website/actions/runs/${n + 200}\nTest lock: locked at ${sha(n).slice(0, 7)}`,
                5,
            ),
        ],
        ...o,
    });
const ci = (state: string) => [["ci", state]];

export function makeWorld(): Record<string, Repo> {
    const repos: Repo[] = [];
    const add = (
        name: string,
        o: Partial<Repo>,
        issues: Def[] = [],
        prs: Def[] = [],
        runs: Def[] = [],
    ) => {
        const i = repos.length;
        const full = `example/${name}`;
        const run = (
            id: number,
            rname: string,
            status: string,
            conclusion: string | null,
            p: Def = {},
        ) => ({
            id,
            name: rname,
            status,
            conclusion,
            head_sha: sha(id),
            head_branch: "main",
            pull_requests: [],
            actor: { login: "github-actions[bot]", type: "Bot" },
            html_url: `https://github.com/${full}/actions/runs/${id}`,
            created_at: "2026-02-01T09:00:00Z",
            ...p,
        });
        repos.push({
            full,
            id: 1001 + i,
            installationId: 2001 + i,
            private: false,
            topics: [],
            config: null,
            access: [],
            issues,
            prs,
            runs: runs.map((r) => run(r[0], r[1], r[2], r[3], r[4])),
            ...o,
        });
    };
    const staged = [16, 17, 18, 19, 20].flatMap((n) => [
        [
            n + 100,
            "write-tests",
            "completed",
            "success",
            { head_sha: sha(n), pull_requests: [{ number: n }] },
        ],
        ...(n > 16
            ? [
                  [
                      n + 200,
                      "lifecycle-gate",
                      "completed",
                      "success",
                      { head_sha: sha(n), pull_requests: [{ number: n }] },
                  ],
              ]
            : []),
    ]);

    add(
        "website",
        { topics: ["lifecycle"] },
        [
            issue(1, "Add sitemap"),
            issue(2, "Add search", { labels: ["spec-review"] }),
            issue(3, "Add gallery", { comments: [ready], assignees: ["ola"] }),
            issue(4, "Add footer", { labels: ["spec-ok"], comments: [ready] }),
            issue(5, "Add footer", {
                labels: ["spec-ok"],
                comments: [ready],
                assignees: ["ben"],
            }),
            issue(6, "Add contact", approved),
            issue(7, "Add reviews", approved),
            issue(8, "Add newsletter", approved),
            issue(9, "Add team page", {
                ...approved,
                labels: ["spec-ok", "needs-human"],
                assignees: ["ola"],
            }),
            issue(10, "Add calendar", approved),
            issue(11, "Add terms", { state: "CLOSED", reason: "COMPLETED" }),
            issue(12, "Add header"),
            issue(13, "Add blog", { state: "CLOSED", reason: "NOT_PLANNED" }),
            issue(14, "Add directions"),
            issue(15, "Add pricing"),
            issue(34, "Fix contrast"),
        ],
        [
            draft(16, 6, { reviewers: ["ola"] }),
            reviewed(17, 7, { author: "serio-agent", bot: true }),
            reviewed(18, 8, { draft: false, reviewers: ["ola"], checks: ci("SUCCESS") }),
            reviewed(19, 9, { draft: false, checks: ci("SUCCESS") }),
            reviewed(20, 10, { draft: false, checks: ci("FAILURE") }),
            pr(30, "Fix typos", { draft: false, reviewers: ["ben"] }),
            pr(31, "Shared fix", { draft: false, closes: [14, 15] }),
            pr(32, "Contrast fix", {
                head: "fix-contrast",
                draft: false,
                closes: [34],
            }),
        ],
        [
            [20, "spec-review", "in_progress", null, { head_branch: "agent/2-search" }],
            [40, "write-tests", "in_progress", null, { head_branch: "agent/4-footer" }],
            ...staged,
        ] as any,
    );

    add(
        "store",
        {},
        [
            issue(1, "Add cart"),
            issue(2, "Add payments"),
            issue(3, "Add shipping"),
            issue(4, "Add returns"),
            issue(5, "Add ratings"),
            issue(6, "Add coupons"),
        ],
        [
            pr(12, "Payments", { closes: [2] }),
            pr(13, "Shipping", { draft: false, closes: [3], checks: ci("PENDING") }),
            pr(14, "Zwroty", {
                draft: false,
                closes: [4],
                checks: ci("SUCCESS"),
                reviewers: ["ben"],
            }),
            pr(15, "Oceny", {
                draft: false,
                closes: [5],
                checks: ci("SUCCESS"),
                reviews: [
                    {
                        state: "CHANGES_REQUESTED",
                        body: "Fix",
                        sha: sha(15),
                        login: "ben",
                        at: 4,
                    },
                ],
            }),
            pr(16, "Kupony", { draft: false, closes: [6], reviewers: ["ola"] }),
        ],
    );

    add(
        "custom",
        {
            config: "stages:\n  - name: Idea\n    name_en: Idea\n    label: idea\n    mover: person\n  - name: Work\n    name_en: Work\n    label: work\n    mover: agent\n  - name: Review\n    label: review\n    mover: person\n",
        },
        [
            issue(1, "Idea A", { labels: ["idea"], assignees: ["ola"] }),
            issue(2, "Work B", { labels: ["work"] }),
            issue(3, "Review C", { labels: ["review"], assignees: ["ben"] }),
            issue(4, "Bez etykiety"),
        ],
    );
    add("private", { private: true, access: ["ola"] }, [
        issue(1, "Secret task"),
        issue(2, "Second secret task"),
    ]);
    add("empty", {});
    add(
        "many",
        { pageSize: 2 },
        Array.from({ length: 30 }, (_, i) =>
            issue(i + 1, `Task ${i + 1}`, i + 1 === 29 ? { assignees: ["ola"] } : {}),
        ),
    );
    add("outage", { fail: true });
    add("no-app", { installationId: null }, [issue(1, "Task")]);
    return Object.fromEntries(repos.map((r) => [r.full, r]));
}
