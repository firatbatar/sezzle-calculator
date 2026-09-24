BINARY := server.out
BUILD_DIR := bin
CMD := ./cmd/server
PORT ?= 8000

TESTFLAGS := ${if ${V},-v,} -count=1

.PHONY: run build test cover cover-html check clean

run:
	PORT=$(PORT) go run $(CMD)

build: check
	CGO_ENABLED=0 go build -o ${BUILD_DIR}/${BINARY} ${CMD}

test:
	go test ${TESTFLAGS} ./...

check:
	gofmt -l .
	go vet ./...
	go test ${TESTFLAGS} ./...

clean:
	@rm -rf ${BUILD_DIR}