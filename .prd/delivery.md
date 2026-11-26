# One-session delivery

Deliver the complete product in a single working session: every route in [product.md](product.md), both languages, live GitHub reads, sign-in and sign-out, the terms, and the newsroom page and redirects from [migration.md](migration.md) steps 2 and 3. Nothing ships as a placeholder: no TODO, stub, lorem ipsum, bracketed gap or "coming soon". Use one branch, one integrated review and one acceptance run. A new contributor can still start the candidate and exercise both languages without any account, against the synthetic upstream. Publication has its own steps under [Release](#release).

## Critical design decisions

| Observed problem | Consequence for the reader | Decision and how to test it |
| --- | --- | --- |
| In the operator flow, a green change can reach the approval action before a request for human intervention is considered. | A blocked task looks ready. | Compute process stage, health and next mover separately. A green change waiting for help stays at stage 7, shows the block and points to a person. |
| The operator view collects commands, setup state and activity across repositories. Hiding controls would leave that data in the response. | A read-only screen could still expose unrelated work. | Construct a new task result from an explicitly requested repository. Inspect the actual response and browser storage for a synthetic record belonging to a second repository. |
| When a query fails, an empty result can look like a quiet project. Missing checks can also look like successful checks. | A reader stops looking precisely when the system has lost visibility. | Distinguish a successful empty list, an unavailable list and incomplete task evidence. Fail one read and verify the appropriate message. |
| Matching a run by title lets two identically named tasks share a status. Reading only the most recent runs can also miss the relevant one. | A task can report that an agent is working while the reader actually needs to act. | Match the task and current revision. Give two synthetic tasks the same title, start a run for one and verify that only its mover changes. |
| The earlier design joined five pull requests, account registration, a domain switch and a content migration to the first working screen. | Review and account setup sat on the critical path to testing the product. | Build one vertical slice first and exercise it with synthetic responses. Finish the remaining routes and access paths in the same candidate. Verify account-dependent publication separately. |

## Build order

| Step | Deliverable | Exit check in the same session |
| --- | --- | --- |
| 1. Model the task | Normalize synthetic issue, pull request, review, run and check inputs. Implement the stage rules as a pure function. | Run `node --test` over both presets, custom labels and the precedence cases in [stages.md](stages.md). Include two tasks with the same title and different runs. |
| 2. Read one task end to end | Serve a task through the real route, data adapter and the glyph screens in [interface.md](interface.md). Add the project list, branch resolution, PL/EN, the home page, terms, `/newsroom` and the redirects. | Open the same task from the list, a pull request and its branch. In both languages the reader sees the same glyphs, the read time and one next step. |
| 3. Register the App and wire access | Commit `app-manifest.json`. With the owner's consent, register the App, keep its credentials in `.dev.vars` and install it on the public repositories the owner picks. Implement the GitHub reads, installation checks, sign-in, session expiry, sign-out and cache rules in [tech.md](tech.md). Tests use a synthetic upstream at the HTTP boundary. | With two separate browser sessions, exercise public, authorized private, denied, expired, signed-out and public-to-private cases. Check status, body, headers and cache behavior, including the second request. Read one live task through the same adapter. |
| 4. Verify the whole candidate | Run the production build, start its preview, run the browser and accessibility suites, and test the redirects against the real slug list. Fix findings against this candidate. | A fresh reviewer checks the complete diff. Record exact commands, pass/fail counts and limits. Keep every test fixture synthetic. |
| 5. Live tour | Run the dev server against live GitHub and capture every screen, first anonymous, then signed in. | The owner receives every screenshot. |

Ask for the owner's consent at the start of the session and build on the synthetic upstream until it arrives; only the live part of step 3 waits for it. One "yes" in chat covers the agent clicking Create, Install and Authorize on GitHub; GitHub requires an organisation owner's session for the first two. Signing in to GitHub itself stays with the owner.

## Live tour

1. Start the dev server with the live credentials in `.dev.vars`.
2. **Anonymous pass** at 1280 px: the home page, `/regulamin`, `/newsroom` and a missing page. For every installed repository: its list, each open task, the latest completed issue and pull request, and a closed unmerged one where present. A branch with a pull request and one without. A repository without the App. Add the list and one task at 390 px, and the same two in EN.
3. **Signed-in pass:** sign in through `/zaloguj`, repeat every page of the anonymous pass, then sign out through `/wyloguj` and show one page anonymous again.
4. A state that no installed repository shows on the day comes from the synthetic upstream, with `synthetic` in its file name.
5. Screenshots stay out of the repository. Send them to the owner and record which came from live data.

## Acceptance

1. A fresh checkout installs from its lockfile, builds and starts via documented commands. A synthetic task and project list are reachable through their normal routes with no credentials.
2. The examples in [stages.md](stages.md) pass. A failed read never produces a successful empty list, and unrelated activity never advances a task.
3. In PL and EN, Playwright verifies the glyphs and their accessible names, the [text budget](interface.md#text-budget), person-first ordering, standalone and ambiguous pull requests, branch resolution, keyboard navigation and the unavailable views. Check the page budgets in [tech.md](tech.md) on the production preview.
4. Point two server instances at the same session store. Confirm that the same signed-in cookie can read a synthetic private title through both. Sign out through the first, then replay the saved cookie through the second. It must disclose no private title. Also verify denial after revoking repository access, removing an installation and changing a warmed public repository to private.
5. Inspect the release tree, rendered pages and generated assets for secrets, tokens and private content. A search of `src/` and `public/` for `TODO`, `FIXME`, `lorem`, `coming soon` and bracketed capitals such as `[ADRES]` finds nothing. Verify the license and local document links. Record build proof, preview proof, live integration proof and public release proof separately; each needs its own observation.
6. The live tour ran in both passes and the owner received the screenshots.

Production redirects on the live domain and the domain switch remain release checks. Never archive an existing service on the strength of a fixture run.

## Release

The agent does each step; the owner gives only the consents named.

| Step | How | Owner's part |
| --- | --- | --- |
| Production secrets | Pipe the App id, the PKCS#8 key and the client secret from `.dev.vars` into `wrangler secret put` | None |
| Connect the repository to Workers Builds | Cloudflare dashboard in the browser; there is no API to connect a repository yet ([workers-sdk 12058](https://github.com/cloudflare/workers-sdk/issues/12058)) | A "yes" in chat |
| `main` ruleset | `gh api` as the organisation owner: code-owner approval of the latest push, human-only updates | None beyond the same "yes" |
| Join the lifecycle after release 1 | Topic `lifecycle`, then the lifecycle console's `--setup-all` | None |
| One stage engine | One hand-made pull request in the lifecycle console's repository: the console loads `stages.mjs` from this repository and drops its own derivation | One merge |

If the browser is not signed in to GitHub or Cloudflare, signing in there is the owner's only extra step.

Moving `poludzku.info` from the newsroom Worker to this one replaces what readers see, so the agent asks once on the day, then detaches the domain from news-interface and deploys. [migration.md](migration.md) lists the checks around the switch.

Owner's total: one consent in the session, one at release, one merge of the candidate, one merge in the console's repository, one "go" for the switch.
