function toPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const calculatorConfig = {
    apiBaseUrl: process.env.NEXT_PUBLIC_CALCULATOR_API_URL ?? "",
    endpoints: {
        evaluate: process.env.NEXT_PUBLIC_CALCULATOR_EVALUATE_ENDPOINT ?? "/evaluate",
    },
    requestTimeoutMs: toPositiveInt(process.env.NEXT_PUBLIC_CALCULATOR_TIMEOUT_MS, 10000),
    errorDisplayMs: toPositiveInt(process.env.NEXT_PUBLIC_CALCULATOR_ERROR_DISPLAY_MS, 2000),
};