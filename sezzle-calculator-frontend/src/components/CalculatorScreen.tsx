interface CalculatorScreenProps {
    text: string
}

export default function CalculatorScreen({ text }: CalculatorScreenProps) {
    return (
        <div className="flex flex-1 w-full p-8 items-center justify-end bg-white border-2 border-black rounded-md">
            <p className="text-center text-xl font-bold">{text}</p>
        </div>
    );
}