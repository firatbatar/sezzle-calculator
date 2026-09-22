interface CalculatorScreenProps {
    text: string,
    evaluatedExpression: string | null,
    error: string | null,
    isEvaluating: boolean,
    invalidCount: number,
}

export default function CalculatorScreen({ text, evaluatedExpression, error, isEvaluating, invalidCount }: CalculatorScreenProps) {
    return (
        <div className="flex flex-col flex-1 w-full p-8 items-end justify-end bg-white border-2 border-black rounded-md">
            <span className="min-h-6 text-center text-base text-gray-400">{evaluatedExpression}</span>

            <span
                key={invalidCount}
                className={
                    `text-center text-xl font-bold ${error ? "text-red-600" : ""} ${isEvaluating ? "opacity-50" : ""} ${invalidCount > 0 ? "motion-safe:animate-shake motion-reduce:animate-flash-red" : ""}`
                }
            >
                {error ?? text}
            </span>
        </div>
    );
}