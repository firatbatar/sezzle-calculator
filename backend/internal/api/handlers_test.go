package api

import (
	"net/http"
	"strings"
	"testing"

	"github.com/firatbatar/sezzle-calculator/backend/internal/calculator"
)

const invalidJSONMsg = "request body is not valid JSON"

func TestEvaluateSuccess(t *testing.T) {
	// Only check that the result is carried through the HTTP layer intact.
	tests := []struct {
		name string
		expr string
		want float64
	}{
		{"addition", "1 + 2", 3},
		{"subtraction", "5 - 8", -3},
		{"multiplication", "6 * 7", 42},
		{"division", "7 / 2", 3.5},
		{"percentage", "200 % 10", 20},
		{"exponent", "2 ^ 10", 1024},
		{"nested parentheses", "2 * (3 + (4 - 1))", 12},
		{"sqrt", "sqrt(9 + 16)", 5},
		{"unary minus", "-(2 + 3)", -5},
		{"decimals", "2.5 * 1.5", 3.75},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newRequest(t, http.MethodPost, "/evaluate", expressionBody(t, tt.expr))
			rec := serve(t, newTestServer(), req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, http.StatusOK, rec.Body.String())
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}

			body := decodeBody[responseBody](t, rec)
			if body.Value == nil {
				t.Fatalf("value = null, want %v", tt.want)
			}
			if *body.Value != tt.want {
				t.Fatalf("value = %v, want %v", *body.Value, tt.want)
			}
			if body.Msg != nil {
				t.Fatalf("msg = %q, want null", *body.Msg)
			}
		})
	}
}

func TestEvaluateResponseFieldsAreExplicitNulls(t *testing.T) {
	// responseBody cannot tell a null field from a missing one, so check the
	// raw keys: both are always present and the unused one is null.
	tests := []struct {
		name      string
		expr      string
		nullField string
		setField  string
	}{
		{"success has null msg", "1 + 1", "msg", "value"},
		{"failure has null value", "1 / 0", "value", "msg"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newRequest(t, http.MethodPost, "/evaluate", expressionBody(t, tt.expr))
			body := decodeBody[map[string]any](t, serve(t, newTestServer(), req))

			if v, ok := body[tt.nullField]; !ok || v != nil {
				t.Fatalf("%q = %v (present: %t), want present and null", tt.nullField, v, ok)
			}
			if v, ok := body[tt.setField]; !ok || v == nil {
				t.Fatalf("%q = %v (present: %t), want present and non-null", tt.setField, v, ok)
			}
		})
	}
}

func TestEvaluateMalformedBody(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{"not JSON", "expression=1+1"},
		{"truncated object", `{"expression": "1+1"`},
		{"empty body", ""},
		{"expression is a number", `{"expression": 5}`},
		{"bare array", `["1+1"]`},
		{"bare string", `"1+1"`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, newTestServer(), newRequest(t, http.MethodPost, "/evaluate", tt.body))

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
			}

			body := decodeBody[responseBody](t, rec)
			if body.Value != nil {
				t.Fatalf("value = %v, want null", *body.Value)
			}
			if body.Msg == nil || *body.Msg != invalidJSONMsg {
				t.Fatalf("msg = %s, want %q", nullable(body.Msg), invalidJSONMsg)
			}
		})
	}
}

func TestEvaluateBodyWithoutExpression(t *testing.T) {
	// These all decode without error and leave Expression as "", so the
	// rejection comes from the evaluator rather than the decoder.
	tests := []struct {
		name string
		body string
	}{
		{"empty object", `{}`},
		{"null expression", `{"expression": null}`},
		{"null body", `null`},
		{"only unknown fields", `{"expr": "1+1"}`},
	}

	want := calculator.ErrEmptyExpression.Error()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, newTestServer(), newRequest(t, http.MethodPost, "/evaluate", tt.body))

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
			}

			body := decodeBody[responseBody](t, rec)
			if body.Value != nil {
				t.Fatalf("value = %v, want null", *body.Value)
			}
			if body.Msg == nil || *body.Msg != want {
				t.Fatalf("msg = %s, want %q", nullable(body.Msg), want)
			}
		})
	}
}

func TestEvaluateTooLongExpression(t *testing.T) {
	tests := []struct {
		name    string
		exprLen int
	}{
		{"body within maxBodyBytes", maxBodyBytes - 64},
		{"body over maxBodyBytes", maxBodyBytes},
	}

	want := calculator.ErrExpressionTooLong.Error()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody := expressionBody(t, strings.Repeat("1", tt.exprLen))
			rec := serve(t, newTestServer(), newRequest(t, http.MethodPost, "/evaluate", reqBody))

			if rec.Code != http.StatusRequestEntityTooLarge {
				t.Fatalf("status = %d, want %d (request body %d bytes)", rec.Code, http.StatusRequestEntityTooLarge, len(reqBody))
			}

			body := decodeBody[responseBody](t, rec)
			if body.Value != nil {
				t.Fatalf("value = %v, want null", *body.Value)
			}
			if body.Msg == nil || *body.Msg != want {
				t.Fatalf("msg = %s, want %q", nullable(body.Msg), want)
			}
		})
	}
}

func TestEvaluateErrorMapping(t *testing.T) {
	tests := []struct {
		name       string
		expr       string
		wantStatus int
		wantErr    error
	}{
		{"empty expression", "", http.StatusBadRequest, calculator.ErrEmptyExpression},
		{"invalid character", "2 & 3", http.StatusBadRequest, calculator.ErrInvalidCharacter},
		{"invalid syntax", "1 + * 2", http.StatusBadRequest, calculator.ErrInvalidSyntax},
		{"unbalanced parentheses", "(1 + 2", http.StatusBadRequest, calculator.ErrUnbalancedParens},
		{"expression too long", strings.Repeat("1+", 150) + "1", http.StatusRequestEntityTooLarge, calculator.ErrExpressionTooLong},
		{"division by zero", "1 / 0", http.StatusUnprocessableEntity, calculator.ErrDivisionByZero},
		{"negative square root", "sqrt(-4)", http.StatusUnprocessableEntity, calculator.ErrNegativeRoot},
		{"non-finite result", "10 ^ 400", http.StatusUnprocessableEntity, calculator.ErrResultNotFinite},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newRequest(t, http.MethodPost, "/evaluate", expressionBody(t, tt.expr))
			rec := serve(t, newTestServer(), req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantStatus)
			}
			if got := rec.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}

			body := decodeBody[responseBody](t, rec)
			if body.Value != nil {
				t.Fatalf("value = %v, want null", *body.Value)
			}
			// The sentinel messages are all non-empty, so equality also
			// rules out an empty or generic msg.
			if body.Msg == nil || *body.Msg != tt.wantErr.Error() {
				t.Fatalf("msg = %s, want %q", nullable(body.Msg), tt.wantErr.Error())
			}
		})
	}
}
