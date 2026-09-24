package api

import (
	"encoding/json"
	"log"
	"net/http"
)

type Server struct {
	log            *log.Logger
	handler        http.Handler
	allowedOrigins string
}

func NewServer(logger *log.Logger, allowedOrigins string) *Server {
	s := &Server{
		log:            logger,
		allowedOrigins: allowedOrigins,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("POST /evaluate", s.handleEvaluate)

	s.handler = s.logging(s.cors(mux))
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		s.log.Printf("marshalling response: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"value":null,"msg":"internal server error"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(body); err != nil {
		s.log.Printf("writing response: %v", err)
	}
}
