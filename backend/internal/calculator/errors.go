package calculator

import "errors"

var (
	ErrEmptyExpression   = errors.New("expression is empty")
	ErrInvalidCharacter  = errors.New("expression contains an invalid character")
	ErrInvalidSyntax     = errors.New("expression is not valid")
	ErrUnbalancedParens  = errors.New("parentheses are not balanced")
	ErrExpressionTooLong = errors.New("expression is too long")

	ErrDivisionByZero  = errors.New("division by zero")
	ErrNegativeRoot    = errors.New("square root of a negative number")
	ErrResultNotFinite = errors.New("result is not a finite number")
)
