# Business

A teammate should be able to open a shared task link, understand the current situation and decide whether they need to act. A project lead should be able to open a repository and find the tasks waiting on people. The console serves readers in Polish and English, including readers who benefit from clear wording and a predictable layout.

## Acceptance

Use a synthetic repository on the Lifecycle preset. An issue has one linked pull request in acceptance, a required check has failed and the verified contributor has the next move.

- A reader can identify the action in progress, stage, failed state, mover and next step from the task screen before opening its details. The failed check leaves the acceptance stage intact. Both languages and keyboard-only navigation support the same reading flow.
- The issue, linked pull request and its branch lead to the same task. The project list shows one row with matching stage, state and mover, ahead of rows waiting on automation.
- A visitor can open the labelled synthetic sample without signing in. Live repository data appears only after the visitor explicitly opens an opted-in repository and GitHub authorizes the applicable access. A private view stays unavailable to an unauthorized viewer and uses `private, no-store` for an authorized viewer.
- Check outcomes using fixtures and access scenarios. The service collects no usage or individual activity metrics.

[Delivery checks](delivery.md)
