import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculatorConfig } from "@/config/calculator";
import { evaluateExpression } from "@/lib/calculatorApi";

const url = calculatorConfig.apiBaseUrl + calculatorConfig.endpoints.evaluate;

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;
let fetchMock: FetchMock;

/** A real Response, so json() parses (or rejects) the way the browser would. */
const respond = (body: string, status: number) => new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
});

const json = (body: unknown, status = 200) => respond(JSON.stringify(body), status);

beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("evaluateExpression", () => {
    describe("the request", () => {
        it("posts the expression as JSON to the configured endpoint, with an abort signal", async () => {
            fetchMock.mockResolvedValue(json({ value: 2, msg: null }));

            await evaluateExpression("1 + 1");

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [calledUrl, init] = fetchMock.mock.calls[0];
            expect(calledUrl).toBe(url);
            expect(init?.method).toBe("POST");
            expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
            expect(init?.body).toBe(JSON.stringify({ expression: "1 + 1" }));
            expect(init?.signal).toBeInstanceOf(AbortSignal);
        });
    });

    describe("a successful result", () => {
        it("returns the number as a string", async () => {
            fetchMock.mockResolvedValue(json({ value: 42, msg: null }));

            await expect(evaluateExpression("40 + 2")).resolves.toEqual({ ok: true, value: "42" });
        });

        it("returns negative numbers and zero", async () => {
            fetchMock.mockResolvedValue(json({ value: -7, msg: null }));
            await expect(evaluateExpression("3 - 10")).resolves.toEqual({ ok: true, value: "-7" });

            fetchMock.mockResolvedValue(json({ value: 0, msg: null }));
            await expect(evaluateExpression("3 - 3")).resolves.toEqual({ ok: true, value: "0" });
        });

        it("keeps decimal precision", async () => {
            fetchMock.mockResolvedValue(json({ value: 1234.56789012345, msg: null }));

            await expect(evaluateExpression("1234.56789012345")).resolves.toEqual({
                ok: true,
                value: "1234.56789012345",
            });
        });

        it("accepts a numeric string, in case the backend sends results as strings", async () => {
            fetchMock.mockResolvedValue(json({ value: "3.14", msg: null }));

            await expect(evaluateExpression("pi")).resolves.toEqual({ ok: true, value: "3.14" });
        });
    });

    describe("a 2xx that carries no usable result", () => {
        const invalid = { ok: false, value: "Invalid response from server" };

        it("rejects a null value", async () => {
            fetchMock.mockResolvedValue(json({ value: null, msg: null }));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects a missing value field", async () => {
            fetchMock.mockResolvedValue(json({ msg: null }));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects a body that is not JSON", async () => {
            fetchMock.mockResolvedValue(respond("<html>not json</html>", 200));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects a body that parses to something other than an object", async () => {
            fetchMock.mockResolvedValue(respond("42", 200));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects a non-numeric string, a boolean and an object", async () => {
            fetchMock.mockResolvedValue(json({ value: "abc", msg: null }));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);

            fetchMock.mockResolvedValue(json({ value: true, msg: null }));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);

            fetchMock.mockResolvedValue(json({ value: { result: 42 }, msg: null }));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects an empty or whitespace-only string, which Number() would read as 0", async () => {
            fetchMock.mockResolvedValue(json({ value: "", msg: null }));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);

            fetchMock.mockResolvedValue(json({ value: "   ", msg: null }));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual(invalid);
        });

        it("rejects a number that is not finite", async () => {
            // 1e999 overflows to Infinity when the body is parsed
            fetchMock.mockResolvedValue(respond('{"value": 1e999, "msg": null}', 200));

            await expect(evaluateExpression("1 / 0")).resolves.toEqual(invalid);
        });
    });

    describe("a backend error", () => {
        it("passes the message through", async () => {
            fetchMock.mockResolvedValue(json({ value: null, msg: "division by zero" }, 400));

            await expect(evaluateExpression("1 / 0")).resolves.toEqual({
                ok: false,
                value: "division by zero",
            });
        });

        it("falls back to the status when msg is null", async () => {
            fetchMock.mockResolvedValue(json({ value: null, msg: null }, 500));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Server error (500)",
            });
        });

        it("falls back to the status when msg is empty or whitespace", async () => {
            fetchMock.mockResolvedValue(json({ value: null, msg: "" }, 422));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Server error (422)",
            });

            fetchMock.mockResolvedValue(json({ value: null, msg: "   " }, 422));
            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Server error (422)",
            });
        });

        it("falls back to the status when msg is not a string", async () => {
            fetchMock.mockResolvedValue(json({ value: null, msg: 123 }, 500));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Server error (500)",
            });
        });

        it("falls back to the status when the body is not JSON", async () => {
            fetchMock.mockResolvedValue(respond("<html>bad gateway</html>", 500));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Server error (500)",
            });
        });
    });

    describe("timeouts and network failure", () => {
        it("reports a timeout when fetch aborts", async () => {
            fetchMock.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
                });
            }));
            vi.useFakeTimers();

            const pending = evaluateExpression("1 + 1");
            await vi.advanceTimersByTimeAsync(calculatorConfig.requestTimeoutMs);

            await expect(pending).resolves.toEqual({ ok: false, value: "Request timed out" });
        });

        it("reports an unreachable server when fetch fails for another reason", async () => {
            fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

            await expect(evaluateExpression("1 + 1")).resolves.toEqual({
                ok: false,
                value: "Cannot reach server",
            });
        });

        it("reports a timeout when the response arrives after the abort fired", async () => {
            // A fetch that ignores the abort signal and resolves late: the
            // response is discarded because the signal already aborted.
            let settle!: (response: Response) => void;
            fetchMock.mockReturnValue(new Promise<Response>(resolve => { settle = resolve; }));
            vi.useFakeTimers();

            const pending = evaluateExpression("1 + 1");
            await vi.advanceTimersByTimeAsync(calculatorConfig.requestTimeoutMs);
            settle(json({ value: 42, msg: null }));

            await expect(pending).resolves.toEqual({ ok: false, value: "Request timed out" });
        });
    });

    describe("timer cleanup", () => {
        it("clears the timeout once the call settles", async () => {
            vi.useFakeTimers();
            fetchMock.mockResolvedValue(json({ value: 42, msg: null }));

            await evaluateExpression("40 + 2");

            expect(vi.getTimerCount()).toBe(0);
        });
    });
});
