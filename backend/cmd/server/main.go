package main

import (
	"log"
	"net/http"
	"os"

	"github.com/firatbatar/sezzle-calculator/backend/internal/api"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	logger := log.New(os.Stdout, "", log.LstdFlags|log.Lmsgprefix)
	srv := api.NewServer(logger, allowedOrigins)

	addr := ":" + port
	logger.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, srv); err != nil {
		logger.Fatalf("server error: %v", err)
	}
}
