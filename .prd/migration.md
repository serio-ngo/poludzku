# Migration

If deployment replaces an existing site, preserve its public links. The operator supplies the current URL inventory from a sitemap, an export or a maintained list at deployment time. Keep the inventory and redirects derived from it in deployment inputs.

## Release candidate

Build and verify the candidate in one implementation session. Exercise redirect handling with synthetic paths. When the operator supplies the deployment inputs, compare the full inventory against the preview and verify that every old URL either still serves its intended page or returns an HTTP 301 redirect to a reachable public destination. Check the expected destination as well as the final HTTP status. Use a localized Markdown page for retired content that needs an explanation. Record any missing inputs or failed checks as unresolved.

## Cutover

A human performs the live switch after verifying the inventory against the candidate. After the switch, repeat the URL checks on the live origin. Record which preview and production checks actually ran and keep the previous deployment available until the live checks pass. For a new site, there is no prior URL inventory to verify.
