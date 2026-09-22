'use client'

import React from "react";
import CalculatorButton from "./CalculatorButton";
import CalculatorScreen from "./CalculatorScreen";
import { DeleteIcon, SquareRootIcon } from "./icons";
import { calculatorConfig } from "@/config/calculator";
import { evaluateExpression } from "@/lib/calculatorApi";

enum PressType {
    Number,
    Operation,
    OpenParenthesis,
    CloseParenthesis,
    DecimalDot,
    InitialZero,
    Result,
    None,
}

export type Press = { value: string, type: PressType };

function applyPress(stack: Press[], press: Press): Press[] {
    const lastPress = stack[stack.length - 1];
    const multiply: Press = { value: "*", type: PressType.Operation };

    if (lastPress?.type == PressType.Result) {
        if (press.type == PressType.Operation && press.value != "sqrt(") {
            // Continue using the result
            // Wrap a negative result in parentheses
            const result: Press = lastPress.value.startsWith("-") ? { value: `(${lastPress.value})`, type: PressType.Result } : lastPress;
            return [...stack.slice(0, -1), result, press];
        }

        if (press.type == PressType.CloseParenthesis) {
            return stack;
        }

        // Any other input clears the result and starts a new expression,
        return applyPress([{ value: "0", type: PressType.InitialZero }], press);
    }
 
    switch (press.type) {
        case PressType.Number: {
            if (lastPress?.type == PressType.InitialZero) {
                // Replace the initial zero
                return [press];
            }

            if (lastPress?.type == PressType.CloseParenthesis) {
                // Add multiplication then the number: "(2)" + "3" -> "(2)*3"
                return [...stack, multiply, press];
            }

            // Replace a lone zero
            const beforeLastPress = stack[stack.length - 2];
            if (
                lastPress?.type == PressType.Number && lastPress.value == "0" &&
                beforeLastPress?.type != PressType.Number && beforeLastPress?.type != PressType.DecimalDot
            ) {
                return [...stack.slice(0, -1), press];
            }
 
            // Add the number
            return [...stack, press];
        }
 
        case PressType.Operation: {
            if (press.value == "sqrt(") {
                if (lastPress?.type == PressType.InitialZero) {
                    // Replace the initial zero: "0" + "sqrt(" -> "sqrt("
                    return [press];
                }

                // sqrt opens a parenthesis and follow same rules as "("
                if (lastPress?.type == PressType.Number || lastPress?.type == PressType.CloseParenthesis || lastPress?.type == PressType.DecimalDot) {
                    return [...stack, multiply, press];
                }

                return [...stack, press];
            }
 
            if (lastPress === undefined || lastPress.type == PressType.Operation || lastPress.type == PressType.OpenParenthesis) {
                // Ignore at the empty, after another operation (including "sqrt(") or after "("
                return stack;
            }
 
            // Add the operation
            return [...stack, press];
        }
 
        case PressType.OpenParenthesis: {
            if (lastPress?.type == PressType.InitialZero) {
                // Replace the initial zero
                return [press];
            }

            if (lastPress?.type == PressType.Number || lastPress?.type == PressType.CloseParenthesis || lastPress?.type == PressType.DecimalDot) {
                // Add multiplication then open parenthesis: "2" + "(" -> "2*("
                return [...stack, multiply, press];
            }
 
            // Add open parenthesis
            return [...stack, press];
        }
 
        case PressType.CloseParenthesis: {
            // Check open parenthesis count first.
            let openParenthesesCount = 0;
            for (const p of stack) {
                if (p.value.endsWith("(")) openParenthesesCount++;
                else if (p.type == PressType.CloseParenthesis) openParenthesesCount--;
            }
            if (openParenthesesCount == 0) {
                return stack;
            }
 
            if (lastPress?.type == PressType.Operation || lastPress?.type == PressType.OpenParenthesis) {
                // Ignore after an operation, and after "(" so that "()" is not possible
                return stack;
            }
 
            // Add close parenthesis
            return [...stack, press];
        }
 
        case PressType.DecimalDot: {
            if (lastPress?.type == PressType.InitialZero) {
                // Replace the initial zero
                return [{ value: "0.", type: PressType.DecimalDot }];
            }

            if (lastPress?.type == PressType.DecimalDot) {
                // Ignore after another dot
                return stack;
            }
 
            if (lastPress?.type == PressType.Number) {
                // Ignore if the number being typed already has a dot ("1.5" + ".")
                for (let i = stack.length - 1; i >= 0 && stack[i].type != PressType.Operation && stack[i].type != PressType.OpenParenthesis && stack[i].type != PressType.CloseParenthesis; i--) {
                    if (stack[i].type == PressType.DecimalDot) {
                        return stack;
                    }
                }
 
                // Add dot
                return [...stack, press];
            }
 
            if (lastPress?.type == PressType.CloseParenthesis) {
                // Add multiplication then 0.
                return [...stack, multiply, { value: "0.", type: PressType.DecimalDot }];
            }
 
            // Make 0.
            return [...stack, { value: "0.", type: PressType.DecimalDot }];
        }
 
        default: return stack;
    }
}

function validateExpression(stack: Press[]): boolean {
    if (stack.length == 0) {
        return false;
    }
 
    let openParenthesesCount = 0;
    for (const p of stack) {
        if (p.value.endsWith("(")) openParenthesesCount++;
        else if (p.type == PressType.CloseParenthesis) openParenthesesCount--;
 
        if (openParenthesesCount < 0) {
            return false;
        }
    }
    if (openParenthesesCount != 0) {
        return false;
    }
 
    const lastPress = stack[stack.length - 1];
    return (
        lastPress.type == PressType.Number ||
        lastPress.type == PressType.DecimalDot ||
        lastPress.type == PressType.CloseParenthesis ||
        lastPress.type == PressType.InitialZero ||
        lastPress.type == PressType.Result
    );
}

export default function CalculatorBody() {
    const [pressStack, setPressStack] = React.useState<Press[]>([{ value: "0", type: PressType.InitialZero }]);
    const [invalidCount, setInvalidCount] = React.useState(0);

    const [evaluatedExpression, setEvaluatedExpression] = React.useState<string | null>(null);

    // A backend error message
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isEvaluating, setIsEvaluating] = React.useState(false);

    const evaluatingRef = React.useRef(false);
    const errorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const text = pressStack.map(press => press.value).join("");

    const clearErrorMessage = () => {
        if (errorTimerRef.current !== null) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }
        setErrorMessage(null);
    }

    const showErrorMessage = (message: string) => {
        clearErrorMessage();
        setErrorMessage(message);
        setInvalidCount(count => count + 1);
        errorTimerRef.current = setTimeout(() => {
            errorTimerRef.current = null;
            setErrorMessage(null);
        }, calculatorConfig.errorDisplayMs);
    }

    const buttonPress = (press: Press) => {
        if (evaluatingRef.current) return;
        clearErrorMessage();
        setEvaluatedExpression(null);
        setPressStack(prev => applyPress(prev, press));
    }

    const allClear = () => {
        if (evaluatingRef.current) return;
        clearErrorMessage();
        setEvaluatedExpression(null);
        setPressStack([{ value: "0", type: PressType.InitialZero }]);
    }

    const deleteButton = () => {
        if (evaluatingRef.current) return;
        clearErrorMessage();
        setEvaluatedExpression(null);

        if (pressStack[pressStack.length - 1]?.type == PressType.Result) {
            setPressStack([{ value: "0", type: PressType.InitialZero }]);
            return;
        }

        setPressStack(prev => prev.slice(0, -1));
    }

    const evaluate = async () => {
        if (evaluatingRef.current) return;
        clearErrorMessage();
        setEvaluatedExpression(null);

        if (!validateExpression(pressStack)) {
            setInvalidCount(count => count + 1);
            return;
        }

        // Parse differently if needed
        const expression = text;

        evaluatingRef.current = true;
        setIsEvaluating(true);
        const response = await evaluateExpression(expression);
        evaluatingRef.current = false;
        setIsEvaluating(false);

        if (response.ok) {
            setEvaluatedExpression(`${expression} =`);
            setPressStack([{ value: response.value, type: PressType.Result }]);
        } else {
            showErrorMessage(response.value);
        }
    }

    return (
        <div className="grid w-full max-w-md sm:max-w-lg grid-cols-5 grid-rows-7 gap-2 sm:gap-3 rounded-2xl bg-stone-200 p-3 sm:p-5 font-sans shadow-lg shadow-stone-900/10 ring-1 ring-stone-400/40">
            <div className="flex col-span-5 row-span-2 min-w-0">
                {/* Screen */}
                <CalculatorScreen
                    text={text}
                    evaluatedExpression={evaluatedExpression}
                    error={errorMessage}
                    invalidCount={invalidCount}
                    isEvaluating={isEvaluating}
                />
            </div>

            {/* Row 1 */}
            <CalculatorButton displayText="(" press={{ value: "(", type: PressType.OpenParenthesis }} buttonClick={buttonPress} variant="function" />
            <CalculatorButton displayText=")" press={{ value: ")", type: PressType.CloseParenthesis }} buttonClick={buttonPress} variant="function" />
            <CalculatorButton displayText="C" press={{ value: "C", type: PressType.None }} buttonClick={allClear} variant="function" />
            <CalculatorButton displayText={<DeleteIcon />} ariaLabel="Delete" press={{ value: "<-", type: PressType.None }} buttonClick={deleteButton} classNames="col-span-2" variant="function" />
 
            {/* Row 2 */}
            <CalculatorButton displayText="7" press={{ value: "7", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="8" press={{ value: "8", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="9" press={{ value: "9", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="+" press={{ value: " + ", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
            <CalculatorButton displayText="-" press={{ value: " - ", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
 
            {/* Row 3 */}
            <CalculatorButton displayText="4" press={{ value: "4", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="5" press={{ value: "5", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="6" press={{ value: "6", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="*" press={{ value: " * ", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
            <CalculatorButton displayText="/" press={{ value: " / ", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
 
            {/* Row 4 */}
            <CalculatorButton displayText="1" press={{ value: "1", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="2" press={{ value: "2", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="3" press={{ value: "3", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="^" press={{ value: "^", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
            <CalculatorButton displayText={<SquareRootIcon />} ariaLabel="Square root" press={{ value: "sqrt(", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
 
            {/* Row 5 */}
            <CalculatorButton displayText="." press={{ value: ".", type: PressType.DecimalDot }} buttonClick={buttonPress} />
            <CalculatorButton displayText="0" press={{ value: "0", type: PressType.Number }} buttonClick={buttonPress} />
            <CalculatorButton displayText="%" press={{ value: " % ", type: PressType.Operation }} buttonClick={buttonPress} variant="operator" />
            <CalculatorButton displayText="=" press={{ value: "=", type: PressType.None }} buttonClick={() => {evaluate()}} classNames="col-span-2" variant="equals" />
        </div>
    );
}