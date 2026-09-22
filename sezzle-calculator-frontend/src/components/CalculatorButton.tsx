import { Press } from "./CalculatorBody";

interface CalculatorButtonProps {
    displayText: string,
    press: Press,
    buttonClick: (press: Press) => void,
    classNames?: string
}

export default function CalculatorButton({
    displayText,
    press,
    buttonClick,
    classNames 
}: CalculatorButtonProps) {
    return (
        <button 
            className={`flex flex-1 w-full border-2 border-black p-8 text-center text-xl font-bold items-center justify-center ${classNames ?? ""}`}
            onClick={() => {buttonClick(press)}}
        >
            {displayText}
        </button>
    );
}