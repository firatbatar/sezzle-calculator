package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"maps"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testOrigin = "http://localhost:3000"

// Kept separate from evaluateResponse so a change to the wire format fails the tests.
type responseBody struct {
	Value *float64 `json:"value"`
	Msg   *string  `json:"msg"`
}

func newTestServer() *Server {
	return NewServer(log.New(io.Discard, "", 0), testOrigin)
}

func newRequest(t *testing.T, method, target, body string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req
}

func expressionBody(t *testing.T, expr string) string {
	t.Helper()
	body, err := json.Marshal(map[string]string{"expression": expr})
	if err != nil {
		t.Fatalf("marshalling request body: %v", err)
	}
	return string(body)
}

func serve(t *testing.T, s *Server, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

func decodeBody[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decoding response body %q: %v", rec.Body.String(), err)
	}
	return v
}

func nullable[T any](p *T) string {
	if p == nil {
		return "null"
	}
	return fmt.Sprintf("%#v", *p)
}

func headerListContains(value, token string) bool {
	for item := range strings.SplitSeq(value, ",") {
		if strings.TrimSpace(item) == token {
			return true
		}
	}
	return false
}

func TestRouting(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		target     string
		wantStatus int
	}{
		{"health check", http.MethodGet, "/healthz", http.StatusOK},
		{"health check with wrong method", http.MethodPost, "/healthz", http.StatusMethodNotAllowed},
		{"evaluate with wrong method", http.MethodGet, "/evaluate", http.StatusMethodNotAllowed},
		{"unknown path", http.MethodGet, "/no-such-route", http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := serve(t, newTestServer(), newRequest(t, tt.method, tt.target, ""))

			if rec.Code != tt.wantStatus {
				t.Fatalf("%s %s status = %d, want %d", tt.method, tt.target, rec.Code, tt.wantStatus)
			}
		})
	}
}

func TestHealth(t *testing.T) {
	rec := serve(t, newTestServer(), newRequest(t, http.MethodGet, "/healthz", ""))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("Content-Type = %q, want %q", got, "application/json")
	}

	got := decodeBody[map[string]string](t, rec)
	want := map[string]string{"status": "ok"}
	if !maps.Equal(got, want) {
		t.Fatalf("body = %v, want %v", got, want)
	}
}
