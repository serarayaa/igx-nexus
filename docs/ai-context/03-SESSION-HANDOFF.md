# IGX NEXUS — Session Handoff

## Repository state

- Baseline verified: main@e04c4025dc3764bc668a6155df883e275c0519f6, merge of PR #136. main was updated fast-forward from origin/main with a clean tree before creating this branch.
- Branch: feature/v03-008-cross-surface-state-navigation. V03-008 proposed in Draft PR #137 (https://github.com/serarayaa/igx-nexus/pull/137); not merged, not closed, human checkpoint pending (§33 user request).
- V03-001/002 human conditions remain. B approved design direction, not final production SVG; A technical fallback only if B fails small-size tests; C rejected/historical. No branding assets changed.
- V03-003 and V03-005 NOT STARTED. V03-007 remains Graph/Map inside V03-005, never an independent surface/store. V02-023 separate and externally blocked; v0.2/hotfixes not reopened.

## Delivered foundation

Read docs/product/v0.3-navigation-state-contract.md for baseline audit, ownership matrix, canonical URL examples, precedence, history policies, journey diagram, graph scope/selection rules, return behavior, invalid/stale handling, a11y/responsive/performance and migration.

Typed InvestigationState/parser/serializer/normalize/helpers reuse existing ExplorerQuery and graph enums. URL is durable owner; native history with useSyncExternalStore subscribes to hashchange/popstate and explicit notification of push/replace. No dependency/router migration or backend/provider changes.

Representative production adapter: #assets query/search/facets/sort/page/size persist through refresh; Overview CTA transports selected classified domain; asset links and all four Asset360 sections preserve a bounded validated return hash. Selection, graph root and DOM focus are different concepts. Focus restored to visible identity link or result summary, not stolen by query updates. Stale page clamps via replace; stale facets remain visible and produce no matches.

Table↔Graph context contract is exercised by a test-only semantic harness, not a final Workspace renderer. New Graph URLs explicitly display inventory fallback and preserve requested view/context. Legacy #assets/:id/relations renderer is unchanged and still has its own selection reset behavior; migrate it only in V03-005 under the shared contract. Specialized views/QR/label adapters are later incremental work. No fake Live data or new sources.

## Validation observed locally

- UI/types prerequisite builds PASS; web build and typecheck PASS; diff formatting reviewed.
- New model contract 13 tests + existing navigation 10 + canonical HTTP round-trip 2: 25/25 PASS in isolated run.
- Affected production browser journeys + initial new harness: 34/34 PASS across five files after focus fixes. Final expanded navigation harness: 7/7 PASS, including stale page/facet and Live snapshot fail-closed under URL mode input.
- Physical refresh/deep-link tests: 2/2 PASS (real Chromium reload, Explorer/Asset360 return, graph fallback and stale facet); dedicated npm script and CI step added with existing Playwright dependency.
- Full local Web execution before the two additional tests: 354/356 PASS, two existing environment timing failures (canonical HTTP cold start 5s, Lifecycle axe/reflow 30s). Isolated reruns: HTTP 2/2 PASS and Lifecycle 6/6 PASS with original limits. Do not claim the full local run passed; no tests/timeouts weakened. Final CI on PR HEAD is the regression gate, recorded in PR body.
- Generated CSS build artifacts were restored to baseline; tokens/styles/branding/shell unchanged. No new dependencies, providers, contracts in packages/types, tenant operations, intelligence/automation or infrastructure.

## Remote validation evidence

Implementation commit 21480ce6c904639051751b9f58a38c627acbc3cb: CI SUCCESS in https://github.com/serarayaa/igx-nexus/actions/runs/37482463481. Web 358/358, Storybook 54/54, foundation 4/4, physical reload 2/2 and readiness 1/1 PASS, plus contracts/API and existing production QA gates. This resolves the complete regression gate on Linux with unchanged timing limits. The final PR HEAD checks and SHA are recorded in PR #137 body after the documentation handoff commit; do not conflate the above implementation run with a later SHA.

## Human checkpoint / next permitted step

Proposed recommendation **GO WITH CONDITIONS** after green CI: review ownership matrix, URL examples, navigation diagram, Table/Graph scope/availability, Asset360 return, Back/Forward, stale/invalid scenarios, tests and migration impacts in the contract. User approval cannot be inferred from passing tests. Keep PR Draft; do not merge automatically. Sergio merges manually after review.

Remaining conditions: legacy graph adapter migration and per-surface accessibility/performance review before final Workspace; real Live unverified; no absolute WCAG certification. This ticket does not authorize starting V03-003/V03-005. Preserve mark B optical refinement requirement before productive branding.
