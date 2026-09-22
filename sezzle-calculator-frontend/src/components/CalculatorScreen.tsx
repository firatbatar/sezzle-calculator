interface CalculatorScreenProps {
    text: string,
    evaluatedExpression: string | null,
    error: string | null,
    isEvaluating: boolean,
    invalidCount: number,
}

// Reversed row keeps the scroll anchored at the right, so the end of a long expression stays visible
const lineScrollerClassNames = "flex w-full flex-row-reverse overflow-x-auto overflow-y-hidden rounded-md px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-700";

export default function CalculatorScreen({ text, evaluatedExpression, error, isEvaluating, invalidCount }: CalculatorScreenProps) {
    return (
        <div className="flex flex-col flex-1 w-full min-w-0 gap-1 px-2 py-3 sm:px-3 items-end justify-end overflow-hidden rounded-xl bg-stone-400/40 ring-1 ring-inset ring-stone-900/5 tabular-nums">
            <div className={lineScrollerClassNames}>
                <span className="min-h-6 whitespace-nowrap text-base text-stone-600 sm:min-h-7 sm:text-lg">{evaluatedExpression}</span>
            </div>

            <div className={lineScrollerClassNames}>
                <span
                    key={invalidCount}
                    className={
                        `${error ? "text-right text-xl text-red-700 sm:text-2xl" : "whitespace-nowrap text-4xl font-light text-stone-700 sm:text-5xl"} ${isEvaluating ? "opacity-50" : ""} ${invalidCount > 0 ? "motion-safe:animate-shake motion-reduce:animate-flash-red" : ""}`
                    }
                >
                    {error ?? text}
                    {/* Visual-only cursor, not part of the expression */}
                    {!error && <span aria-hidden="true" className="ml-0.5 inline-block h-[0.8em] w-0.5 rounded-full bg-indigo-800/80 align-[-0.05em] motion-safe:animate-blink" />}
                </span>
            </div>
        </div>
    );
}
