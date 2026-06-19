# Arbiter — assumptions & filled defaults

Every gap the brief left open, and what I defaulted it to while authoring the
`.plain` specs. Change any of these by editing the named spec line and
re-rendering — never hand-edit generated code.

## Module / project structure
- **Two root modules in a requires-chain**, both TypeScript/Node/Vitest:
  - `arbiter-core.plain` — pure deterministic logic, built first, imports `node-testing-base`.
  - `arbiter-app.plain` — `requires: arbiter-core`, imports `typescript-react-app-template`.
- **`typescript-react-app-template` was created locally** under `template/` rather than relying on an
  unverifiable bundled standard-library template of that name. It imports a shared `node-testing-base`
  template. This honours the brief's "imports the typescript-react-app-template" literally while keeping
  the project self-contained and guaranteeing the import resolves (local `template/` wins in lookup order).
- **`template/node-testing-base.plain`** added (not in the brief) to hold the TS + Vitest reqs and to link
  the two Node test scripts from exactly one place. Both root modules import it, satisfying the
  "each linked resource referenced from exactly one place" rule for the scripts.

## Authoring method
- Specs were authored directly (following the loaded `.plain` rules) rather than invoking each micro-skill
  (`add-concept`, `add-functional-spec`, `analyze-if-func-spec-too-complex`, …) per item, because the run is
  fully autonomous and those skills/`--dry-run` would invoke the codeplain API, which the brief said not to run.
- **Complexity ceiling (200 LOC) was self-assessed**, not machine-checked. Large features were pre-split into
  multiple specs (see "Specs split for complexity" below) to stay well under the ceiling.

## Testing
- **No `prepare_environment` script.** Conformance uses the **install-inline** variant. Justified by the
  skill guidance (install-inline is correct when the per-module spec count N is small). Trade-off: `npm ci`
  runs once per previous-spec invocation per render. If render time becomes a problem, add
  `prepare_environment_node.sh` and switch the conformance script to the activate-only variant.
- **Shell flavour: Bash `.sh`** (host is macOS/darwin). No PowerShell variants generated.
- **`<lang>` tag for working folders is `node`** for both modules (both are Node/Vitest).
- Conformance script runs Vitest against the external tests folder via
  `npx vitest run --root <staged build> <tests path>`. Module resolution between the conformance tests and
  the staged build is the one area most likely to need renderer iteration; flagged as a known risk.

## Auction mechanism — concrete numbers chosen to pin the maths
The brief gave acceptance-test *seeds*; I invented three internally-consistent scenarios so conformance
tests have exact numbers. All money is whole-pound integers (no floats) for exact maths.

- **priceAtDropOut** is defined as the standing bid the agent **declined to beat** at the moment it left
  (the current highest standing bid), so FairPrice ≈ second-highest valuation as intended.
- **Uncontested rule:** a slot only one agent ever bid on clears at `basePrice`, regardless of how high that
  agent bid.
- **Opening bid is never a concession error;** only a *raise* made while already the sole active bidder is
  flagged "overbid-while-uncontested".

Scenarios (slot basePrice 100, bidIncrement 10 unless noted):
- **S1 (overpay):** A(budget 200, val 180), B(budget 150, val 130). Events: A110, B120, A130, B drops@130,
  A140. → winner A, clearingPrice 140, FairPrice 130, overpayment 10, A surplus 40, A concession
  "overbid-while-uncontested" (130→140).
- **S2 (premature drop):** A(budget 300, val 200), C(budget 300, val 190). Events: A110, C120, A130,
  C drops@130. → winner A, clearingPrice 130, FairPrice 130, overpayment 0, A surplus 70, C leftOnTable 60,
  C concession "premature-drop".
- **S3 (uncontested):** A(budget 300, val 150), single bid A100. → winner A, clearingPrice 100 (=basePrice),
  FairPrice 100, overpayment 0, A surplus 50.
- **Over-budget validation:** agent budget 120 bids 130 on a basePrice-100 slot → `:AuctionValidator:`
  rejects, naming the agent, amount 130, budget 120.

## App defaults
- **4 advertiser agents** by default (brief default).
- **~6 hero London slots** as the demo target (acceptance test "6 slots → 6 nodes"); more if Overpass returns
  them and perf holds.
- **Overpass endpoint** default `https://overpass-api.de/api/interpreter` (public, no key), overridable by env.
  Treated as a runtime config value, not an external doc reference.
- **London bbox:** S 51.28, W -0.51, N 51.70, E 0.33.
- **Inventory cache path:** `public/cache/london_inventory.json`. First fetch live, then cache.
- **PricingModel formula (transparent, documented, not a market rate):**
  `basePrice = 50 + 25 * faceAreaM2`, rounded; default faceArea 12 m² when unknown
  (→ basePrice 350); `bidIncrement = round(10% of basePrice)`, floor 5 (→ 35 for a 350 base).
- **Claude model** default `claude-sonnet-4-6` (chosen for latency/cost across many per-round calls),
  overridable by env; API key from env `ANTHROPIC_API_KEY`. One call per agent per decision.
- **Round streaming:** WebSocket primary, SSE fallback (brief).
- **Agent privacy:** each agent's prompt contains only its own budget + valuation + goal; private valuations
  feed `:Referee:` only, never another agent's prompt and never any public auction record.
- **Testability of live agents:** `:ArenaOrchestrator:` depends on the `:AgentRuntime:` decision contract,
  not on Claude directly, so tests inject a deterministic bidder. Production wires the Claude-backed runtime.
  This keeps "agents are live, no canned auctions" true for the product while keeping tests deterministic.
  Core maths is tested with explicit constructed `:AuctionLog:` inputs — those are test inputs, not a
  shipped canned auction.

## Specs split for complexity (kept under the 200-LOC ceiling)
- **arbiter-core:** clearing split into single-slot (FS) + all-slots (FS); referee split into
  FairPrice+overpayment / surplus+leftOnTable / concessionErrors+scorecard-assembly.
- **arbiter-app:** InventorySource split into fetch+normalise / caching; AgentRuntime split into
  decision-contract+budget-guard / Claude-backed bidder; ArenaOrchestrator split into round-loop /
  final-scoring; LondonMapScene split into canvas+lights+resize+dpr / slot-nodes+glow; ScorecardPanel split
  into display / click-to-explain.

## Not run (per brief)
- `codeplain` / `plain2code` was **not** invoked — no render, and no `--dry-run` (it hits the codeplain API).
  The user will render themselves.

## Bounties targeted
- Codeplain (primary), BGA, Solvimon, Vercel. **Not** Sui, FLock, or Bilt.
