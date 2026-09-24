package api

import (
	"net/http"
	"time"
)

func (server *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", server.allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (server *Server) logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		holder := &httpStatusHolder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(holder, r)

		server.log.Printf("%s %s %d %s", r.Method, r.URL.Path, holder.status, time.Since(start).Round(time.Microsecond))
	})
}

type httpStatusHolder struct {
	http.ResponseWriter
	status int
}

func (r *httpStatusHolder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}
