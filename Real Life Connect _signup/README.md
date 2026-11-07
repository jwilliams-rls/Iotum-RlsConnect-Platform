# Real Life Connect signup backend

Development-only signup persistence. Stripe payment, automatic customer provisioning, email verification and room reservations are not implemented yet. Website login and operator-controlled Iotum test provisioning are available. A saved signup remains `pending_payment`, not an active subscription.

## Run in Codespaces

Use Node.js 22.16 or later (Node 24 recommended). This uses Node's built-in SQLite module and may display an ExperimentalWarning on supported Node releases; no separate SQLite service is needed.

```bash
node --version
npm ci
npm start
```

The backend listens on 127.0.0.1:4001. Run Vite in the sibling frontend folder and use its existing /api proxy. Do not publicly forward port 4001.

## Storage

The default database is `var/real-life-connect.sqlite` relative to this backend folder, independently of the shell's current directory. It persists across server and Codespace restarts, but deleting the Codespace deletes its local data. Production must use durable local storage. Do not put this file in a public web directory, Git, or a multi-server shared filesystem.

Optionally set `SQLITE_PATH` in the server environment to an absolute private file path. The application creates organizations and users on first start, with a versioned schema, foreign keys, unique case-insensitive email addresses, and atomic signup transactions. Passwords use salted scrypt hashes; raw passwords are never stored or returned. Existing in-memory prototype signups cannot be migrated because they were never saved.

There is no unauthenticated endpoint to browse user records, password hashes, or database files. Use fictional data. Production readiness still requires email verification, password recovery, broader abuse protection, an audit trail and reviewed deployment configuration.

## Back up and restore

```bash
npm run backup
```

This creates a consistent SQLite snapshot under `backups/`, even while the application is running. No automatic schedule or off-host copy is configured yet. Backups contain sensitive account data; protect them and copy them to private durable storage before deleting a Codespace.

To restore: stop the backend, preserve the current database and any `-wal`/`-shm` companions together in a separate location, then copy the chosen snapshot to the configured SQLite path (with no old companions at that path). Restrict permissions and restart. Never copy just a live main database file as a substitute for the backup command.

## Verify

```bash
npm test
```

Tests use temporary databases and check restart persistence, password hashing, case-insensitive duplicate handling, atomic rollback and request validation. No Stripe or Iotum calls are made.

Subscriptions, package selections, room assignments, calendar conflict checks and meeting notifications will be added in later schema migrations.


## Editable pricing and feature catalog

On startup, schema version 2 adds a versioned SQLite catalog without changing existing signups. Defaults are inserted only once; subsequent restarts never overwrite edits. Database backups include all catalog versions.

The catalog stores individual Basic/Plus/Pro selling prices and monthly supplier costs, the organization Basic selling price and supplier cost, shared-room user limits, and the feature comparison. Shared Plus/Pro room prices and costs currently use their corresponding individual plan amounts.

Draft webinar packages cover 500, 1,000, 3,000 and 5,000 attendees for seven days. Their supplier monthly costs are stored separately from retail event prices. Retail webinar prices and marked-up usage rates are `null` (not yet set), never zero/free. These drafts are not published or purchasable. Supplier reference rates require confirmation against the current contract. Expiry, deletion, billing and provisioning are not implemented by catalog settings.

Use the free terminal in the backend directory:

```bash
npm run backup
npm run catalog -- export var/catalog-edit.json
```

Open `var/catalog-edit.json` in the Codespaces file explorer. Change values inside `catalog`, leaving `revision` unchanged. For example, `priceCents: 799` means a customer price of $7.99; `supplierMonthlyCents: 299` means our monthly cost of $2.99. Organization Basic has separate `organizationUserCents` and `organizationUserSupplierCents`. Usage uses integer millionths of a dollar (`supplierMicroUsd: 45000` means $0.045 per unit); `priceMicroUsd` is our customer rate including markup. Costs and retail prices are independent; editing a cost never automatically increases the selling price. Keep participant capacities consistent with the Meeting participants feature row.

```bash
npm run catalog -- import var/catalog-edit.json
```

Refresh the website to see meeting price and feature edits. No server restart is needed after an import. Export to a new filename for the next edit: export refuses to overwrite a file, and import rejects stale revisions and invalid amounts. Previous versions remain in `catalog_versions` for recovery. The CLI requires local server access; no browser-based admin editor or public write API exists yet.

`GET /api/catalog` returns only public meeting prices and features. Wholesale costs, usage costs, supplier notes and unfinished webinar packages are excluded. The website loads this catalog before rendering and shows an unavailable message if the backend cannot be reached, rather than displaying old hardcoded prices. Existing subscriptions/orders are not repriced: subscription billing is not connected yet.

Schema version 3 corrects the original unspecified Basic second-camera value to not included. Existing pricing edits are preserved, and the earlier catalog revision is retained. Explicit operator changes to that feature are not overwritten. Restart the backend after pulling this update.

Schema version 4 applies the owner clarification: Basic includes Audio recording, but all subsequent feature rows are not included. Migration changes only those Basic cells and preserves Plus/Pro, prices, costs, signups and catalog history.

## Iotum operator test provisioning

This is a local operator workflow, not a public activation endpoint. It does not connect Stripe, mark a customer paid, implement website login/SSO, or create shared-room reservations. The owner confirms test provisioning is within the existing minimum account commitment. Catalog supplier costs remain reference costs, not a claim that each test causes a new charge.

Use the existing `IOTUM_API_TOKEN` Codespaces secret. No API token, auth session, Iotum password, moderator PIN, SSO key or password-creation link is logged or saved. Requests use the fixed reseller portal over HTTPS. Do not paste credentials into chat or put them in Git.

In this backend directory, run the read-only first step:

```bash
npm run iotum -- check
```

This authenticates and displays product names/slugs and IDs if supplied. It creates nothing and does not need the website servers stopped. Missing-token output means the Codespace needs its existing repository secret loaded; do not replace it with a token pasted into the terminal.

For the controlled test, choose a local signup using an email you control. `npm run iotum -- signups` lists local IDs and emails; treat that output as private. Submit a development signup first if no suitable test exists. Never reuse a production customer's identity for this test.

Prepare a local draft using your actual test email, the VERIFIED numeric Basic product ID (or `default` to use the reseller default), and a unique subdomain (replace the example arguments):

```bash
npm run iotum -- prepare your-test-email@example.com 123 rlc-test-unique
```

`123` is only an example, not a verified Iotum product ID. The documented product-list response does not always provide numeric IDs; if missing, obtain the Basic product ID from your Iotum configuration or representative. Do not substitute the plan slug for a numeric product ID or guess. Where the API returns an ID, the code checks that it matches the Basic slug before writing. The default organization subscription is not assumed: company creation explicitly supplies this product ID, then the active subscription is checked before creating a host. A mismatch stops the workflow without silently changing/canceling subscriptions.

Review the draft (company, user, subdomain, product and plan) and its job ID. It has made no Iotum writes. Then:

```bash
npm run iotum -- status JOB_ID
npm run iotum -- activate JOB_ID
```

Activation creates real Iotum resources within the owner's authorized test allocation. The new administrator receives no welcome email, uses no automatic recording/streaming, and has invitation/reminder/summary notifications enabled. Default third-party services still depend on provider settings and plan entitlements.

The resulting company ID, host ID and meeting URL are stored in private SQLite table `iotum_provisioning` (schema version 5). This limited initial workflow supports one new test company and admin per local organization, not adding further hosts to an existing organization. Back up the database normally. The test leaves local signup status `pending_payment`, and uses separate `ready_test` state so provisioning never pretends a customer paid.

To access the built-in UI for the first test, open the existing Iotum portal in your browser and establish that host's password through its password-reset flow. Sign in with that host's email, not the reseller administrator. Verify that the dashboard can schedule, start, and join meetings. The saved meeting URL is a meeting/attendee URL; it does not authenticate the host or provide a website SSO link. Future website login/SSO will supply authenticated access.

Interrupted writes are not retried automatically. `company_creating`, `host_creating`, or `review_required` means inspect the reseller panel and recorded IDs before doing anything else. No automatic remote deletion, cancellation or duplicate creation is attempted. A known `company_created` job can resume read checks and host creation without creating the company again. If host creation succeeds but response validation fails, the host ID is retained for reconciliation. Password reset and dashboard access must be tested in the live portal; mocked tests cannot establish those behaviors.

Sources: Iotum community REST API sections 4.1, 5.1, 5.8 and 6.1, https://github.com/iotum/community/wiki/REST-APIs (read via indexed mirror when the original page was unavailable).

If the API does not supply a numeric product ID, use `default` in the prepare command instead of a number. This omits optional `product_id` from company creation. Iotum applies the reseller default. The code then verifies that the company has exactly one active subscription and that it is `reallife_basic` before creating any host. If the default differs, the job stops with the company ID retained; inspect and correct that new test company's subscription before resuming. No second subscription is automatically added and nothing is canceled. The earlier explicit-product guidance still applies when supplying a numeric ID.

An optional fourth argument supplies the Iotum company display name, for example: `npm run iotum -- prepare your-test-email@example.com default unique-test-subdomain "Real Life Connect Test"`. This records the provider company name in the provisioning draft without changing the local personal-workspace name. Review the displayed draft before activation.

## Test the Iotum Host interface

After provisioning, use `npm run iotum -- test-role JOB_ID HOST` to change that test administrator to Host. The command first verifies its saved company ID, host ID and email, refuses reseller administrator roles, changes only `role`, and fetches again to verify. It changes no subscriptions, passwords or local SQLite administrator role. It is local operator tooling; no public role-change endpoint is added.

Use `npm run iotum -- test-role JOB_ID` for a read-only check. If necessary, the reseller operator can restore that same test account with `npm run iotum -- test-role JOB_ID COMPANY_ADMIN`. Sign out and sign back into the test portal after changing the role. Verify that organization/billing administration is unavailable, while meeting scheduling, starting and joining work. An API role check alone cannot prove the visible UI or authorization behavior. If Iotum rejects removal of the last company administrator, stop and record that result; do not create extra accounts automatically.


## Website login and subscriber dashboard

Schema version 6 preserves existing users, password hashes, catalog edits and provisioning IDs. It adds organization memberships, sessions, rate-limit records and shared-room assignments. Existing users receive the same local admin/member role in their current workspace. Provisioned test companies with an explicit display name become named organization workspaces. Ordinary individual signups retain personal workspaces. One person can have several membership rows; the dashboard validates the selected workspace on every request and offers a selector when more than one exists. Membership invitation/editing tools are future work.

Sign In appears in the website header. Use the email and password from the original WEBSITE signup, not a later Iotum password reset. Website password reset is not implemented yet. Unknown local users can use the separate Iotum sign-in link. Pending-payment users may sign in to review setup without obtaining a paid account. Suspended users cannot sign in. Successful operator tests continue to display pending payment locally with a separate provisioned-test label.

Sessions use a random token in an HttpOnly, SameSite=Strict cookie; only its SHA-256 hash is persisted. Sessions expire after eight hours or thirty minutes idle. Signing in rotates the session and signing out invalidates it server-side. Secure cookies are enabled in Codespaces and NODE_ENV=production; production must use HTTPS. Mutations require JSON plus a custom request header and reject cross-site fetch metadata. Login attempts and concurrent password verifications are bounded. Sessions and attempted-login records remain private in SQLite backups.

Dashboard routes are authenticated: `/api/session`, `/api/dashboard` and `/api/workspaces/:id/admin`. Organization admin access is checked server-side against memberships. Returned data includes no password hashes, session tokens, reseller API credentials or wholesale prices. My Meetings links an already provisioned test host to the existing Iotum login and attendee meeting link; it does not provide SSO or fetch live meetings/recordings. Shared Rooms returns only rooms assigned to the signed-in member in the selected workspace. No sample rooms are seeded and no booking/launch is enabled. The admin view lists current organization members and rooms; adding paid users/rooms, subscription changes, assignments and calendar reservations are not yet implemented. Cross-workspace access is denied even if someone supplies another workspace ID directly.

Future operator provisioning now creates and verifies Iotum `HOST` accounts. Local organization administrators keep their SQLite membership role. Existing provider roles are not changed by this update, including the test account you already changed manually. Normal customer activation must eventually use the paid plan selection rather than rely on the operator test's reseller-default option.

After pulling, back up the existing SQLite database with `npm run backup`, restart the backend, and refresh the frontend. No new dependency installation is required. The first updated backend start applies the migration; old sessions do not exist and all users must sign in. Use the existing Iotum test signup to verify a personal meeting link, local organization administrator view and empty assigned-room list.

Security reference: OWASP Session Management and CSRF Prevention Cheat Sheets, https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html and https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html.


## Host-specific meeting sign-on

Open My Meetings now initiates SSO into the host linked to the signed-in website user and selected workspace. It no longer navigates straight to the generic login page. This uses the documented browser GET redirect to the company's `/auth` endpoint, landing at `/conf/meetings/upcoming`: https://github.com/iotum/community/wiki/Single-Sign-On, section 10.1. No iframe/embedded SDK is used.

Schema version 7 adds `meeting_handoffs`. The authenticated, CSRF-protected `POST /api/workspaces/:id/meeting-access` creates an opaque local ticket, bound to that user's session, workspace and provisioning record. Only the ticket hash is stored. It is valid for 60 seconds, usable once and rate-limited. Logout deletes the local ticket with the session. Existing users, catalog edits and provider IDs remain intact.

The launch endpoint rechecks membership and mapped account ownership, then fetches the host over the backend API. Host ID, company ID, email and HOST role must match before sign-on. The company subdomain and fresh meeting origin must agree. The browser receives an empty, no-store 303 response to the company's HTTPS `/auth` endpoint with a fixed relative dashboard destination. The reseller API token and API auth token never leave the server. The provider-issued host credential is briefly present in the provider URL, as required by its documented GET flow, and may be retained by browser history or provider-side request logs. Do not copy, share or log that URL. Host credentials are not returned in dashboard JSON, stored in SQLite or printed by this application. Headers disable caching and referrer transmission. The provider-issued host credential is not claimed to be single-use: the local handoff ticket is single-use. Credential lifetime is controlled by the provider.

The launch operation authenticates/fetches and signs in; it does not create hosts or subscriptions, change roles, collect payments or send invitations. Failure messages use Real Life Connect wording without exposing provider responses. Existing manually demoted test hosts remain HOST. Accounts missing mappings, suspended users, expired sessions, foreign workspaces, unexpected identities and non-HOST provider roles cannot obtain a handoff.

The frontend opens a new tab on the user gesture, then navigates it to the local handoff; if new tabs are blocked it continues in the current tab. Browser GET acceptance and replacement of a previously remembered provider session still require a live Codespaces test with the existing test user; no provider credential is available in the development workspace. Sign out of the website invalidates local access; it does not yet implement sign-out of an already open meeting-platform session. Each Open My Meetings click performs a new host-specific sign-on. No browser/remote session was accessed by the implementation tests.

After pulling, take the usual SQLite backup and restart the backend (its Codespaces environment must contain IOTUM_API_TOKEN), then refresh the website and sign in. Click Open My Meetings and verify the account displayed is the expected test host. Report only visible text/errors, never a credential URL. No production deployment or live provisioning is part of this update.

Transport update: the live browser form POST reached the company `/auth` endpoint but returned HTTP 422. Its exact rejection reason has not been established. The handoff now uses the documented GET option; the same session, ownership, host-role and company checks remain. Live acceptance must be retested in Codespaces. No database migration or password change is needed for this transport update.
