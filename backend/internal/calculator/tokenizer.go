package calculator

import (
	"strconv"
	"strings"
)

const maxExpressionLength = 256

type tokenType int

const (
	tNumber tokenType = iota
	tPlus
	tMinus
	tStar
	tSlash
	tPercent
	tCaret
	tSqrt
	tLParen
	tRParen
	// Evaluator only
	tUnaryPlus
	tUnaryMinus
)

type token struct {
	tType tokenType
	value float64
}

var singleCharTokenMap = map[byte]tokenType{
	'+': tPlus,
	'-': tMinus,
	'*': tStar,
	'/': tSlash,
	'%': tPercent,
	'^': tCaret,
	'(': tLParen,
	')': tRParen,
}

func tokenize(input string) ([]token, error) {
	if len(input) > maxExpressionLength {
		return nil, ErrExpressionTooLong
	}

	var tokens []token

	for i := 0; i < len(input); {
		c := input[i]

		if c == ' ' || c == '\t' || c == '\n' {
			i++
			continue
		}

		if (c >= '0' && c <= '9') || c == '.' {
			tok, nextIdx, err := getNumberLexeme(input, i)
			if err != nil {
				return nil, err
			}

			tokens = append(tokens, tok)
			i = nextIdx
			continue
		}

		if strings.HasPrefix(input[i:], "sqrt(") {
			tokens = append(tokens, token{tType: tSqrt})
			i += 5
			continue
		}

		tok, ok := singleCharTokenMap[c]
		if !ok {
			return nil, ErrInvalidCharacter
		}

		tokens = append(tokens, token{tType: tok})
		i++
	}

	if len(tokens) == 0 {
		return nil, ErrEmptyExpression
	}
	return tokens, nil
}

func getNumberLexeme(input string, startIdx int) (token, int, error) {
	i := startIdx
	digitCount, dotCount := 0, 0

	for i < len(input) && ((input[i] >= '0' && input[i] <= '9') || input[i] == '.') {
		if input[i] == '.' {
			dotCount++
		} else {
			digitCount++
		}
		i++
	}

	if digitCount == 0 || dotCount > 1 {
		return token{}, startIdx, ErrInvalidSyntax
	}

	numStr := input[startIdx:i]
	if numStr[0] == '.' {
		numStr = "0" + numStr
	}
	if numStr[len(numStr)-1] == '.' {
		numStr = numStr + "0"
	}

	val, err := strconv.ParseFloat(numStr, 64)
	if err != nil {
		// too large for 64-bits
		return token{}, startIdx, ErrInvalidSyntax
	}

	return token{tType: tNumber, value: val}, i, nil
}
