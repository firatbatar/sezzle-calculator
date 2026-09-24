FROM golang:1.27.1-alpine3.24 AS builder
WORKDIR /src

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM alpine:3.24.2
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app app
COPY --from=builder /out/server /usr/local/bin/server
USER 10001:10001
EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/server"]
