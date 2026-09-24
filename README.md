# Sezzle Calculator

A calculator split across two services: a Next.js/TypeScript frontend that builds and validates the expression, and a Go backend that evaluates it. The frontend never computes a result itself — it assembles an expression string, checks that the string is well formed enough to be worth sending, and posts it to a single `/evaluate` endpoint.

Both services are complete. Docker packaging is not done yet; the Quick start section marks where it will go.

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
└── backend/               Go, standard library only
    ├── cmd/server/        Entry point: reads the environment and starts the server
    ├── internal/          Packages that cannot be imported from outside the module
    │   ├── api/           HTTP layer: routing, JSON, middleware, status codes, plus tests
    │   └── calculator/    Tokeniser and evaluator, plus their tests
    ├── Makefile           Run, build, test and coverage targets
    └── go.mod             Module definition, with no dependencies
```

## Prerequisites

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | 22.12 or newer | Not declared by the project; this is the floor imposed by the installed toolchain — `next` requires `>=20.9.0`, `vitest` requires `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| pnpm | 11.0.9 | `packageManager` field in `frontend/package.json` |
| Go | 1.27.1 or newer | `go` directive in `backend/go.mod` |
| GNU Make | Not declared | Optional; `backend/Makefile` wraps the `go` commands and uses GNU `$(if)` |

## Quick start

TODO: there is no `docker-compose.yml` in the repository, so there is no single-command path yet. The manual path is:

```bash
cd backend
make run             # or: go run ./cmd/server
```

Then, in a second terminal:

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The calculator is then at <http://localhost:3000>. `.env.example` points `NEXT_PUBLIC_CALCULATOR_API_URL` at the backend's default of `http://localhost:8000`, and the backend's default `ALLOWED_ORIGIN` is the frontend's dev server, so neither side needs configuring. Without the backend, the frontend still renders, accepts input and validates expressions, but pressing `=` reports `Cannot reach server`.

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

Port 8000 is the backend's default; see [Running the backend](#running-the-backend). `NEXT_PUBLIC_*` variables are inlined at build time, so restart `pnpm dev`, or rebuild, after changing them.

## Running the backend

All commands run from `backend/`. The module has no dependencies, so there is nothing to install first.

```bash
make run             # server on http://localhost:8000
make build           # run check, then build bin/server.out
make test            # run all tests once
make test V=1        # verbose
make test COVER=1    # run once with per-package coverage
make cover           # run once with a coverage profile, then print the per-function summary
make cover-html      # as cover, then write the HTML report
make check           # gofmt -l, go vet, then the tests
make clean           # remove bin/, coverage.out and coverage.html
```

`make build` stops if `go vet` or a test fails. `gofmt -l` only lists unformatted files, so it reports formatting problems without stopping the build. Formatting in place has no make target; use `gofmt -w .` below.

Without make:

```bash
go run ./cmd/server                                     # server on http://localhost:8000
CGO_ENABLED=0 go build -o bin/server.out ./cmd/server   # build without the checks
go test -count=1 ./...                                  # run all tests once
go test -count=1 -cover ./...                           # run once with per-package coverage
go test -count=1 -coverprofile=coverage.out ./...       # run once with a coverage profile
go tool cover -func=coverage.out                        # per-function summary
go tool cover -html=coverage.out -o coverage.html       # HTML report
gofmt -l .                                              # list unformatted files
gofmt -w .                                              # format in place
go vet ./...                                            # static analysis
```

The server listens on port 8000 on all interfaces, which matches the example `frontend/.env.local` above.

### Environment variables

Both are read from the environment in `cmd/server/main.go`. An unset or empty variable falls back to its default.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Port to listen on. |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Value of `Access-Control-Allow-Origin` on every response: a single origin, not a list. The default is the frontend's dev server. |

```bash
PORT=9000 ALLOWED_ORIGIN=http://localhost:4000 make run
```

## API reference

Two endpoints, both returning JSON, at `http://localhost:8000` by default. Any other method on these paths gets `405` with an `Allow` header, and any other path gets `404`. Both come from the router as plain text, not the JSON envelope below. The CORS middleware answers `OPTIONS` on any path with `204`.

### `POST /evaluate`

**Request**, with `Content-Type: application/json`:

```json
{"expression": "12 + 3 * (4 - 1)"}
```

`expression` is a string of at most 256 bytes. Unknown fields are ignored, and a missing `expression` is treated as an empty one.

**Response**, one envelope for success and failure:

| Field | On success | On failure |
| --- | --- | --- |
| `value` | the result, as a JSON number | `null` |
| `msg` | `null` | the reason, as a string |

Both keys are always present, and exactly one of them is non-null. `msg` is written to be shown directly to an end user.

### `GET /healthz`

No request body. Returns `200` with `{"status":"ok"}`, outside the envelope.

### Examples

A successful evaluation, `200`:

```bash
curl -s -X POST http://localhost:8000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"expression":"12 + 3 * (4 - 1)"}'
```

```json
{"value":21,"msg":null}
```

Division by zero, `422`:

```bash
curl -s -X POST http://localhost:8000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"expression":"1 / 0"}'
```

```json
{"value":null,"msg":"division by zero"}
```

A syntax error, `400`:

```bash
curl -s -X POST http://localhost:8000/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"expression":"2 * * 3"}'
```

```json
{"value":null,"msg":"expression is not valid"}
```

The health check, `200`:

```bash
curl -s http://localhost:8000/healthz
```

```json
{"status":"ok"}
```

### Status codes

| Status | Condition | `msg` |
| --- | --- | --- |
| `200` | Evaluated | `null` |
| `400` | Body is empty, is not JSON, or `expression` is not a string | `request body is not valid JSON` |
| `400` | Expression is empty, whitespace only, or missing | `expression is empty` |
| `400` | A character other than digits, `.`, `+ - * / % ^ ( )`, `sqrt(`, spaces, tabs and newlines | `expression contains an invalid character` |
| `400` | Malformed, for example `2 * * 3`, `1 +`, `2(3)` or `1.2.3` | `expression is not valid` |
| `400` | Unbalanced parentheses, counting `sqrt(` as an opener | `parentheses are not balanced` |
| `413` | Expression longer than 256 bytes | `expression is too long` |
| `413` | Request body reaches the 4 KiB (4096-byte) read limit before the JSON ends | `expression is too long` |
| `422` | Division by zero | `division by zero` |
| `422` | Square root of a negative number | `square root of a negative number` |
| `422` | Infinite or NaN result, for example `10 ^ 400` or `0 ^ -1` | `result is not a finite number` |
| `500` | A calculator error with no mapping, or a response that fails to encode; neither can happen with the current calculator | `internal server error` |

### How the frontend reads responses

The client accepts a finite number, which is what the backend sends, or a non-empty string that parses as a finite number (`{"value":"3.14"}`). The string form is unused today; it would let the backend move to exact decimals serialised as strings without a client change. A 2xx whose `value` is null, missing, a non-numeric string, a boolean, an object, or whose body is not JSON is treated as a failure and shown as `Invalid response from server`.

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

### Frontend

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

#### Strategy

The input rules are the part most likely to be wrong, so `applyPress`, `validateExpression` and `PressType` are exported from `CalculatorBody.tsx` and tested directly as pure functions. Each case folds a sequence of button presses and asserts on the resulting string, so the tests read as button sequences rather than as data structures. Both functions reach full branch coverage.

Everything that depends on React state — continuing from a result, the error message and its timer, the single in-flight request guard, and delete — is tested through the rendered component with the API client mocked, driven by `@testing-library/user-event`. The API client itself is tested against a stubbed `fetch` returning real `Response` objects, so `json()` rejects authentically on a body that is not JSON.

The App Router shell, `src/app/layout.tsx` and `src/app/page.tsx`, is excluded from coverage in `vitest.config.mts`. Both files are static composition — fonts, metadata and a single element — with no branching, so rendering them would exercise the framework rather than this project.

`CalculatorScreen.tsx` sits at 50% because the component tests replace it with a stub that records the props it receives. That is what makes assertions about the invalid-press counter possible, since the real screen only expresses that counter as a remount of an animated element. Its rendering is presentational and is the one deliberate gap. The remaining branch in `config/calculator.ts` is the path where an environment variable is set to a valid value; the suite runs with those variables unset.

Expression semantics are deliberately not tested here: precedence, `%`, `^`, `sqrt`, division by zero and numeric precision belong to the backend, and the frontend asserts only that it sends a well-formed string and handles each response shape.

### Backend

From `backend/`:

```bash
make test            # run once
make test V=1        # verbose
make test COVER=1    # run once with per-package coverage
make cover           # write the profile to backend/coverage.out and print the per-function summary
make cover-html      # as cover, then write backend/coverage.html
```

Without make:

```bash
go test -count=1 ./...                               # run once
go test -count=1 -coverprofile=coverage.out ./...    # write the profile to backend/coverage.out
go tool cover -func=coverage.out                     # per-function summary
go tool cover -html=coverage.out                     # open the annotated source in the browser
```

`make cover-html` writes the report to `backend/coverage.html`, to open in any browser; `go tool cover -html` without `-o` opens it directly instead. Both files are git-ignored, and `make clean` removes them.

124 test cases across five files: 15 for the tokeniser, 64 for the evaluator and 45 for the HTTP layer. From `make cover`:

```text
go test -count=1 -coverprofile=coverage.out ./...
	github.com/firatbatar/sezzle-calculator/backend/cmd/server		coverage: 0.0% of statements
ok  	github.com/firatbatar/sezzle-calculator/backend/internal/api	0.006s	coverage: 88.5% of statements
ok  	github.com/firatbatar/sezzle-calculator/backend/internal/calculator	0.004s	coverage: 95.3% of statements
go tool cover -func=coverage.out
github.com/firatbatar/sezzle-calculator/backend/cmd/server/main.go:11:			main			0.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/handlers.go:13:		handleHealth		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/handlers.go:17:		handleEvaluate		86.4%
github.com/firatbatar/sezzle-calculator/backend/internal/api/handlers.go:48:		getHttpStatusFromErr	80.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/middleware.go:8:		cors			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/middleware.go:22:		logging			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/middleware.go:38:		WriteHeader		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/server.go:15:		NewServer		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/server.go:29:		ServeHTTP		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/server.go:33:		writeJSON		45.5%
github.com/firatbatar/sezzle-calculator/backend/internal/api/types.go:12:		success			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/api/types.go:16:		failure			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:11:		Evaluate		96.4%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:59:		pushNumber		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:69:		pushOpen		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:78:		pushOperator		92.3%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:103:	reduceOnce		88.9%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:132:	reduceParenthesis	88.9%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:164:	topOp			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:168:	popOp			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:174:	popNum			100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:180:	canPushOp		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:187:	applyOperation		93.8%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/eval.go:217:	getPrecedence		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/tokenizer.go:44:	tokenize		100.0%
github.com/firatbatar/sezzle-calculator/backend/internal/calculator/tokenizer.go:91:	getNumberLexeme		95.2%
total:											(statements)		87.2%
```

#### Strategy

The tokeniser and evaluator are pure functions, so they are tested directly with table-driven tests: each case is an input string and either an expected value or an expected sentinel error, matched with `errors.Is`. The evaluator's cases are grouped by rule — arithmetic, precedence and associativity, unary operators, `sqrt`, `%` and formatting — and each is named after the rule it checks, so a failure says what broke.

The HTTP layer is tested through `Server.ServeHTTP` with `httptest`, never by calling a handler directly, so every request goes through the real middleware chain and router, and routing, CORS, logging and error mapping are exercised together. Responses are decoded into a struct defined in the test rather than the production type, so a renamed JSON field fails the tests instead of passing silently. The logging test sends requests that end in `422`, `405` and `204`, each written by a different layer, to show that the logged status is the one actually sent.

Left uncovered on purpose:

- `main`, which reads two environment variables and calls `ListenAndServe`.
- The fallback in `writeJSON` for a response that fails to marshal, and the `500` branch in `handleEvaluate`. Every result is finite and every calculator error has a mapping, so neither can run.
- The log line for a failed write, which `httptest.ResponseRecorder` never produces.
- Defensive checks in the tokeniser and evaluator for states that the length limit and the push/reduce logic make impossible.

Covering these would mean adding injection points to production code only to reach lines that cannot run.

## Design decisions and assumptions

### Frontend

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

### Backend

**Standard library only.** There is no framework and there are no dependencies; `go.mod` has no `require` directives. Routing uses the Go 1.22+ `http.ServeMux`, where the method is part of the route pattern (`"POST /evaluate"`, `"GET /healthz"`). The router therefore answers a wrong method with `405` and a correct `Allow` header without extra code, which leaves nothing for a framework to add for two routes.

**Package layout.** The code is split into three packages:

- `cmd/server` is wiring: it reads the environment, builds the server and listens.
- `internal/calculator` is the domain. It turns a string into a number or an error, and imports only `errors`, `math`, `strconv` and `strings`, so it has no knowledge of HTTP.
- `internal/api` is the transport: routing, JSON, middleware, and the mapping from errors to status codes.

The compiler enforces `internal/`, so nothing outside the module can import either package.

**Sentinel errors carry the domain's failures across the boundary.** Each failure the calculator can report is an exported sentinel in `internal/calculator/errors.go`, and `getHttpStatusFromErr` in `internal/api/handlers.go` matches them with `errors.Is`. The calculator decides what went wrong, and the API layer decides what that means in HTTP:

- `400` is for input that cannot be parsed.
- `413` is for input over a size limit.
- `422` is for input that parses but has no finite answer.

The sentinel's text is the `msg` the user sees. An error without a mapping is logged and falls through to `500` rather than getting a wrong status.

**A two-stack evaluator rather than an AST.** The tokeniser makes one pass over the string. The evaluator then makes one left-to-right pass over the tokens with an operator stack and a number stack:

- Before an operator is pushed, any operator on the stack with higher or equal precedence is reduced first. For `^`, only a strictly higher one is reduced, which makes it right-associative.
- A closing parenthesis reduces back to its opener.

Precedence and associativity fall out of these push/reduce rules, and there is no tree to allocate and walk. A tree would earn its place if expressions were stored, printed or evaluated repeatedly; here each one is evaluated once and discarded.

The evaluator also tracks whether an operand or an operator comes next (`isExpectingOperator`). A `+` or `-` that arrives when an operand is expected — at the start, after `(` or after another operator — is pushed as unary; anywhere else it is binary. The same flag rejects two operands or two binary operators in a row.

`sqrt(` is one token that acts as an opening parenthesis: it is pushed like `(`. When its `)` arrives, the evaluator reduces back to it, pops it, and replaces the top number with its square root, rejecting a negative.

**Operator semantics**, stated because a reviewer would otherwise have to infer them:

- `^` is right-associative: `2 ^ 3 ^ 2` is `2 ^ 9`, which is `512`.
- Unary minus binds tighter than `*`, `/` and `%` but looser than `^`. So `-2 * 3` is `-6`, and `-2 ^ 2` is `-(2 ^ 2)`, which is `-4`, as in written mathematics. Unary plus is accepted and does nothing.
- `%` is a binary operator with the precedence of `*` and `/`, computing `left * right / 100`. `200 % 10` is `20`, so `X % Y` reads as Y percent of X. It is not postfix, so `50 %` is a syntax error.
- `sqrt` requires its parenthesis, with no space before it; `sqrt 16` and `sqrt (16)` are rejected as invalid characters.
- There is no implicit multiplication. `2(3)` is a syntax error; the frontend inserts ` * ` itself.
- A number is digits with at most one decimal point, which may lead or trail (`.5`, `5.`). There is no exponent notation, so `1e3` is rejected.
- Spaces, tabs and newlines between tokens are ignored.

**float64 throughout.** Numbers are parsed with `strconv.ParseFloat`, and every operation is IEEE 754 double arithmetic, so `0.1 + 0.2` returns `0.30000000000000004`. This was accepted for two reasons:

- The frontend reads the response with `response.json()` into a JavaScript number, which is the same double. A more exact type on the backend would be rounded on arrival unless it were sent as a string.
- `sqrt` and fractional powers have no exact decimal result anyway.

The alternative was `math/big`, returning `value` as a string, which the client already accepts. That would make `+ - * / %` exact, at the cost of a second number representation. NaN and infinite results are rejected with `422` rather than returned, because JSON cannot represent them and the user could not continue calculating from them.

**Input bounds.** The tokeniser rejects an expression over 256 bytes (`maxExpressionLength`), and the handler wraps the request body in `http.MaxBytesReader` at 4 KiB (`maxBodyBytes`). Every valid character is ASCII, so for a valid expression 256 bytes means 256 characters. Both limits return `413` with the same message, so a long expression is reported the same way whichever limit it hits. Evaluation is linear in the number of tokens, so together the limits bound the work any single request can cause. They are the deliberate substitute for rate limiting.

**Middleware: CORS and request logging only.**

- CORS sets `Access-Control-Allow-Origin` to the configured `ALLOWED_ORIGIN` on every response, and answers any `OPTIONS` request with `204` before routing.
- Logging writes one line per request to stdout: method, path, status and duration. It gets the status by wrapping the `ResponseWriter`, so it records what was actually sent.

Nothing else is added. The service is stateless, has a single endpoint, holds no user data and is not publicly deployed, so rate limiting, authentication, request IDs and tracing would add configuration without protecting anything. If it were deployed publicly, per-IP rate limiting with `golang.org/x/time/rate` would be the first addition.

**No graceful shutdown.** `main` calls `http.ListenAndServe` directly. There is no state to flush and nothing worth draining, since a request takes microseconds and holds nothing. Stopping the process mid-request costs the user at most one repeated press of `=`.

**Validation happens on both sides.** The frontend validates for immediate feedback. The backend validates everything again, because the API can be called directly, and the backend is the authority on what is valid.

## AI prompts

The prompts used while building this project are recorded in [PROMPTS.md](PROMPTS.md).
