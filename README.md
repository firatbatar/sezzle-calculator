# Sezzle Calculator

A calculator split across two services: a Next.js/TypeScript frontend that builds and validates the expression, and a Go backend that evaluates it. The frontend never computes a result itself — it assembles an expression string, checks that the string is well formed enough to be worth sending, and posts it to a single `/evaluate` endpoint.

The frontend is complete. **The backend has not been written yet**, so every backend section below is a marked TODO. Nothing in this README describes backend behaviour that does not exist.

## Repository layout

```text
.
├── frontend/              Next.js 16, React 19, TypeScript, Tailwind CSS v4
│   ├── src/app/           App Router shell: layout, page, global styles
│   ├── src/components/    Calculator UI and the input rules, plus their tests
│   ├── src/config/        Client configuration read from environment variables
│   ├── src/lib/           HTTP client for the evaluate endpoint, plus its tests
│   ├── vitest.config.mts  Test and coverage configuration
│   └── package.json       Scripts and dependencies
└── backend/               TODO: Go service. Not present in the repository yet.
```

## Prerequisites

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | 22.12 or newer | Not declared by the project; this is the floor imposed by the installed toolchain — `next` requires `>=20.9.0`, `vitest` requires `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| pnpm | 11.0.9 | `packageManager` field in `frontend/package.json` || Go | TODO | No `go.mod` in the repository, so no version can be stated |

## Quick start

TODO: there is no `docker-compose.yml` in the repository, so there is no single-command path yet. The manual path is:

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The calculator is then at <http://localhost:3000>. It renders, accepts input and validates expressions without a backend, but pressing `=` will report `Cannot reach server` until the backend exists and `NEXT_PUBLIC_CALCULATOR_API_URL` points at it.

## Running the frontend

All commands run from `frontend/`.

```bash
pnpm install       # install dependencies
pnpm dev           # development server on http://localhost:3000
pnpm build         # production build (also type-checks)
pnpm start         # serve the production build on http://localhost:3000
pnpm lint          # ESLint
```

Neither `dev` nor `start` passes a port, so both use the Next.js default of 3000. Override with `pnpm dev --port 4000`.

### Environment variables

All four are read in `src/config/calculator.ts`. Each has a fallback, so the app runs with none of them set.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CALCULATOR_API_URL` | `""` | Base URL of the backend. Empty means requests go to the frontend's own origin. |
| `NEXT_PUBLIC_CALCULATOR_EVALUATE_ENDPOINT` | `/evaluate` | Path appended to the base URL. |
| `NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS` | `10000` | Request timeout. Values that are not positive integers fall back to the default. |
| `NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS` | `2000` | How long an error stays on the screen before the expression returns. |

Example `frontend/.env.local`:

```bash
NEXT_PUBLIC_CALCULATOR_API_URL=http://localhost:8000
NEXT_PUBLIC_CALCULATOR_EVALUATE_ENDPOINT=/evaluate
NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS=10000
NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS=2000
```

The port above is a placeholder; the backend's port is not yet decided. `NEXT_PUBLIC_*` variables are inlined at build time, so restart `pnpm dev`, or rebuild, after changing them.

## Running the backend

TODO 

### Prerequisites

TODO 

### Install

TODO

### Run

TODO

### Configuration

TODO

### Tests

TODO

## API reference

TODO

**Request** — `POST` to `NEXT_PUBLIC_CALCULATOR_API_URL` + `NEXT_PUBLIC_CALCULATOR_EVALUATE_ENDPOINT`, with `Content-Type: application/json`:

```bash
curl -X POST http://localhost:8080/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"expression":"12 + 3 * (4 - 1)"}'
```

**Success** — any 2xx, with the result in `value`:

```json
{ "value": 21, "msg": null }
```

The client accepts a finite number, or a non-empty string that parses as a finite number (`{"value":"3.14"}`), which leaves room for the backend to serialise decimals as strings. A 2xx whose `value` is null, missing, a non-numeric string, a boolean, an object, or whose body is not JSON is treated as a failure and shown as `Invalid response from server`.

**Error** — any non-2xx, with a human-readable reason in `msg`:

```json
{ "value": null, "msg": "division by zero" }
```

`msg` is displayed verbatim. If it is absent, blank or not a string, the client shows `Server error (<status>)` instead.

### Expression format the client emits

Verifiable from the button definitions in `src/components/CalculatorBody.tsx`. The parser must accept:

- digits and `.`
- binary operators with a space either side: `" + "`, `" - "`, `" * "`, `" / "`, `" % "`
- `^` with no surrounding spaces, for example `2^3`
- `sqrt(` as a function-style opening parenthesis, for example `sqrt(16)`
- parentheses, including implicit multiplication the UI inserts as `" * "`, for example `(2) * 3`

Examples the UI can produce: `12 + 3 * (4 - 1)`, `sqrt(169) - 4`, `2^10`, `0.1 + 0.2`.

## Testing

From `frontend/`:

```bash
pnpm test           # run once
pnpm test:watch     # watch mode
pnpm test:coverage  # run once with coverage
```

The HTML coverage report is written to `frontend/coverage/index.html`; `coverage/` is git-ignored.

56 tests across three files: 26 for the input rules, 9 driving the rendered calculator, and 21 for the API client.

```text
 Test Files  3 passed (3)
      Tests  56 passed (56)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   99.45 |    91.78 |      96 |    99.4 |
 components        |   99.35 |     91.3 |   95.45 |   99.29 |
  ...torScreen.tsx |      50 |        0 |       0 |      50 | 13
 config            |     100 |       75 |     100 |     100 |
  calculator.ts    |     100 |       75 |     100 |     100 | 3
-------------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 99.45% ( 181/182 )
Branches     : 91.78% ( 134/146 )
Functions    : 96% ( 24/25 )
Lines        : 99.4% ( 166/167 )
================================================================================
```

The text reporter prints only files with uncovered lines. Per file, from the same run:

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `components/CalculatorBody.tsx` | 100% | 100% | 100% | 100% |
| `components/CalculatorButton.tsx` | 100% | 100% | 100% | 100% |
| `components/CalculatorScreen.tsx` | 50% | 0% | 0% | 50% |
| `components/icons.tsx` | 100% | 100% | 100% | 100% |
| `config/calculator.ts` | 100% | 75% | 100% | 100% |
| `lib/calculatorApi.ts` | 100% | 100% | 100% | 100% |

### Strategy

The input rules are the part most likely to be wrong, so `applyPress`, `validateExpression` and `PressType` are exported from `CalculatorBody.tsx` and tested directly as pure functions. Each case folds a sequence of button presses and asserts on the resulting string, so the tests read as button sequences rather than as data structures. Both functions reach full branch coverage.

Everything that depends on React state — continuing from a result, the error message and its timer, the single in-flight request guard, and delete — is tested through the rendered component with the API client mocked, driven by `@testing-library/user-event`. The API client itself is tested against a stubbed `fetch` returning real `Response` objects, so `json()` rejects authentically on a body that is not JSON.

The App Router shell, `src/app/layout.tsx` and `src/app/page.tsx`, is excluded from coverage in `vitest.config.mts`. Both files are static composition — fonts, metadata and a single element — with no branching, so rendering them would exercise the framework rather than this project.

`CalculatorScreen.tsx` sits at 50% because the component tests replace it with a stub that records the props it receives. That is what makes assertions about the invalid-press counter possible, since the real screen only expresses that counter as a remount of an animated element. Its rendering is presentational and is the one deliberate gap. The remaining branch in `config/calculator.ts` is the path where an environment variable is set to a valid value; the suite runs with those variables unset.

Expression semantics are deliberately not tested here: precedence, `%`, `^`, `sqrt`, division by zero and numeric precision belong to the backend, and the frontend asserts only that it sends a well-formed string and handles each response shape.

## Design decisions and assumptions

Frontend only in this pass. Backend decisions will be added when it is written.

**Next.js rather than bare React.** The brief specified React; Next.js is React plus the toolchain this project would otherwise have to assemble by hand — a dev server, a production build that type-checks, `next/font` for self-hosted fonts, and build-time handling of `NEXT_PUBLIC_*` configuration. The app is a single client component, so the framework adds no runtime complexity: there is no server-side data fetching and no route beyond `/`.

**Evaluation belongs to the backend.** The frontend builds a string and posts it; it never parses or computes. The validation it does perform — balanced parentheses, and an expression that ends in something that can legally end one — exists to give immediate feedback and to avoid pointless round trips. It is not an authority. The API can be called directly, so the backend must re-validate and reject anything malformed on its own terms.

**Presses are a typed stack, not a string.** Input is held as `Press[]`, each with a `value` and a `PressType`, and the display string is the concatenation of the values. This is what makes the rest tractable: delete removes one press unit rather than one character, so `sqrt(` and `" + "` disappear whole; validation inspects the type of the last press instead of pattern-matching text; and each rule can ask what kind of token preceded it.

**Input rules**, all implemented in `applyPress`, and worth stating because a reviewer would otherwise have to infer them:

- Implicit multiplication is inserted as `" * "` after a closing parenthesis and before an opening one: `(2)` then `3` gives `(2) * 3`, and `2` then `(` gives `2 * (`.
- The initial `0` is replaced by the first digit, `(`, `sqrt(` or `.` pressed.
- A lone zero is replaced rather than appended, so `5 + 0` then `7` is `5 + 7`, while `10` then `7` is `107`.
- A number takes at most one decimal point, though a later number may have its own.
- An operator pressed after another operator is ignored, not substituted; the same applies directly after `(` and on an empty expression.
- `sqrt(` opens a parenthesis and counts as an opener everywhere parentheses are balanced, including validation.
- `)` is ignored when nothing is open, and directly after `(` or an operator, so `()` cannot be produced.
- After a result, an operator continues from it, and a negative result is wrapped first: `-8` then `*` gives `(-8) * `. Any other press starts a fresh expression, and `sqrt(` deliberately starts fresh rather than wrapping the result.

**Error and timeout handling** live in `src/lib/calculatorApi.ts`, which never throws and always resolves to `{ ok, value }`. Requests are aborted via `AbortController` after `NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS`, 10 seconds by default. Failures are distinguished for the user: `Request timed out`, `Cannot reach server`, the backend's own `msg`, `Server error (<status>)`, and `Invalid response from server`. That last one matters — a 2xx whose body is malformed is treated as a failure rather than displayed, because stringifying it unguarded would put text such as `undefined` on the screen where a result belongs, and the user could then keep calculating from it. Errors replace the expression on screen for `NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS`, 2 seconds by default, then the expression returns; any press clears the error immediately and cancels that timer.

**One request at a time.** An in-flight request is tracked in a ref rather than state, so every handler can check it synchronously and ignore the press. While a request is in flight, digits, all-clear, delete and a second `=` all do nothing, and only one request is ever sent. A separate state flag dims the screen so the wait is visible.

**Accessibility and responsiveness.** The two icon-only buttons carry `aria-label`s, `Delete` and `Square root`, so their accessible names survive the switch from text to icons; the icons themselves and the decorative cursor are `aria-hidden`. Buttons have `focus-visible` outlines, and the expression line takes keyboard focus when it overflows so it can be scrolled. Animation respects `prefers-reduced-motion`: the shake on an invalid press becomes a colour flash, the cursor stops blinking and the press animation is dropped. Tap targets are 64px tall, 72px from the `sm` breakpoint. Long expressions scroll horizontally, anchored to the right so the newest input stays visible, rather than overflowing the screen.

## AI prompts

The prompts used while building this project are recorded in [PROMPTS.md](PROMPTS.md).
