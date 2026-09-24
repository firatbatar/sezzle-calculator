package calculator

import (
	"errors"
	"math"
	"strings"
	"testing"
)

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want float64
	}{
		// Basic arithmetic
		{"addition", "1 + 2", 3},
		{"subtraction", "5 - 8", -3},
		{"multiplication", "6 * 7", 42},
		{"division", "10 / 4", 2.5},
		{"single number", "42", 42},
		{"single number in parentheses", "(1)", 1},

		// Precedence and associativity
		{"multiplication before addition", "2 + 3 * 4", 14},
		{"parentheses override precedence", "(2 + 3) * 4", 20},
		{"subtraction is left associative", "10 - 3 - 2", 5},
		{"division is left associative", "100 / 5 / 2", 10},
		{"exponent is right associative", "2 ^ 3 ^ 2", 512},
		{"exponent binds tighter than multiplication", "2 * 3 ^ 2", 18},
		{"exponent binds tighter than division", "8 / 2 ^ 2", 2},

		// Unary operators
		{"leading negation", "-5", -5},
		{"leading plus", "+5", 5},
		{"negation after a binary operator", "3 * -2", -6},
		{"negation of a parenthesised group", "-(3 + 2)", -5},
		{"negation inside parentheses", "(-5) + 3", -2},
		{"subtraction of a negative", "10 - -5", 15},
		{"double negation", "--5", 5},
		{"negation binds looser than exponent", "-2 ^ 2", -4},
		{"negated exponent", "2 ^ -2", 0.25},

		// Square root
		{"sqrt of a literal", "sqrt(9)", 3},
		{"sqrt of zero", "sqrt(0)", 0},
		{"sqrt of an expression", "sqrt(2 + 7)", 3},
		{"nested sqrt", "sqrt(sqrt(16))", 2},
		{"sqrt within arithmetic", "1 + sqrt(16) * 2", 9},
		{"sqrt as an exponent base", "sqrt(4) ^ 2", 4},
		{"negated sqrt", "-sqrt(4)", -2},

		// Percentage: "X % Y" means Y percent of X
		{"percentage of a number", "100 % 30", 30},
		{"percentage in a sum", "10 + 100 % 30", 40},
		{"percentage is left associative", "100 % 30 % 50", 15},
		{"percentage shares multiplicative precedence", "2 * 100 % 30", 60},
		{"percentage of a larger number", "200 + 200 % 10", 220},

		// Structure and formatting
		{"deeply nested parentheses", "((((1 + 1))))", 2},
		{"whitespace is irrelevant", "  1+\t2 * ( 3 - 1 )\n", 5},
		{"trailing decimal point", "5. + 1", 6},
		{"leading decimal point", ".5 * 4", 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.expr)
			if err != nil {
				t.Fatalf("Evaluate(%q) returned unexpected error: %v", tt.expr, err)
			}
			if !closeEnough(got, tt.want) {
				t.Fatalf("Evaluate(%q) = %v, want %v", tt.expr, got, tt.want)
			}
		})
	}
}

func TestEvaluateErrors(t *testing.T) {
	tests := []struct {
		name string
		expr string
		want error
	}{
		// Mathematically undefined
		{"division by zero", "1 / 0", ErrDivisionByZero},
		{"division by a zero expression", "1 / (5 - 5)", ErrDivisionByZero},
		{"negative square root", "sqrt(-1)", ErrNegativeRoot},
		{"negative square root of an expression", "sqrt(3 - 10)", ErrNegativeRoot},
		{"zero to a negative power", "0 ^ -1", ErrResultNotFinite},
		{"overflow to infinity", "9 ^ 9 ^ 9", ErrResultNotFinite},

		// Malformed expressions
		{"trailing operator", "1 +", ErrInvalidSyntax},
		{"lone operator", "*", ErrInvalidSyntax},
		{"lone sign", "-", ErrInvalidSyntax},
		{"two binary operators", "1 * * 2", ErrInvalidSyntax},
		{"adjacent operands", "1 2", ErrInvalidSyntax},
		{"operand before a group", "2 (3)", ErrInvalidSyntax},
		{"operand after a group", "(1)2", ErrInvalidSyntax},
		{"empty group", "()", ErrInvalidSyntax},
		{"trailing operator inside a group", "(1 +)", ErrInvalidSyntax},
		{"empty sqrt", "sqrt()", ErrInvalidSyntax},

		// Unbalanced parentheses
		{"unclosed parenthesis", "(1 + 2", ErrUnbalancedParens},
		{"unopened parenthesis", "1 + 2)", ErrUnbalancedParens},
		{"partially closed parentheses", "((1 + 2)", ErrUnbalancedParens},
		{"unclosed sqrt", "sqrt(4", ErrUnbalancedParens},

		// Lexical errors, propagated from tokenize
		{"empty expression", "", ErrEmptyExpression},
		{"whitespace only", "   ", ErrEmptyExpression},
		{"unknown character", "1 & 2", ErrInvalidCharacter},
		{"sqrt without a parenthesis", "sqrt 9", ErrInvalidCharacter},
		{"two decimal points", "1.2.3", ErrInvalidSyntax},
		{"over the length limit", strings.Repeat("1+", maxExpressionLength) + "1", ErrExpressionTooLong},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Evaluate(tt.expr)
			if !errors.Is(err, tt.want) {
				t.Fatalf("Evaluate(%q) error = %v, want %v (result %v)", tt.expr, err, tt.want, got)
			}
		})
	}
}

// closeEnough compares two results with a relative tolerance.
func closeEnough(got, want float64) bool {
	if got == want {
		return true
	}

	const epsilon = 1e-9
	diff := math.Abs(got - want)
	if want == 0 {
		return diff < epsilon
	}
	return diff/math.Abs(want) < epsilon
}
