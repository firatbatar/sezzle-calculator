package calculator

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

func TestTokenize(t *testing.T) {
	tests := []struct {
		name  string
		given string
		want  []token
	}{
		{
			name:  "single number",
			given: "42",
			want:  []token{{tType: tNumber, value: 42}},
		},
		{
			name:  "decimal number",
			given: "4.7",
			want:  []token{{tType: tNumber, value: 4.7}},
		},
		{
			name:  "trailing decimal point is normalised",
			given: "12.",
			want:  []token{{tType: tNumber, value: 12}},
		},
		{
			name:  "leading decimal point is normalised",
			given: ".42",
			want:  []token{{tType: tNumber, value: 0.42}},
		},
		{
			name:  "whitespace is discarded",
			given: "  1   +\t2\n",
			want: []token{
				{tType: tNumber, value: 1},
				{tType: tPlus},
				{tType: tNumber, value: 2},
			},
		},
		{
			name:  "all operators",
			given: "1+2-3*4/5%6^7",
			want: []token{
				{tType: tNumber, value: 1},
				{tType: tPlus},
				{tType: tNumber, value: 2},
				{tType: tMinus},
				{tType: tNumber, value: 3},
				{tType: tStar},
				{tType: tNumber, value: 4},
				{tType: tSlash},
				{tType: tNumber, value: 5},
				{tType: tPercent},
				{tType: tNumber, value: 6},
				{tType: tCaret},
				{tType: tNumber, value: 7},
			},
		},
		{
			name:  "sqrt and parentheses",
			given: "sqrt(42)",
			want: []token{
				{tType: tSqrt},
				{tType: tNumber, value: 42},
				{tType: tRParen},
			},
		},
		{
			name:  "negative number inside parentheses",
			given: "(-47)",
			want: []token{
				{tType: tLParen},
				{tType: tMinus},
				{tType: tNumber, value: 47},
				{tType: tRParen},
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			res, err := tokenize(test.given)
			if err != nil {
				t.Fatalf("tokenize(%q) returned unexpected error: %v", test.given, err)
			}
			if !reflect.DeepEqual(res, test.want) {
				t.Fatalf("tokenize(%q) = %v, want %v", test.given, res, test.want)
			}
		})
	}
}

func TestTokenizeErrors(t *testing.T) {
	tests := []struct {
		name  string
		given string
		want  error
	}{
		{"empty input", "", ErrEmptyExpression},
		{"whitespace only", "   ", ErrEmptyExpression},
		{"unknown character", "1 & 2", ErrInvalidCharacter},
		{"letters", "1 + abc", ErrInvalidCharacter},
		{"two decimal points", "1.2.3", ErrInvalidSyntax},
		{"lone decimal point", ".", ErrInvalidSyntax},
		{"over length limit", strings.Repeat("1", maxExpressionLength+1), ErrExpressionTooLong},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := tokenize(test.given)
			if !errors.Is(err, test.want) {
				t.Fatalf("tokenize(%q) error = %v, want %v", test.given, err, test.want)
			}
		})
	}
}
