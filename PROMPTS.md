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
