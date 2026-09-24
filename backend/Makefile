BINARY := server.out
BUILD_DIR := bin
CMD := ./cmd/server
PORT ?= 8000
COVER_PROFILE := coverage.out
COVER_HTML := coverage.html

TESTFLAGS := ${if ${V},-v,} ${if ${COVER}, -cover,} -count=1

.PHONY: run build test cover cover-html check clean

run:
	PORT=$(PORT) go run $(CMD)

build: check
	CGO_ENABLED=0 go build -o ${BUILD_DIR}/${BINARY} ${CMD}

test:
	go test ${TESTFLAGS} ./...

cover:
	go test -count=1 -coverprofile=${COVER_PROFILE} ./...
	go tool cover -func=${COVER_PROFILE}

cover-html: cover
	go tool cover -html=${COVER_PROFILE} -o ${COVER_HTML}

check:
	gofmt -l .
	go vet ./...
	go test ${TESTFLAGS} ./...

clean:
	@rm -rf ${BUILD_DIR} ${COVER_PROFILE} ${COVER_HTML}