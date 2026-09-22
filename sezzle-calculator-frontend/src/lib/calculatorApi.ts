import { calculatorConfig } from "@/config/calculator";

export type EvaluationResponse = { ok: boolean, value: string }

// Backend response body: { "value": number | null, "msg": string | null }
//   2xx:     value is the integer result, msg is null
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
            return { ok: true, value: String(body.value) };
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