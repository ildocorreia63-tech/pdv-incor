# PDV INCOR — connection validation

## Result

The frontend now refuses the old backend before loading application code. All existing generated-client imports resolve to an app-owned client that reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No generated files, environment files, migrations, database data, or RLS policies were modified.

Current Lovable build variables still refer to the previous Cloud connection. There is no agent tool available to replace these managed variables with an external connection. The owner must configure the intended values in the deployment/build environment; backend secrets alone do not configure Vite frontend variables. The project’s Cloud attachment is not removed by this change.

The requested external hostname returned NXDOMAIN (DNS status 3) from both Google and Cloudflare resolvers on 2026-11-01. Confirm the correct project address and its availability before configuring the deployment. The public key for that external project has not been supplied or validated. Never reuse the previous project's public key, or use a service-role key.

## Manual Auth configuration

Site URL:

`https://pdv-incor.lovable.app`

Allowed Redirect URLs:

- `https://pdv-incor.lovable.app/**`
- `https://id-preview--08f5952b-edb8-4fcf-ab08-17d61e809103.lovable.app/**`

These include `/`, `/auth`, and `/reset-password`. Application email links derive their return address from the current browser origin. External Auth settings could not be read or changed.

## Operator functions

The existing `create-operator` and `manage-operator` sources validate the token via Auth and require an owner membership for the submitted store. The frontend invokes these functions through the configured external client and never creates Auth users directly. No function was deployed to the old Cloud project. Confirm both functions are deployed in the external project with its own server-side secrets. Existing source removal revokes access before removing assignments and deactivating the operator; late cleanup failures are not transactional. Existing creation rollback relies on the schema's cascading user-role foreign key.

## Cash and team

Team reads existing `store_operators`, `store_shifts`, `store_shift_assignments`, membership counts and cash history using store-scoped cached queries. Owner-only routing is preserved. Removed operators remain visible in history. Errors display a retry action, not a misleading empty result or a request to reapply migrations.

Cash reads are scoped to the active store and signed-in operator; canceled sales are excluded. Read failures block cash operations rather than silently treating a failed query as a closed register. Closing requires a matching open row and confirms the update read-back. Existing cash RLS and unique-open-per-operator index were preserved. Report data still relies on existing RLS; live isolation tests were not possible against the unreachable external project.

## Remaining end-to-end verification

After the deployment variables and external hostname are corrected, sign in through the preview and verify: protected-route return, session after reload, logout, owner Team reads, operator create/reset/remove, and operator-specific cash open/close/read-back. Verify a second operator cannot read another operator's register and another store cannot read these records. No live authenticated checks, external RLS checks, operator modifications, or cash writes were performed in this session. Mock/unit tests are not a substitute for these checks.