import { describe, expect, it } from "vitest";
import { applyPress, PressType, validateExpression, type Press } from "@/components/CalculatorBody";

// Mirrors the presses wired to each button in CalculatorBody, so the token
// values under test stay exactly what the UI produces.
const BUTTONS: Record<string, Press> = {
    "0": { value: "0", type: PressType.Number },
    "1": { value: "1", type: PressType.Number },
    "2": { value: "2", type: PressType.Number },
    "3": { value: "3", type: PressType.Number },
    "4": { value: "4", type: PressType.Number },
    "5": { value: "5", type: PressType.Number },
    "6": { value: "6", type: PressType.Number },
    "7": { value: "7", type: PressType.Number },
    "8": { value: "8", type: PressType.Number },
    "9": { value: "9", type: PressType.Number },
    "+": { value: " + ", type: PressType.Operation },
    "-": { value: " - ", type: PressType.Operation },
    "*": { value: " * ", type: PressType.Operation },
    "/": { value: " / ", type: PressType.Operation },
    "%": { value: " % ", type: PressType.Operation },
    "^": { value: "^", type: PressType.Operation },
    "sqrt": { value: "sqrt(", type: PressType.Operation },
    "(": { value: "(", type: PressType.OpenParenthesis },
    ")": { value: ")", type: PressType.CloseParenthesis },
    ".": { value: ".", type: PressType.DecimalDot },
    "C": { value: "C", type: PressType.None },
};

const initialStack: Press[] = [{ value: "0", type: PressType.InitialZero }];
const result = (value: string): Press[] => [{ value, type: PressType.Result }];

const foldFrom = (stack: Press[], ...labels: string[]): Press[] =>
    labels.reduce((current, label) => applyPress(current, BUTTONS[label]), stack);

/** Presses a sequence of buttons on a fresh calculator. */
const fold = (...labels: string[]): Press[] => foldFrom(initialStack, ...labels);

/** The string the screen shows and the backend receives. */
const display = (stack: Press[]): string => stack.map(press => press.value).join("");

describe("applyPress", () => {
    describe("after a result", () => {
        it("continues the result with an operator", () => {
            expect(display(foldFrom(result("8"), "+"))).toBe("8 + ");
            expect(display(foldFrom(result("8"), "+", "3"))).toBe("8 + 3");
        });

        it("wraps a negative result in parentheses before continuing", () => {
            expect(display(foldFrom(result("-8"), "*"))).toBe("(-8) * ");
        });

        it("starts a fresh expression on sqrt( rather than continuing", () => {
            expect(display(foldFrom(result("8"), "sqrt"))).toBe("sqrt(");
        });

        it("ignores a closing parenthesis", () => {
            expect(display(foldFrom(result("8"), ")"))).toBe("8");
        });

        it("starts a new expression on a digit, ( or .", () => {
            expect(display(foldFrom(result("8"), "7"))).toBe("7");
            expect(display(foldFrom(result("8"), "("))).toBe("(");
            expect(display(foldFrom(result("8"), "."))).toBe("0.");
        });
    });

    describe("implicit multiplication", () => {
        it("inserts * after a closing parenthesis", () => {
            expect(display(fold("(", "2", ")", "3"))).toBe("(2) * 3");
            expect(display(fold("(", "2", ")", "("))).toBe("(2) * (");
            expect(display(fold("(", "2", ")", "sqrt"))).toBe("(2) * sqrt(");
            expect(display(fold("(", "2", ")", "."))).toBe("(2) * 0.");
        });

        it("inserts * between a number and an opening parenthesis", () => {
            expect(display(fold("2", "("))).toBe("2 * (");
            expect(display(fold("2", "sqrt"))).toBe("2 * sqrt(");
        });

        it("inserts * between a decimal point and an opening parenthesis", () => {
            expect(display(fold(".", "("))).toBe("0. * (");
            expect(display(fold(".", "sqrt"))).toBe("0. * sqrt(");
        });
    });

    describe("initial zero", () => {
        it("is replaced by a digit, (, sqrt(, . or -", () => {
            expect(display(fold("7"))).toBe("7");
            expect(display(fold("("))).toBe("(");
            expect(display(fold("sqrt"))).toBe("sqrt(");
            expect(display(fold("."))).toBe("0.");
            expect(display(fold("-"))).toBe("-");
        });

        it("is kept before + and the other binary operators", () => {
            expect(display(fold("+"))).toBe("0 + ");
            expect(display(fold("*"))).toBe("0 * ");
        });
    });

    describe("lone zero", () => {
        it("is replaced when it is the whole number", () => {
            expect(display(fold("5", "+", "0", "7"))).toBe("5 + 7");
            expect(display(fold("(", "0", "7"))).toBe("(7");
        });

        it("is kept when it is part of a longer number", () => {
            expect(display(fold("1", "0", "7"))).toBe("107");
            expect(display(fold(".", "0", "7"))).toBe("0.07");
        });
    });

    describe("rejected input", () => {
        it("ignores an operator other than + or - after another operator, after ( and on an empty stack", () => {
            expect(display(fold("5", "+", "*"))).toBe("5 + ");
            expect(display(fold("(", "*"))).toBe("(");
            expect(display(foldFrom([], "*"))).toBe("");
        });

        it("ignores ) when nothing is open", () => {
            expect(display(fold("5", ")"))).toBe("5");
            expect(display(fold("sqrt", "4", ")", ")"))).toBe("sqrt(4)");
        });

        it("ignores ) straight after ( or after an operator", () => {
            expect(display(fold("(", ")"))).toBe("(");
            expect(display(fold("(", "5", "+", ")"))).toBe("(5 + ");
        });

        it("ignores a second decimal point in the same number", () => {
            expect(display(fold("1", ".", "5", "."))).toBe("1.5");
            expect(display(fold(".", "."))).toBe("0.");
        });

        it("accepts a decimal point in the next number", () => {
            expect(display(fold("1", ".", "5", "+", "."))).toBe("1.5 + 0.");
            expect(display(fold("(", "1", ".", "5", ")", "*", "2", "."))).toBe("(1.5) * 2.");
        });

        it("ignores presses that carry no expression token", () => {
            expect(display(fold("5", "C"))).toBe("5");
        });
    });

    describe("sqrt(", () => {
        it("counts as an opening parenthesis for the ) guard", () => {
            expect(display(fold("sqrt", "4", ")"))).toBe("sqrt(4)");
        });

        it("follows an operator or ( without implicit multiplication", () => {
            expect(display(fold("5", "+", "sqrt"))).toBe("5 + sqrt(");
            expect(display(fold("(", "sqrt"))).toBe("(sqrt(");
            expect(display(foldFrom([], "sqrt"))).toBe("sqrt(");
        });

        it("is allowed straight after another sqrt(", () => {
            expect(display(fold("sqrt", "sqrt", "9"))).toBe("sqrt(sqrt(9");
        });
    });

    describe("unary sign", () => {
        it("is inserted without spaces after an operator, (, sqrt( or on an empty stack", () => {
            expect(display(fold("5", "*", "-", "3"))).toBe("5 * -3");
            expect(display(fold("2", "^", "-", "3"))).toBe("2^-3");
            expect(display(fold("(", "-", "3"))).toBe("(-3");
            expect(display(fold("sqrt", "+"))).toBe("sqrt(+");
            expect(display(foldFrom([], "-"))).toBe("-");
            expect(display(foldFrom([], "+"))).toBe("+");
        });

        it("is followed like any operator", () => {
            expect(display(fold("-", "("))).toBe("-(");
            expect(display(fold("-", "sqrt"))).toBe("-sqrt(");
            expect(display(fold("-", "."))).toBe("-0.");
            expect(display(fold("5", "*", "-", "0", "7"))).toBe("5 * -7");
        });

        it("ignores ) and operators other than + or - after it", () => {
            expect(display(fold("(", "-", ")"))).toBe("(-");
            expect(display(fold("5", "*", "-", "/"))).toBe("5 * -");
        });
    });

    describe("sign toggle", () => {
        it("replaces a binary + or - with the pressed sign, keeping its spaces", () => {
            expect(display(fold("5", "+", "-"))).toBe("5 - ");
            expect(display(fold("5", "-", "+"))).toBe("5 + ");
            expect(display(fold("5", "-", "-"))).toBe("5 - ");
            expect(display(foldFrom(result("8"), "+", "-"))).toBe("8 - ");
        });

        it("replaces a unary sign with the pressed sign, without spaces", () => {
            expect(display(fold("3", "+", "(", "-", "+"))).toBe("3 + (+");
            expect(display(fold("5", "*", "-", "+", "2"))).toBe("5 * +2");
            expect(display(fold("-", "+"))).toBe("+");
            expect(display(fold("-", "-"))).toBe("-");
        });
    });
});

describe("validateExpression", () => {
    it("rejects an empty stack", () => {
        expect(validateExpression([])).toBe(false);
    });

    it("rejects unbalanced openers", () => {
        expect(validateExpression(fold("(", "5"))).toBe(false);
        expect(validateExpression(fold("sqrt", "4"))).toBe(false);
        expect(validateExpression(fold("5", "*", "("))).toBe(false);
    });

    it("rejects a closing parenthesis before any opener", () => {
        // applyPress cannot build this, so the stack is assembled by hand
        expect(validateExpression([BUTTONS[")"], BUTTONS["5"]])).toBe(false);
    });

    it("rejects a trailing operator", () => {
        expect(validateExpression(fold("5", "+"))).toBe(false);
        expect(validateExpression(fold("5", "^"))).toBe(false);
        expect(validateExpression(fold("5", "*", "-"))).toBe(false);
        expect(validateExpression(fold("-"))).toBe(false);
    });

    it("accepts every valid trailing token", () => {
        expect(validateExpression(initialStack)).toBe(true);
        expect(validateExpression(fold("1", "2"))).toBe(true);
        expect(validateExpression(fold("1", "."))).toBe(true);
        expect(validateExpression(fold("(", "2", ")"))).toBe(true);
        expect(validateExpression(result("8"))).toBe(true);
    });

    it("accepts a balanced nested expression", () => {
        expect(validateExpression(fold("(", "2", "+", "3", ")", "*", "4"))).toBe(true);
        expect(validateExpression(fold("sqrt", "1", "6", ")"))).toBe(true);
        expect(validateExpression(fold("-", "(", "-", "3", ")"))).toBe(true);
    });
});
