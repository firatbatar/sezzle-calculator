package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/firatbatar/sezzle-calculator/backend/internal/calculator"
)

const maxBodyBytes = 4 << 10

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleEvaluate(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	var req evaluateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, failure("request body is not valid JSON"))
		return
	}

	result, err := calculator.Evaluate(req.Expression)
	if err != nil {
		status := getHttpStatusFromErr(err)
		if status == http.StatusInternalServerError {
			s.log.Printf("evaluating %q: %v", req.Expression, err)
			s.writeJSON(w, status, failure("internal server error"))
			return
		}
		s.writeJSON(w, status, failure(err.Error()))
		return
	}

	s.writeJSON(w, http.StatusOK, success(result))
}

func getHttpStatusFromErr(err error) int {
	switch {
	case errors.Is(err, calculator.ErrEmptyExpression),
		errors.Is(err, calculator.ErrInvalidCharacter),
		errors.Is(err, calculator.ErrInvalidSyntax),
		errors.Is(err, calculator.ErrUnbalancedParens):
		return http.StatusBadRequest

	case errors.Is(err, calculator.ErrExpressionTooLong):
		return http.StatusRequestEntityTooLarge

	case errors.Is(err, calculator.ErrDivisionByZero),
		errors.Is(err, calculator.ErrNegativeRoot),
		errors.Is(err, calculator.ErrResultNotFinite):
		return http.StatusUnprocessableEntity

	default:
		return http.StatusInternalServerError
	}
}
