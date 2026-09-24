# AI prompts

A record of the prompts used to build this project with an AI assistant, in the order they were given, so the work can be traced and reproduced.

## Frontend
### Prompt for the error/warning animation on the calculator screen
```md
I have two React components:

interface CalculatorScreenProps {
  text: string;
}

export default function CalculatorScreen({ text }: CalculatorScreenProps) {
  return (
    <div className="flex flex-1 w-full p-8 items-center justify-end bg-white border-2 border-black rounded-md">
      <p className="text-center text-xl font-bold">{text}</p>
    </div>
  );
}

export default function CalculatorBody() {
  const [pressStack, setPressStack] = React.useState<Press[]>([
    { value: "0", type: PressType.InitialZero },
  ]);

  const text = pressStack.map((press) => press.value).join("");

  const evaluate = () => {
    if (validateExpression(pressStack)) {
      // An expression string will be formed and sent to the backend for complete evaluation.
    } else {
      setInvalidCount((count) => count + 1);
    }
  };

  return (
    <div className="flex flex-1 w-full grid grid-cols-5 grid-rows-7 bg-gray">
      <div className="flex col-span-5 row-span-2">
        {/* Screen */}
        <CalculatorScreen text={text} />
      </div>

      {/* … other buttons … */}

      <CalculatorButton
        displayText="="
        press={{ value: "=", type: PressType.None }}
        buttonClick={() => evaluate()}
        classNames="col-span-2"
      />
    </div>
  );
}

The invalid branch of the `evaluate` function (triggered by the "=" button) should run an animation that turns the screen text red and shakes it.
```

### Prompt for the completion of the styling of the UI
```md
You're working on the frontend of a calculator app (Next.js, TypeScript, Tailwind CSS). The functionality is complete and tested. Your task is styling only.

Hard constraints:
- Do not change any functionality, state, event handlers, or component logic.
- Do not change the layout or the grid structure (rows, columns, column spans, button order).
- Do not change the app's background colour.
- Use Tailwind utility classes only. Do not add a CSS framework or component library.

What you may change:
- Colours of the calculator body, screen, text and buttons
- Font family, font sizes, spacing, border radius, shadows
- Button sizes, as long as the grid structure is unchanged

Required:
1. Make it simple and modern. Keep the styling minimal: a clean, restrained palette, with operators and the equals button visually distinct from digits.
2. Replace the delete and square-root button labels with icons. Use lucide-react or inline SVGs. Give each icon button an aria-label so accessibility is preserved.
3. Add a blinking cursor at the end of the screen's input. It must be purely visual and not part of the expression. Disable the animation under prefers-reduced-motion.
4. Make the design responsive. It should look right from small phones (~360px) up to desktop, with comfortable tap targets on mobile. Long expressions must not overflow the screen.
5. Add hover, active and focus-visible states to the buttons.

Before finishing:
- Run the existing tests and the linter, and make sure both pass. If a test selects a button by its text label and the icon change breaks it, update the selector to use the aria-label. Do not change what the test asserts.
- Give a brief summary of the files you changed and the design choices you made.
```

### Prompts for the testing suite
```md
Add a unit test suite with a coverage report for this Next.js + TypeScript calculator frontend. The functionality is complete and correct — do not change behaviour to make a test pass. If you find a genuine bug, report it to me instead of fixing it.

Setup:
- Use the project's existing test tooling if there is any. If there is none, set up Vitest + React Testing Library + @testing-library/user-event + jsdom, with @vitejs/plugin-react, jsdom environment, and the project's "@/" path alias resolving correctly.
- Add scripts: "test", "test:watch", and "test:coverage" using the v8 coverage provider with text and lcov reporters. Scope coverage to src, excluding config files, type-only files and test files.

One permitted source change: CalculatorBody.tsx keeps applyPress, validateExpression and the PressType enum module-private. Export all three so they can be unit tested. Change nothing else in that file.

Write two test files.

1. Pure logic tests for applyPress and validateExpression. Aim for full branch coverage. Build each case by folding a sequence of presses and asserting on the resulting joined string, so the tests read as button sequences. Cover:
   - Result state: operator after a result continues it; a negative result is wrapped in parentheses; sqrt( after a result does NOT continue it but starts a fresh expression; ")" after a result is ignored; a digit, "(" or "." after a result starts a new expression.
   - Implicit multiplication: ")" followed by a digit, "(", "sqrt(" or "."; and a digit or "." followed by "(" or "sqrt(".
   - Initial zero replacement by a digit, "(", "sqrt(" and ".".
   - Lone zero replacement: "5 + 0" then "7" gives "5 + 7"; "10" then "7" gives "107"; "0.0" then "7" gives "0.07".
   - Rejected input: operator after an operator, after "(", and on an empty stack; ")" with no open parenthesis; ")" straight after "(" or after an operator; a second decimal point within the same number, while a point after a following operator is accepted.
   - "sqrt(" counts as an opening parenthesis for both the ")" guard and validation.
   - validateExpression: empty stack, unbalanced openers, a close before any open, trailing operator, trailing "(", and each accepted trailing type including a trailing decimal point.

2. Component tests for CalculatorBody, mocking "@/lib/calculatorApi". Query buttons by accessible name and drive them with userEvent. Cover:
   - The initial screen shows "0".
   - An invalid expression on "=" makes no API call and increments the invalid counter passed to the screen.
   - A successful evaluation renders the evaluated expression and the result, and a following operator continues from that result.
   - A backend error renders the error message, and the message disappears after calculatorConfig.errorDisplayMs. Use fake timers, and configure userEvent's advanceTimers so the two do not deadlock.
   - Pressing any button while an error is visible clears it immediately and prevents the pending timer from firing later.
   - While a request is in flight (resolve it from a deferred promise you control), button presses, all-clear, delete and a second "=" are all ignored, and only one API call is made.
   - Delete removes one press unit at a time, delete after a result resets to "0", and deleting every press leaves an empty screen.

Then run the suite and the coverage report. Report the coverage figures, any branch you could not reach, and anything you believe is a bug.
```

```md
Write unit tests for src/lib/calculatorApi.ts. The implementation is complete — do not change it. If you find a genuine bug, report it to me rather than fixing it, and pin the current behaviour with a test so it is documented.

Use the project's existing Vitest setup. Put the tests alongside the other test files.

Approach:
- Stub the global fetch with vi.stubGlobal (or vi.spyOn on globalThis). Restore with vi.unstubAllGlobals and vi.useRealTimers in afterEach.
- Build responses with the real Response constructor rather than hand-rolled objects, so that json() rejects authentically on a non-JSON body.
- Import calculatorConfig and derive expectations from it (URL, timeout value). Do not hardcode the base URL or the timeout, and do not mock the config module.
- For the timeout tests use fake timers with vi.advanceTimersByTimeAsync so pending microtasks flush alongside the timer.

Cover:

Request shape
- One test asserting fetch is called exactly once with apiBaseUrl + endpoints.evaluate, method POST, a Content-Type of application/json, a body of JSON.stringify({ expression }), and an AbortSignal present in the init object.

Success
- A 200 with { value: 42, msg: null } returns { ok: true, value: "42" }.
- A 200 with a negative value and with zero both return the correct string, since the result is later parsed by the caller.
- A 200 with a decimal value returns it without losing precision in the string conversion.
- A 200 with a numeric string value, such as "3.14", returns { ok: true, value: "3.14" }.

Invalid success bodies 
- A 200 with value null returns { ok: false, value: "Invalid response from server" }.
- A 200 with no value field at all returns the same.
- A 200 with a non-JSON body returns the same.
- A 200 with a non-numeric string value, such as "abc", or with a boolean or object value, returns the same.

Backend errors
- A 400 with { value: null, msg: "division by zero" } returns { ok: false, value: "division by zero" }.
- A 500 with a null msg returns { ok: false, value: "Server error (500)" }.
- A 422 with an empty or whitespace-only msg falls back to the status message.
- A 500 with a msg that is not a string (a number, say) falls back to the status message.
- A 500 with a non-JSON body falls back to "Server error (500)".

Timeouts and network failure
- fetch rejecting with an AbortError after the signal has aborted returns { ok: false, value: "Request timed out" }.
- fetch rejecting for an unrelated reason, with the signal not aborted, returns { ok: false, value: "Cannot reach server" }.
- fetch resolving but the abort firing before the aborted check returns { ok: false, value: "Request timed out" }. This exercises a different branch from the AbortError case above — construct it by having fetch resolve only after the timer has advanced past requestTimeoutMs. If you cannot reach this branch deterministically without contorting the test, say so rather than writing something misleading.

Timer cleanup
- After a resolved call, assert vi.getTimerCount() is 0, proving the finally block clears the timeout and the timer does not leak.

Then run the full suite and the coverage report. Report the figures for calculatorApi.ts, any branch you could not reach, and a summary of the behaviour change you made.
```

### README
Write the README for this repository. It is a monorepo containing a Next.js/TypeScript calculator frontend and a Go backend. The frontend is complete; the backend is not written yet.

Your job this pass: produce the complete README structure covering both services, fill in every frontend and repo-level section fully, and leave clearly marked TODO placeholders for the backend sections. Do not invent anything about the backend beyond what the repo already shows.

This README is a graded deliverable for a take-home assignment. It must explicitly satisfy these requirements: setup instructions, how to run the frontend and backend, examples of API calls, and design decisions or assumptions. It should also present the unit tests and coverage report.

Ground rules — accuracy above all:
- Read package.json, the Vitest config, the Next.js config, the calculator config module and the API client before writing anything. Every command, script name, port and environment variable you state must match what is actually in the repo.
- Run the test suite with coverage yourself and paste the real table. Do not fabricate or round figures.
- If you cannot verify a claim from the code, mark it TODO rather than guessing.

Structure:

1. Title and a two or three sentence summary of what the project is and how the two services relate.
2. Repository layout — a short tree showing the top-level directories and what each holds.
3. Prerequisites — actual Node and Go versions, derived from package.json engines, .nvmrc or go.mod where present.
4. Quick start — the shortest path to a running system. If a docker-compose file exists use that; otherwise state it as TODO and give the manual path.
5. Running the frontend — install, dev server, production build, the port, and any environment variables with their defaults and an example .env.local.
6. Running the backend — TODO placeholder with the section headings in place.
7. API reference — TODO placeholder. Note in one line that the frontend calls a single evaluate endpoint, and state the request and response shapes the client currently expects, since that is verifiable from the API client and is the contract the backend must meet.
8. Testing — how to run the suite, how to run it with coverage, where the HTML report lands. Paste the real coverage table in a fenced block. Add a short paragraph on testing strategy: what is unit tested directly, what is tested through the rendered component, why the Next.js App Router shell is excluded from coverage, and what is deliberately left to be covered by backend tests.
9. Design decisions and assumptions — frontend only in this pass. Cover, drawing from the actual code:
   - Why Next.js was chosen when the brief specified React.
   - Why expression evaluation lives in the backend rather than the frontend, and what the frontend validation is therefore for: immediate feedback, not authority. Note that the backend re-validates because the API can be called directly.
   - The input model: presses are held as a typed stack rather than a raw string, which is what makes validation and deletion tractable.
   - The specific input rules a reviewer would otherwise have to infer — implicit multiplication after a closing parenthesis or before an opening one, initial and lone zero replacement, one decimal point per number, operators not being replaceable after one another, square root opening a parenthesis, and how a result carries into a new expression with a negative result wrapped in parentheses.
   - Error and timeout handling in the API client, including the request timeout and the fact that a malformed success body is treated as an error rather than displayed.
   - The single in-flight request guard.
   - Accessibility and responsiveness choices that are actually present in the code, such as aria-labels on the icon buttons and reduced-motion handling.
10. A link to PROMPTS.md for the AI prompts used, with a one-line note. Create PROMPTS.md as a stub with a heading and a short explanatory sentence if it does not exist.

Style: British English. Semi-formal and direct. Use fenced code blocks with language tags for every command. No marketing language, no emoji, no badges. Keep each section as short as it can be while still being complete — a reviewer should be able to clone and run within a minute of opening the file.

When done, list the TODO placeholders you left and anything you could not verify from the code.

## Backend
### Testing the tokenizer
```md
Write table-driven unit tests for the tokenizer in internal/calculator/tokenizer.go.

Read the implementation first. Do not change it — if you find a bug, tell me rather than fixing it.

Use the standard testing package only, no testify. Put them in internal/calculator/lexer_test.go as package calculator, so unexported identifiers are reachable. Two functions: one for successful tokenisation asserting the exact []token with reflect.DeepEqual, one for errors asserting with errors.Is. Each case is a struct in a slice with a short descriptive name, run via t.Run. Use %q when printing the input so whitespace cases are legible.

Cover:
- Integers, decimals, and numbers normalised from a leading or trailing decimal point
- Whitespace of every accepted kind being discarded, including between digits and operators
- Every operator and parenthesis mapping to the right token type
- "sqrt(" producing a single token that consumes the parenthesis, so sqrt(9) is three tokens not four
- A negated number inside parentheses
- Errors: empty input, whitespace-only input, an unknown character, a letter sequence, a multi-byte character, "sqrt" not followed by a parenthesis, two decimal points in one number, a lone decimal point, and input over maxExpressionLength

Derive the length case from the maxExpressionLength constant rather than hardcoding a number. Then run the tests and report anything that fails.
```

### Testing the evaluator
```md
Write table-driven unit tests for Evaluate in internal/calculator/eval.go.

Read the implementation and the grammar it encodes first. Do not change it — if you find a bug, tell me rather than fixing it.

Use the standard testing package only, no testify. Put them in internal/calculator/eval_test.go as package calculator. Two functions: one for valid expressions asserting the numeric result, one for errors asserting with errors.Is. Each case is a struct with a short descriptive name and the expression as a string, run via t.Run. Group the cases with comments by the behaviour they cover.

Compare results with a small closeEnough helper using a relative tolerance, not ==, since division and roots make exact comparison unreliable.

Cover valid expressions for:
- The four basic operations, a bare number, and a parenthesised number
- Precedence, including parentheses overriding it
- Left associativity of subtraction, division and %, and right associativity of ^
- Unary minus and plus: leading, after a binary operator, before a group, doubled, and interacting with ^ in both directions, so that -2^2 is -4 and 2^-2 is 0.25
- sqrt of a literal, of zero, of an expression, nested, negated, and used as an exponent base
- % meaning "Y percent of X", so 100 % 30 is 30 and 10 + 100 % 30 is 40, plus its precedence relative to * and +
- Whitespace, deep nesting, and numbers with a leading or trailing decimal point

Cover errors for:
- Division by zero, both literal and from an expression
- Square root of a negative, both literal and from an expression
- Results that are not finite: 0 ^ -1 and an overflow
- Malformed input: trailing operator, lone operator, lone sign, two binary operators in a row, adjacent operands, an operand next to a group, an empty group, an empty sqrt
- Unbalanced parentheses, opened and unopened, partially closed, and an unclosed sqrt
- Lexical errors propagating through: empty input, unknown character, two decimal points, over-length input

Then run the tests with coverage and report the figure plus anything that fails.
```

### Http Handler
Write the HTTP layer for this Go calculator backend. The module is github.com/firatbatar/sezzle-calculator/backend. The calculator package is complete — do not modify it, and do not add any dependency outside the standard library.

What already exists:
- internal/calculator exposes Evaluate(input string) (float64, error) and the sentinel errors ErrEmptyExpression, ErrInvalidCharacter, ErrInvalidSyntax, ErrUnbalancedParens, ErrExpressionTooLong, ErrDivisionByZero, ErrNegativeRoot, ErrResultNotFinite.
- internal/api/types.go defines the unexported evaluateRequest and evaluateResponse structs and the helpers success(float64) and failure(string). Read it; use those helpers rather than building responses by hand.

Create three files.

1. internal/api/server.go

A Server struct with exactly two unexported fields: a *log.Logger and an *http.ServeMux. Nothing else.

NewServer(logger *log.Logger) *Server builds the struct, registers the routes inline in the constructor (no separate routes method), and returns it. Routes, using Go 1.22 method-in-pattern syntax: "GET /healthz" and "POST /evaluate". Note there is no /api/v1 prefix — the path is exactly /evaluate.

Give Server an unexported writeJSON(w http.ResponseWriter, status int, v any) method. It must marshal to a byte slice with json.Marshal first, not stream with json.NewEncoder, so a marshalling failure can still be turned into a 500 before anything is committed to the response. On marshalling failure: log it, set the content type, write 500, and write a hardcoded JSON literal matching the response shape. On success: set the content type, write the status, write the body, and log any write error. Keep the header/status/body ordering correct in both paths.

2. internal/api/handlers.go

A maxBodyBytes constant of 4 << 10.

handleHealth: respond 200 with a map[string]string of status ok, via writeJSON.

handleEvaluate:
- Wrap r.Body in http.MaxBytesReader with the cap.
- Decode into an evaluateRequest. On decode failure respond 400 with failure("request body is not valid JSON").
- Call calculator.Evaluate. On error, get the status from a helper; if that status is 500, log the expression and the error and respond with a generic "internal server error" message, otherwise respond with err.Error() as the message. On success respond 200 with success(result).
- Return after every write. No else branches.

getHttpStatusFromErr(err error) int — an expressionless switch using errors.Is, with these four groups in this order:
- ErrEmptyExpression, ErrInvalidCharacter, ErrInvalidSyntax, ErrUnbalancedParens -> 400
- ErrExpressionTooLong -> 413
- ErrDivisionByZero, ErrNegativeRoot, ErrResultNotFinite -> 422
- default -> 500
Use the http.Status* constants, never integer literals.

3. cmd/server/main.go

Read PORT from the environment, defaulting to 8000. Build a *log.Logger writing to os.Stdout with flags log.LstdFlags|log.Lmsgprefix. Construct the server, log the listen address, and call http.ListenAndServe with the server as the handler, calling logger.Fatalf if it returns. main does configuration and wiring only — no logic.

Style:
- Idiomatic Go. gofmt clean, go vet clean.
- Standard library imports in their own group, the module import in a second group.
- Keep it terse. Comment only where the reason is not obvious from the code — the writeJSON ordering and the maxBodyBytes rationale are worth a line each; nothing else needs one.
- No middleware, no CORS, no timeouts, no graceful shutdown. Those come later.
- No catch-all "/" route: it would match every path and swallow the mux's automatic 405 handling.

Then run go build ./..., go vet ./... and gofmt -l ., start the server, and verify with curl that "2 + 3 * 4" returns 20, "1/0" returns 422, a malformed body returns 400, and GET /evaluate returns 405.

### Update README
Fill in the backend sections of the README. The frontend sections are already written; match their tone, depth and heading style, and do not rewrite them. The backend is complete: Go standard library only, no third-party dependencies.

This README is a graded deliverable for a take-home assignment. It must explicitly satisfy: setup instructions, how to run the frontend and backend, examples of API calls, and design decisions or assumptions. Docker is not done yet — leave the existing Docker placeholders alone.

Ground rules — accuracy above all:
- Read backend/go.mod, the Makefile, cmd/server/main.go, internal/api/*.go and internal/calculator/*.go before writing anything. Every command, target name, port, environment variable, endpoint path, status code and error message you state must match what is actually in the code.
- Run the tests with coverage yourself and paste the real figures. Do not fabricate or round them.
- Where the frontend README already states something that the backend contradicts, tell me rather than silently picking one.

Sections to fill in:

1. Prerequisites — add the Go version, taken from the go directive in go.mod.

2. Running the backend — the Makefile targets first, since that is the intended entry point, with the equivalent raw go commands underneath for anyone who would rather not use make. Include: run, build, test, coverage, format and vet, using the actual target names from the Makefile. State the default port and the ALLOWED_ORIGIN variable with its default, and note that both are read from the environment.

3. API reference — replace the placeholder. Document both endpoints with method, path, request body shape and response body shape. Explain that the response envelope is the same for success and failure, with exactly one of value and msg non-null, and that msg is written to be shown directly to an end user. Give runnable curl examples: a successful evaluation, a division by zero, a syntax error, and the health check. Show the real response bodies — run the commands against a locally running server and paste what comes back. Then a status code table with one row per condition, taken from getHttpStatusFromErr and the handler, including the 413 from the expression length limit and the 400 from a body that exceeds the reader limit.

4. Testing — extend the existing section rather than starting a new one. Add how to run the Go tests and the coverage report via both make and raw go, where the profile lands, and how to open the HTML view. Paste the real go tool cover -func summary in a fenced block alongside the frontend's Vitest table. Add a short paragraph on backend testing strategy: the tokeniser and evaluator are tested as pure functions with table-driven tests; the HTTP layer is tested through Server.ServeHTTP with httptest so routing, middleware and error mapping are exercised together; and name what is deliberately left uncovered, such as main and the marshalling-failure branch in writeJSON, with a sentence on why chasing those is not worthwhile.

5. Design decisions — add the backend subsections. Cover, drawing from the actual code:
   - Standard library only, no framework and no dependencies. net/http with the Go 1.22+ ServeMux, where the method is part of the route pattern, which gives correct 405 handling without extra code.
   - Package layout: cmd/server for wiring, internal/calculator for the domain, internal/api for HTTP. internal/ is compiler-enforced, and calculator has no knowledge of HTTP.
   - Sentinel errors in the calculator package, matched with errors.Is in the api package, as the mechanism that keeps transport concerns out of the domain while still producing accurate status codes.
   - The evaluation approach: a single-pass stack evaluator with an operator stack and a number stack, rather than building an AST. Say why — it is one pass, it needs no tree allocation, and precedence and associativity fall out of the push/reduce rules. Explain how the isExpectingOperator flag distinguishes unary from binary plus and minus, and how sqrt is handled as an opening bracket that reduces on close.
   - Operator semantics and assumptions a reviewer would otherwise have to infer: exponentiation is right-associative, unary minus binds tighter than multiplication but looser than exponentiation, percent is a binary operator computing left * right / 100, and sqrt requires its parenthesis. State each one explicitly as a decision.
   - Numeric behaviour: float64 throughout, with the consequence that 0.1 + 0.2 is not exactly 0.3. Say why float64 was chosen anyway and what the alternative would have been. Note that NaN and infinite results are rejected rather than returned.
   - Input bounds: the 256-character expression limit in the tokeniser and the 4 KiB body limit via MaxBytesReader, and that these are the deliberate substitute for rate limiting.
   - Middleware: CORS and request logging only, with the justification we agreed — the service is stateless, single-endpoint, holds no user data and is not publicly deployed, so rate limiting, auth, request IDs and tracing would add configuration without protecting anything; per-IP rate limiting via golang.org/x/time/rate would be the first addition if it were deployed publicly.
   - The ReadHeaderTimeout on the http.Server, and that graceful shutdown was left out as unnecessary for a stateless service.
   - That validation happens on both sides: the frontend validates for immediate feedback, the backend re-validates because the API can be called directly, and the backend is the authority.

Style: British English. Semi-formal and direct. Fenced code blocks with language tags for every command and every JSON body. No marketing language, no emoji, no badges. Keep each section as short as it can be while still being complete.

When done, list anything you could not verify from the code, and any place where the README and the implementation disagreed.