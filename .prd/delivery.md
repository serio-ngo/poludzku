# One-session delivery

Deliver one locally runnable release candidate in a single working session. Use one branch, one integrated review and one acceptance run. A new contributor must be able to start the candidate and exercise both languages without access to a live account. Public release has its own acceptance in [migration.md](migration.md).

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
| 2. Read one task end to end | Serve a task through the real route, data adapter and HTML templates. Add the project list, branch resolution, PL/EN, introductory content and terms. | Open the same task from the list, a pull request and its branch. In both languages the reader sees the same status, the time of the read and one next step. |
| 3. Wire repository access | Implement the GitHub reads, installation checks, sign-in, session expiry, sign-out and cache rules in [tech.md](tech.md). Use a synthetic upstream at the HTTP boundary for local verification. | With two separate browser sessions, exercise public, authorized private, denied, expired, signed-out and public-to-private cases. Check status, body, headers and cache behavior, including the second request. |
| 4. Verify the whole candidate | Run the production build, start its preview, run the browser and accessibility suites, and test the redirect mechanism against an invented URL inventory. Fix findings against this candidate. | A fresh reviewer checks the complete diff. Record exact commands, pass/fail counts, limits and any release-only checks. Keep all test evidence synthetic. |

## Acceptance

1. A fresh checkout installs from its lockfile, builds and starts via documented commands. A synthetic task and project list are reachable through their normal routes with no credentials.
2. The examples in [stages.md](stages.md) pass. A failed read never produces a successful empty list, and unrelated activity never advances a task.
3. In PL and EN, Playwright verifies the five answers, person-first ordering, standalone and ambiguous pull requests, branch resolution, keyboard navigation and failure views. Check the page budgets in [tech.md](tech.md) on the production preview.
4. Point two server instances at the same session store. Confirm that the same signed-in cookie can read a synthetic private title through both. Sign out through the first, then replay the saved cookie through the second. It must disclose no private title. Also verify denial after revoking repository access, removing an installation and changing a warmed public repository to private.
5. Inspect the release tree, rendered demo and generated assets for identifiers and records. Verify the license and local document links. Record build proof, preview proof, live integration proof and public release proof separately; each needs its own observation.

When live credentials are already authorized, verify an opted-in task through the same adapter. Otherwise the session can prove the candidate against the synthetic upstream; live sign-in, production redirects and the domain switch remain release checks. Never archive an existing service on the strength of a fixture run.
