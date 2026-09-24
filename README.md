# Sezzle Calculator

A calculator split across two services: a Next.js/TypeScript frontend that builds and validates an expression, and a Go backend that evaluates it. The frontend never computes a result; it posts the expression string to a single `/evaluate` endpoint.

**Contents:** [Setup and running](#setup-and-running) · [API](#api) · [Tests and coverage](#tests-and-coverage) · [Design decisions and assumptions](#design-decisions-and-assumptions) · [AI prompts](#ai-prompts)

## Setup and running

### With Docker

Requires Docker with the Compose plugin. From the repository root, the first command builds and starts the calculator at <http://localhost:3000> and the API at <http://localhost:8000>, and the second stops and removes them:

```bash
docker compose up --build
docker compose down
```

`NEXT_PUBLIC_CALCULATOR_API_URL` is a build argument of the frontend image (`frontend.build.args` in `docker-compose.yml`), not a runtime variable, because Next.js inlines `NEXT_PUBLIC_` values into the client bundle at build time. The browser sends the request, so the value must be reachable from the browser, not from inside the Docker network: `http://localhost:8000`, not `http://backend:8000`. If the backend is exposed on a different host or port, change that argument, and the backend's `ports` mapping if the port changes, then rebuild with `docker compose up --build`; the old URL stays in the image until it is rebuilt. If the frontend is served from a different origin, set the backend's `ALLOWED_ORIGIN` to match.

### Without Docker

| Tool | Version | Source |
| --- | --- | --- |
| Node.js | 22.12 or newer | Floor set by the toolchain: `next` requires `>=20.9.0`, `vitest` `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
| pnpm | 11.0.9 | `packageManager` in `frontend/package.json` |
| Go | 1.27.1 or newer | `go` directive in `backend/go.mod` |

```bash
cd backend && make run                                                  # terminal 1; without make: go run ./cmd/server
cd frontend && pnpm install && cp .env.example .env.local && pnpm dev   # terminal 2
```

Open <http://localhost:3000>. Neither side needs configuring: `.env.example` points the frontend at `http://localhost:8000`, and the backend's default `ALLOWED_ORIGIN` is `http://localhost:3000`. Without the backend the calculator still renders and validates input, but `=` reports `Cannot reach server`.

Frontend, from `frontend/`: `pnpm build` makes a type-checked production build and `pnpm start` serves it on port 3000, the Next.js default, as `pnpm dev` does; `pnpm lint` runs ESLint. Frontend variables are read in `src/config/calculator.ts` and inlined at build time, so restart `pnpm dev` or rebuild after changing them; every variable below has a default. Backend, from `backend/`, with no dependencies to install:

| Target | Effect |
| --- | --- |
| `make check` | `gofmt -l .` (lists unformatted files without failing), `go vet ./...`, then the tests |
| `make build` | `make check`, then `CGO_ENABLED=0 go build -o bin/server.out ./cmd/server` |
| `make clean` | Remove `bin/`, `coverage.out` and `coverage.html` |

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CALCULATOR_API_URL` | `""` | Backend base URL; empty means the frontend's own origin |
| `NEXT_PUBLIC_CALCULATOR_EVALUATE_ENDPOINT` | `/evaluate` | Path appended to the base URL |
| `NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS` | `10000` | Request timeout; a value that is not a positive integer falls back to the default |
| `NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS` | `2000` | How long an error stays on screen before the expression returns |
| `PORT` | `8000` | Backend port, on all interfaces |
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Backend's `Access-Control-Allow-Origin` on every response; a single origin, not a list |

## API

`POST /evaluate` takes `{"expression": "<string>"}`, with the expression at most 256 bytes; unknown fields are ignored and a missing `expression` counts as empty. Every response is `{"value": <number or null>, "msg": <string or null>}`, with exactly one of the two non-null, and `msg` is written to be shown to an end user. `GET /healthz` returns `{"status":"ok"}` outside that envelope. A wrong method gets `405` with an `Allow` header and an unknown path `404`, both as plain text from the router; `OPTIONS` on any path gets `204` from the CORS middleware.

```bash
curl -s -X POST http://localhost:8000/evaluate -H 'Content-Type: application/json' \
  -d '{"expression":"12 + 3 * (4 - 1)"}'   # 200
curl -s -X POST http://localhost:8000/evaluate -H 'Content-Type: application/json' \
  -d '{"expression":"1 / 0"}'              # 422
curl -s -X POST http://localhost:8000/evaluate -H 'Content-Type: application/json' \
  -d '{"expression":"2 * * 3"}'            # 400
curl -s http://localhost:8000/healthz      # 200
```

```json
{"value":21,"msg":null}
{"value":null,"msg":"division by zero"}
{"value":null,"msg":"expression is not valid"}
{"status":"ok"}
```

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

## Tests and coverage

| | Frontend, from `frontend/` | Backend, from `backend/` |
| --- | --- | --- |
| Tests | `pnpm test`, or `pnpm test:watch` to watch | `make test`, `make test V=1` for verbose, or `go test -count=1 ./...` |
| Coverage | `pnpm test:coverage`, with HTML in `frontend/coverage/index.html` | `make cover`; `make cover-html` writes `backend/coverage.html`; `make test COVER=1` or `go test -count=1 -cover ./...` per package |

Frontend: 56 tests across three files, 26 for the input rules, 9 driving the rendered calculator and 21 for the API client.

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

Backend: 124 test cases across five files, 15 for the tokeniser, 64 for the evaluator and 45 for the HTTP layer. From `make cover`:

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

Pure logic is tested directly: the frontend's `applyPress` and `validateExpression` as sequences of button presses, and the backend's tokeniser and evaluator as table-driven cases matched against values or sentinel errors with `errors.Is`. Stateful behaviour is tested through the rendered component with the API client mocked, the API client against a stubbed `fetch` returning real `Response` objects, and the HTTP layer through `Server.ServeHTTP` with `httptest`, so every request passes through the real middleware and router. The gaps are deliberate: `CalculatorScreen.tsx` is stubbed in the component tests so its props can be asserted on, the App Router shell is excluded as static composition, and `main` and the backend's fallbacks for failures the current calculator cannot produce are left unreached rather than adding injection points to production code.

## Design decisions and assumptions

### Architecture

**Next.js rather than bare React.** It supplies the dev server, type-checked production build and build-time configuration this project would otherwise assemble by hand, and as a single client component on one route it adds no runtime complexity.

**A standard-library backend in three packages.** `go.mod` has no dependencies, because the Go 1.22+ `http.ServeMux` routes on method and path (`"POST /evaluate"`) and answers a wrong method with `405` and an `Allow` header, which leaves nothing for a framework to add for two routes. `cmd/server` is wiring, `internal/calculator` turns a string into a number or an error with no knowledge of HTTP, and `internal/api` is the transport; the compiler stops anything outside the module importing either `internal/` package.

**Sentinel errors carry failures across that boundary.** Each calculator failure is an exported sentinel in `internal/calculator/errors.go`, and `getHttpStatusFromErr` maps it with `errors.Is` to `400` for input that cannot be parsed, `413` for input over a size limit, or `422` for input that parses but has no finite answer, so the calculator decides what went wrong and the API decides what that means in HTTP. The sentinel's text is the `msg`, and an unmapped error is logged and becomes `500` rather than a wrong status.

**The backend is the authority.** The frontend checks only balanced parentheses and a legal final token, for immediate feedback, and the backend validates everything again because the API can be called directly.

### Evaluation approach

**Input is a typed stack of presses.** The frontend holds `Press[]`, each a `value` and a `PressType`, and shows their concatenation, so delete removes a whole unit such as `sqrt(` or `" + "` and each rule can ask what kind of press came before. Under the rules in `applyPress`, implicit multiplication is inserted as `" * "` next to parentheses (`(2)` then `3` gives `(2) * 3`); the initial `0` is replaced by the first digit, `(` or `sqrt(`, and a lone `.` becomes `0.`; a lone zero is replaced rather than appended, so `5 + 0` then `7` gives `5 + 7`; a number takes one decimal point; an operator after another operator, after `(` or on an empty expression is ignored rather than substituted; and `)` is ignored when nothing is open or directly after `(` or an operator, so `()` cannot be produced. After a result, an operator continues from it, wrapping a negative (`-8` then `*` gives `(-8) * `), while a digit, `.`, `(` or `sqrt(` starts afresh.

**A two-stack evaluator rather than an AST.** One left-to-right pass over the tokens with an operator stack and a number stack reduces any stacked operator of higher or equal precedence before pushing (strictly higher for `^`, making it right-associative) and reduces back to the opener on `)`; each expression is evaluated once and discarded, so a tree would be built only to be walked once. A flag, `isExpectingOperator`, makes `+` or `-` unary where an operand is expected and rejects two operands or two binary operators in a row, and `sqrt(` is pushed like `(`, replacing the top number with its square root when its `)` arrives.

### Operator and numeric semantics

**Operators.** `^` is right-associative, so `2 ^ 3 ^ 2` is `512`. Unary minus binds tighter than `*`, `/` and `%` but looser than `^`, as in written mathematics, so `-2 * 3` is `-6` and `-2 ^ 2` is `-4`; unary plus is accepted and does nothing. `%` is binary, at the precedence of `*` and `/`, and computes `left * right / 100`, so `200 % 10` is `20` and `X % Y` reads as Y percent of X; it is not postfix, so `50 %` is rejected.

**Syntax.** `sqrt` requires its parenthesis with no space before it, so `sqrt (16)` is rejected, and there is no implicit multiplication, so `2(3)` is rejected and the frontend inserts `" * "` itself. A number is digits with at most one decimal point, which may lead or trail (`.5`, `5.`), and has no exponent notation, so `1e3` is rejected. Spaces, tabs and newlines between tokens are ignored.

**`float64` throughout.** Numbers are parsed with `strconv.ParseFloat` and every operation is IEEE 754 double arithmetic, so `0.1 + 0.2` returns `0.30000000000000004`; this is accepted because the frontend reads `value` into a JavaScript number, the same double, and `sqrt` and fractional powers have no exact decimal result anyway. The alternative, `math/big` with `value` sent as a string the client already accepts, would make `+ - * / %` exact at the cost of a second number representation. NaN and infinite results are rejected with `422` because JSON cannot represent them and the user could not continue calculating from them.

### Operational choices

**Input bounds instead of rate limiting.** The tokeniser rejects expressions over 256 bytes and the handler caps the body at 4 KiB with `http.MaxBytesReader`, both with the same `413` message; evaluation is linear in the number of tokens, so together they bound the work any request can cause.

**Minimal middleware, no graceful shutdown.** CORS sets `Access-Control-Allow-Origin` to `ALLOWED_ORIGIN` on every response and answers `OPTIONS` with `204` before routing, and logging writes method, path, status and duration to stdout from a wrapped `ResponseWriter`, so it records the status actually sent. The service is stateless, holds no user data and is not publicly deployed, so authentication, request IDs and tracing would protect nothing, and per-IP rate limiting with `golang.org/x/time/rate` would be the first addition if it were. `main` calls `http.ListenAndServe` directly, because there is no state to flush and a request holds nothing worth draining.

**The client never throws.** `src/lib/calculatorApi.ts` always resolves to `{ ok, value }`, aborts via an `AbortController` after `NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS`, and reports `Request timed out`, `Cannot reach server`, the backend's `msg`, `Server error (<status>)` when that `msg` is missing, blank or not a string, or `Invalid response from server`. It accepts `value` as a finite number or a numeric string, so the backend could move to exact decimals serialised as strings without a client change, and treats any other 2xx body as a failure rather than rendering it, so the user cannot carry on calculating from `undefined`. An error replaces the expression for `NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS` and any press clears it at once. Only one request is in flight at a time: a ref checked synchronously by every handler makes presses during a request do nothing, and the screen dims so the wait is visible.

**Accessibility and layout.** The icon-only buttons carry `aria-label`s, `Delete` and `Square root`, so their accessible names survive the switch from text to icons, and buttons have `focus-visible` outlines. Under `prefers-reduced-motion` the invalid-press shake becomes a colour flash, and the cursor blink and press animation are dropped. Tap targets are 64px tall, 72px from the `sm` breakpoint, and long expressions scroll horizontally, anchored right so the newest input stays visible.

**Containers.** Both Dockerfiles are multi-stage, so toolchains and source stay in the build stages, and the frontend uses Next.js standalone output (`output: "standalone"` in `next.config.ts`), so its runtime image carries only `server.js` and the dependencies Next.js traced, with `.next/static` and `public` copied in beside it. The backend is a static binary built with `CGO_ENABLED=0`, and both runtime images run as a non-root user, uid 10001. The backend runs on `alpine` rather than distroless so the Compose health check has BusyBox `wget` to call `/healthz` with, and the frontend's `depends_on` waits for that check to pass. `docker images` reports 22.5 MB for the backend and 292 MB for the frontend on disk, or 6.71 MB and 72.8 MB as compressed content.

## AI prompts

The prompts used while building this project are recorded in [PROMPTS.md](PROMPTS.md).

<sub>README drafted with the help of Claude Opus 5.5 (Anthropic), via Claude Code.</sub>
