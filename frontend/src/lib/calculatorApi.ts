import { calculatorConfig } from "@/config/calculator";

export type EvaluationResponse = { ok: boolean, value: string }

// Backend response body: { "value": number | null, "msg": string | null }
//   2xx:     value is the result, msg is null. Only a finite number, or a
//            numeric string, counts as a result; anything else is reported as
//            an invalid response rather than shown to the user verbatim.
//   non-2xx: value is null, msg describes the error
export async function evaluateExpression(expression: string): Promise<EvaluationResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), calculatorConfig.requestTimeoutMs);
    
    const url = calculatorConfig.apiBaseUrl + calculatorConfig.endpoints.evaluate;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expression }),
            signal: controller.signal,
        });

        let data: unknown = null;
        try {
            data = await response.json();
        } catch {
            // Not JSON
        }

        if (controller.signal.aborted) {
            return { ok: false, value: "Request timed out" };
        }

        const body = typeof data == "object" && data !== null ? data as Record<string, unknown> : {};

        if (response.ok) {
            const value = body.value;
            const isFiniteNumber = typeof value == "number" && Number.isFinite(value);
            const isNumericString = typeof value == "string" && value.trim() != "" && Number.isFinite(Number(value));

            if (isFiniteNumber || isNumericString) {
                return { ok: true, value: String(value) };
            }
            return { ok: false, value: "Invalid response from server" };
        }
        
        if (typeof body.msg == "string" && body.msg.trim() != "") {
            return { ok: false, value: body.msg };
        }
        return { ok: false, value: `Server error (${response.status})` };
    } catch {
        // fetch fail
        return { ok: false, value: controller.signal.aborted ? "Request timed out" : "Cannot reach server" };
    } finally {
        clearTimeout(timeout);
    }
}