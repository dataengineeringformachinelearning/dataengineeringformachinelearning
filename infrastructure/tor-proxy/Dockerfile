# Ultra-secure, minimal Alpine-based Tor Proxy
FROM alpine:3.19

# Install Tor and clear cache to minimize image size
RUN apk add --no-cache tor

# We must switch to the non-root 'tor' user created by the package manager
USER tor

# Expose the default Tor SOCKS port
EXPOSE 9050

# Run Tor in the foreground
CMD ["tor"]
