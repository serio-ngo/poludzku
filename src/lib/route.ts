export type Route =
    | { kind: "list" }
    | { kind: "task"; number: number }
    | { kind: "branch"; branch: string }
    | { kind: "invalid" };

const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;
const NUMBER = /^[1-9]\d{0,9}$/;
const BAD_BRANCH = /[\u0000-\u001f\u007f]/;

/** Validates the `/gh/<owner>/<repo>/<rest>` params before anything is read. */
export function parseRoute(owner = "", repo = "", rest = ""): Route {
    if (!OWNER.test(owner) || !REPO.test(repo)) return { kind: "invalid" };
    if (!rest) return { kind: "list" };
    if (NUMBER.test(rest)) return { kind: "task", number: Number(rest) };
    const branch = rest.startsWith("tree/") ? rest.slice(5) : "";
    if (!branch || branch.length > 255 || branch.includes("..") || BAD_BRANCH.test(branch))
        return { kind: "invalid" };
    return { kind: "branch", branch };
}
