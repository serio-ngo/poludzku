// Invented GitHub world for local development and tests. Every name, number and hash is made up.
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

export const BODY = "AC1: Opis kryterium.";
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

// `{hash}` becomes the issue's spec hash when the node is served.
const ready = bot("<!-- spec-review v1 sha={hash} verdict=ready ac=1 -->", 1);
const wrote = bot("<!-- write-tests v1 spec={hash} -->", 3);
const approved = { labels: ["spec-ok"], comments: [ready, wrote] };

const draft = (n: number, closes: number, o: Def = {}) =>
    pr(n, `Testy ${closes}`, {
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
                `<!-- acceptance v1 sha=${sha(n)} -->\nhttps://github.com/przyklad/strona/actions/runs/${n + 200}\nTest lock: locked at ${sha(n).slice(0, 7)}`,
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
        const full = `przyklad/${name}`;
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
    // Writer runs (n+100) and lock runs (n+200) belong to the staged pull requests of `strona`.
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
        "strona",
        { topics: ["lifecycle"] },
        [
            issue(1, "Dodaj mapę strony"),
            issue(2, "Dodaj wyszukiwarkę", { labels: ["spec-review"] }),
            issue(3, "Dodaj galerię", { comments: [ready], assignees: ["ola"] }),
            issue(4, "Dodaj stopkę", { labels: ["spec-ok"], comments: [ready] }),
            issue(5, "Dodaj stopkę", {
                labels: ["spec-ok"],
                comments: [ready],
                assignees: ["ben"],
            }),
            issue(6, "Dodaj kontakt", approved),
            issue(7, "Dodaj opinie", approved),
            issue(8, "Dodaj newsletter", approved),
            issue(9, "Dodaj stronę zespołu", {
                ...approved,
                labels: ["spec-ok", "needs-human"],
                assignees: ["ola"],
            }),
            issue(10, "Dodaj kalendarz", approved),
            issue(11, "Dodaj regulamin", { state: "CLOSED", reason: "COMPLETED" }),
            issue(12, "Dodaj nagłówek"),
            issue(13, "Dodaj blog", { state: "CLOSED", reason: "NOT_PLANNED" }),
            issue(14, "Dodaj mapę dojazdu"),
            issue(15, "Dodaj cennik"),
            issue(34, "Popraw kontrast"),
        ],
        [
            draft(16, 6, { reviewers: ["ola"] }),
            reviewed(17, 7, { author: "serio-agent", bot: true }),
            reviewed(18, 8, { draft: false, reviewers: ["ola"], checks: ci("SUCCESS") }),
            reviewed(19, 9, { draft: false, checks: ci("SUCCESS") }),
            reviewed(20, 10, { draft: false, checks: ci("FAILURE") }),
            pr(30, "Poprawka literówek", { draft: false, reviewers: ["ben"] }),
            pr(31, "Poprawka wspólna", { draft: false, closes: [14, 15] }),
            pr(32, "Poprawka kontrastu", {
                head: "poprawka-kontrastu",
                draft: false,
                closes: [34],
            }),
        ],
        [
            [20, "spec-review", "in_progress", null, { head_branch: "agent/2-wyszukiwarka" }],
            [40, "write-tests", "in_progress", null, { head_branch: "agent/4-stopka" }],
            ...staged,
        ] as any,
    );

    add(
        "sklep",
        {},
        [
            issue(1, "Dodaj koszyk"),
            issue(2, "Dodaj płatności"),
            issue(3, "Dodaj wysyłkę"),
            issue(4, "Dodaj zwroty"),
            issue(5, "Dodaj oceny"),
            issue(6, "Dodaj kupony"),
        ],
        [
            pr(12, "Płatności", { closes: [2] }),
            pr(13, "Wysyłka", { draft: false, closes: [3], checks: ci("PENDING") }),
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
                        body: "Popraw",
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
        "wlasne",
        {
            config: "stages:\n  - name: Pomysł\n    name_en: Idea\n    label: idea\n    mover: person\n  - name: Prace\n    name_en: Work\n    label: prace\n    mover: agent\n  - name: Odbiór\n    label: odbior\n    mover: person\n",
        },
        [
            issue(1, "Pomysł A", { labels: ["idea"], assignees: ["ola"] }),
            issue(2, "Prace B", { labels: ["prace"] }),
            issue(3, "Odbiór C", { labels: ["odbior"], assignees: ["ben"] }),
            issue(4, "Bez etykiety"),
        ],
    );
    add("tajne", { private: true, access: ["ola"] }, [
        issue(1, "Tajne zadanie"),
        issue(2, "Drugie tajne zadanie"),
    ]);
    add("pusto", {});
    // Fifteen pages of two: the default request budget (12) stops after page 12, so the person-owned task on page 15 is unread.
    add(
        "duzo",
        { pageSize: 2 },
        Array.from({ length: 30 }, (_, i) =>
            issue(i + 1, `Zadanie ${i + 1}`, i + 1 === 29 ? { assignees: ["ola"] } : {}),
        ),
    );
    add("awaria", { fail: true });
    add("bez-aplikacji", { installationId: null }, [issue(1, "Zadanie")]);
    return Object.fromEntries(repos.map((r) => [r.full, r]));
}
