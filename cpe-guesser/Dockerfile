# Builder stage
FROM golang:1.22-alpine AS builder

# Install git for fetching the module
RUN apk add --no-cache git

WORKDIR /src

# Clone and build the cpe-guesser from source to ensure we have a verifiable build
RUN git clone https://github.com/vulnerability-lookup/cpe-guesser.git . && \
    CGO_ENABLED=0 go build -ldflags="-s -w" -o cpe-guesser .

# Production stage (Secure distroless base)
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

# Copy the statically compiled binary from the builder
COPY --from=builder /src/cpe-guesser /app/cpe-guesser

# Enforce non-root execution
USER nonroot:nonroot

# Expose default API port for cpe-guesser
EXPOSE 1323

# Start the server
ENTRYPOINT ["/app/cpe-guesser"]
CMD ["server"]
