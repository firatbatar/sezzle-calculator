import { act, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalculatorBody from "@/components/CalculatorBody";
import { calculatorConfig } from "@/config/calculator";
import { evaluateExpression, type EvaluationResponse } from "@/lib/calculatorApi";

vi.mock("@/lib/calculatorApi", () => ({
    evaluateExpression: vi.fn(),
}));

// Stubbed so the props CalculatorBody hands to the screen can be asserted
// directly, including invalidCount, which the real screen only expresses as a
// remount of an animated element.
vi.mock("@/components/CalculatorScreen", () => ({
    default: ({ text, evaluatedExpression, error, isEvaluating, invalidCount }: {
        text: string,
        evaluatedExpression: string | null,
        error: string | null,
        isEvaluating: boolean,
        invalidCount: number,
    }) => (
        <div>
            <span data-testid="text">{error ?? text}</span>
            <span data-testid="history">{evaluatedExpression ?? ""}</span>
            <span data-testid="invalid-count">{invalidCount}</span>
            <span data-testid="evaluating">{String(isEvaluating)}</span>
        </div>
    ),
}));

const evaluateExpressionMock = vi.mocked(evaluateExpression);

const key = (name: string) => screen.getByRole("button", { name });
const displayed = () => screen.getByTestId("text").textContent;
const history = () => screen.getByTestId("history").textContent;
const invalidCount = () => screen.getByTestId("invalid-count").textContent;
const isEvaluating = () => screen.getByTestId("evaluating").textContent;

/** Lets the awaited request settle and React apply the resulting state. */
const flush = () => act(async () => { await Promise.resolve(); });

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(res => { resolve = res; });
    return { promise, resolve };
}

let user: UserEvent;

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Without advanceTimers, user-event's internal delays never fire under fake timers
    user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
});

afterEach(() => {
    vi.useRealTimers();
});

async function press(...names: string[]) {
    for (const name of names) {
        await user.click(key(name));
    }
}

describe("CalculatorBody", () => {
    it("starts with 0 on the screen", () => {
        render(<CalculatorBody />);

        expect(displayed()).toBe("0");
        expect(history()).toBe("");
        expect(invalidCount()).toBe("0");
    });

    it("does not call the backend for an invalid expression and counts it as invalid", async () => {
        render(<CalculatorBody />);

        await press("(", "=");

        expect(evaluateExpressionMock).not.toHaveBeenCalled();
        expect(invalidCount()).toBe("1");
        expect(displayed()).toBe("(");
    });

    it("shows the evaluated expression and the result, then continues from it", async () => {
        evaluateExpressionMock.mockResolvedValue({ ok: true, value: "15" });
        render(<CalculatorBody />);

        await press("7", "+", "8", "=");
        await flush();

        expect(evaluateExpressionMock).toHaveBeenCalledWith("7 + 8");
        expect(history()).toBe("7 + 8 =");
        expect(displayed()).toBe("15");

        await press("+");

        expect(displayed()).toBe("15 + ");
        expect(history()).toBe("");
    });

    it("shows a backend error and clears it after errorDisplayMs", async () => {
        evaluateExpressionMock.mockResolvedValue({ ok: false, value: "Division by zero" });
        render(<CalculatorBody />);

        await press("8", "/", "0", "=");
        await flush();

        expect(displayed()).toBe("Division by zero");
        expect(invalidCount()).toBe("1");

        act(() => { vi.advanceTimersByTime(calculatorConfig.errorDisplayMs - 1); });
        expect(displayed()).toBe("Division by zero");

        act(() => { vi.advanceTimersByTime(1); });
        expect(displayed()).toBe("8 / 0");
    });

    it("clears a visible error on the next press and cancels its pending timer", async () => {
        evaluateExpressionMock.mockResolvedValue({ ok: false, value: "Division by zero" });
        render(<CalculatorBody />);

        await press("8", "/", "0", "=");
        await flush();
        expect(displayed()).toBe("Division by zero");

        await press("1");
        expect(displayed()).toBe("8 / 1");

        // The timer from the cleared error must not fire over the new input
        act(() => { vi.advanceTimersByTime(calculatorConfig.errorDisplayMs * 2); });
        expect(displayed()).toBe("8 / 1");
    });

    it("ignores every press while a request is in flight", async () => {
        const pending = deferred<EvaluationResponse>();
        evaluateExpressionMock.mockReturnValue(pending.promise);
        render(<CalculatorBody />);

        await press("7", "+", "8", "=");

        expect(isEvaluating()).toBe("true");

        await press("1", "C", "Delete", "=");

        expect(evaluateExpressionMock).toHaveBeenCalledTimes(1);
        expect(displayed()).toBe("7 + 8");

        await act(async () => { pending.resolve({ ok: true, value: "15" }); });

        expect(displayed()).toBe("15");
        expect(isEvaluating()).toBe("false");
    });

    describe("delete and clear", () => {
        it("removes one press at a time and can empty the screen", async () => {
            render(<CalculatorBody />);

            await press("1", "2", "+", "3");
            expect(displayed()).toBe("12 + 3");

            await press("Delete");
            expect(displayed()).toBe("12 + ");

            await press("Delete");
            expect(displayed()).toBe("12");

            await press("Delete");
            expect(displayed()).toBe("1");

            await press("Delete");
            expect(displayed()).toBe("");
        });

        it("resets to 0 when deleting a result", async () => {
            evaluateExpressionMock.mockResolvedValue({ ok: true, value: "15" });
            render(<CalculatorBody />);

            await press("7", "+", "8", "=");
            await flush();
            expect(displayed()).toBe("15");

            await press("Delete");

            expect(displayed()).toBe("0");
            expect(history()).toBe("");
        });

        it("resets to 0 on all clear", async () => {
            render(<CalculatorBody />);

            await press("1", "2", "+", "3", "C");

            expect(displayed()).toBe("0");
        });
    });
});
