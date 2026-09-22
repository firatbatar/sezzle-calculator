interface CalculatorScreenProps {
    text: string,
    invalidCount: number,
}

export default function CalculatorScreen({ text, invalidCount }: CalculatorScreenProps) {
    return (
        <div className="flex flex-1 w-full p-8 items-center justify-end bg-white border-2 border-black rounded-md">
            <span key={invalidCount} className={`text-center text-xl font-bold ${invalidCount > 0 ? "motion-safe:animate-shake motion-reduce:animate-flash-red" : ""}`}>
                {text}
            </span>
        </div>
    );
}