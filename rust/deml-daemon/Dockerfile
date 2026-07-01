# Use the full Bookworm image so we have cmake, libssl-dev, etc. for rdkafka.
FROM rust:1.85-bookworm AS builder

# librdkafka build requirements (cmake-build feature compiles librdkafka from source).
# ca-certificates is needed for crates.io TLS during `cargo fetch`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    libssl-dev \
    libsasl2-dev \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ── Dependency cache layer ────────────────────────────────────────────────────
# Copy only manifests first so Docker can cache the `cargo build` dependency
# compilation step independently from source changes.
COPY rust/Cargo.toml rust/Cargo.lock* ./
COPY rust/deml-daemon/Cargo.toml deml-daemon/Cargo.toml

# Build a stub binary to pre-compile all dependencies.
RUN mkdir -p deml-daemon/src \
    && echo 'fn main() {}' > deml-daemon/src/main.rs \
    && cargo build --release -p deml-daemon \
    && rm -rf deml-daemon/src \
    && rm -f target/release/deml-daemon target/release/deps/deml_daemon*

# ── Application build ─────────────────────────────────────────────────────────
COPY rust/deml-daemon/src deml-daemon/src
RUN cargo build --release -p deml-daemon

# ── Stage 2: minimal runtime ─────────────────────────────────────────────────
# debian:bookworm-slim gives us apt for exact shared-lib installation while
# remaining ~80 MB. Migrate to distroless/cc when all required .so files are
# confirmed (libsasl2 availability in distroless/cc-debian12 varies by build).
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 \
    libsasl2-2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Run as non-root (aligns with platform unprivileged container policy).
RUN groupadd --gid 10001 deml \
    && useradd --uid 10001 --gid deml --no-create-home --shell /usr/sbin/nologin deml

COPY --from=builder /build/target/release/deml-daemon /usr/local/bin/deml-daemon

USER deml

ENTRYPOINT ["/usr/local/bin/deml-daemon"]
