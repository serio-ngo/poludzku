# Product

The console shows one GitHub task in Polish or English. It answers five questions in order. What is happening? Which stage is it in? Is everything okay? Whose move is it? What happens next? The answers use plain language and link to GitHub for action. The console reads GitHub without writing to it.

## One task

An issue is a task. A pull request with exactly one readable closing issue in the same repository resolves to that issue. Pull requests with no such issue or multiple such issues are standalone tasks. Mentions and cross-repository links do not establish a task. An issue's task view includes all pull requests that resolve to it.

A branch with exactly one matching open pull request redirects to that pull request's canonical task. With no matching open pull request, a branch named `agent/<N>-…` redirects to issue `N` if that issue can be read. Multiple matches or a branch with no resolvable task show a localized message and a link to GitHub. The branch never receives its own task state.

The project page lists each canonical task once, with person-owned moves first and most recent activity first within each group. Its rows use the same derived result as the task page. [Stage and state rules](stages.md)

List open issues and open pull requests. Follow pagination within the request budget. If pages remain, label the list as partial, rank only the rows read and link to the repository on GitHub. A partial page with zero confirmed tasks must say that the list is incomplete. Test this with a person-owned task on a later page.

## Routes

| Route | View |
| --- | --- |
| `/` | A short introduction from `src/content/home.md`, one synthetic sample and an entry point for opening a GitHub repository. |
| `/<slug>` | A Markdown article from `src/content/pages/`. |
| `/gh/<owner>/<repo>` | One list for the repository the viewer opened. |
| `/gh/<owner>/<repo>/<number>` | The canonical task, its five answers, stage strip and folded technical details. |
| `/gh/<owner>/<repo>/tree/<branch>` | Canonical redirect or the unresolved branch view. |
| `/zaloguj`, `/wyloguj` | Start GitHub sign-in or sign out. |
| `/regulamin` | Terms covering the publisher, session data, retention and tracking policy. |

Polish is served at the root and English under `/en`. Both variants preserve the same routes. The sample uses synthetic data and is visibly identified. The home page has no organization tabs or repository directory.

## Access

The viewer opens a specific repository that has opted in through installation of the read-only GitHub App. An opted-in public repository can be read without signing in. A private repository requires GitHub sign-in and a read using the viewer's token. GitHub must authorize that viewer before any private task or repository information is returned. An unavailable repository view reveals no private metadata. Private and viewer-specific responses use `Cache-Control: private, no-store`.

The browser stores only the signed-in session cookie. There is no tracking. Live tool pages use `noindex`, show when GitHub data was read and provide a manual reload link. The interface supports keyboard use, conveys stage and state in text and keeps technical details folded. [Interface contract](interface.md)
