import type { ReactNode } from "react";
import { Press } from "./CalculatorBody";

type CalculatorButtonVariant = "digit" | "function" | "operator" | "equals";

const variantClassNames: Record<CalculatorButtonVariant, string> = {
    digit: "text-xl sm:text-2xl bg-stone-300 text-stone-700 hover:bg-stone-400/60 active:bg-stone-400",
    function: "text-xl sm:text-2xl bg-stone-200 text-stone-600 ring-1 ring-inset ring-stone-400/60 hover:bg-stone-300 hover:text-stone-700 active:bg-stone-400/60",
    // Operator glyphs (- * ^) render small, so they get one size step up
    operator: "text-2xl sm:text-3xl bg-indigo-200/60 text-indigo-900 hover:bg-indigo-200 active:bg-indigo-300",
    equals: "text-2xl sm:text-3xl bg-indigo-800 text-indigo-50 hover:bg-indigo-700 active:bg-indigo-900",
};

interface CalculatorButtonProps {
    displayText: ReactNode,
    press: Press,
    buttonClick: (press: Press) => void,
    classNames?: string,
    ariaLabel?: string,
    variant?: CalculatorButtonVariant,
}

export default function CalculatorButton({
    displayText,
    press,
    buttonClick,
    classNames,
    ariaLabel,
    variant = "digit",
}: CalculatorButtonProps) {
    return (
        <button
            className={`flex h-16 w-full select-none touch-manipulation items-center justify-center rounded-xl font-medium transition duration-150 ease-out sm:h-18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 motion-safe:active:scale-95 ${variantClassNames[variant]} ${classNames ?? ""}`}
            aria-label={ariaLabel}
            onClick={() => {buttonClick(press)}}
        >
            {displayText}
        </button>
    );
}
