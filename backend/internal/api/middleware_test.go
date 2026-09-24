package api

import (
	"bytes"
	"log"
	"net/http"
	"strconv"
	"strings"
	"testing"
)

func TestCORSPreflight(t *testing.T) {
	tests := []struct {
		name   string
		target string
	}{
		{"evaluate", "/evaluate"},
		{"unknown path", "/no-such-route"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newRequest(t, http.MethodOptions, tt.target, "")
			req.Header.Set("Origin", testOrigin)
			req.Header.Set("Access-Control-Request-Method", http.MethodPost)
			req.Header.Set("Access-Control-Request-Headers", "content-type")

			rec := serve(t, newTestServer(), req)

			if rec.Code != http.StatusNoContent {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
			}
			if rec.Body.Len() != 0 {
				t.Fatalf("body = %q, want empty", rec.Body.String())
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
				t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, testOrigin)
			}
			if got := rec.Header().Get("Access-Control-Allow-Methods"); !headerListContains(got, http.MethodPost) {
				t.Fatalf("Access-Control-Allow-Methods = %q, want it to include %q", got, http.MethodPost)
			}
			if got := rec.Header().Get("Access-Control-Allow-Headers"); !headerListContains(got, "Content-Type") {
				t.Fatalf("Access-Control-Allow-Headers = %q, want it to include %q", got, "Content-Type")
			}
		})
	}
}

func TestCORSOnSimpleRequest(t *testing.T) {
	tests := []struct {
		name   string
		origin string
	}{
		{"with Origin header", testOrigin},
		{"without Origin header", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newRequest(t, http.MethodPost, "/evaluate", expressionBody(t, "1 + 1"))
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			rec := serve(t, newTestServer(), req)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
			}
			body := decodeBody[responseBody](t, rec)
			if body.Value == nil || *body.Value != 2 {
				t.Fatalf("value = %s, want 2", nullable(body.Value))
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
				t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, testOrigin)
			}
		})
	}
}

func TestLoggingMiddleware(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		target     string
		body       string
		wantStatus int
	}{
		{"successful evaluation", http.MethodPost, "/evaluate", `{"expression": "1 + 1"}`, http.StatusOK},
		{"calculator error from handler", http.MethodPost, "/evaluate", `{"expression": "1 / 0"}`, http.StatusUnprocessableEntity},
		{"method not allowed from mux", http.MethodGet, "/evaluate", "", http.StatusMethodNotAllowed},
		{"preflight from CORS middleware", http.MethodOptions, "/evaluate", "", http.StatusNoContent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			s := NewServer(log.New(&buf, "", 0), testOrigin)

			rec := serve(t, s, newRequest(t, tt.method, tt.target, tt.body))

			if rec.Code != tt.wantStatus {
				t.Fatalf("response status = %d, want %d", rec.Code, tt.wantStatus)
			}

			// "METHOD PATH STATUS DURATION"; the duration is not checked.
			line := buf.String()
			fields := strings.Fields(line)
			if len(fields) < 3 {
				t.Fatalf("log line %q has too few fields", line)
			}
			if fields[0] != tt.method {
				t.Fatalf("logged method = %q, want %q (line %q)", fields[0], tt.method, line)
			}
			if fields[1] != tt.target {
				t.Fatalf("logged path = %q, want %q (line %q)", fields[1], tt.target, line)
			}
			if want := strconv.Itoa(tt.wantStatus); fields[2] != want {
				t.Fatalf("logged status = %q, want %q (line %q)", fields[2], want, line)
			}
		})
	}
}
