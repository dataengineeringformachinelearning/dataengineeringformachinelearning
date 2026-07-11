#!/bin/sh
# Ensure Railway (and other host) volumes are writable for RustFS.
# Official image user is rustfs (UID/GID 10001); BusyBox setpriv is incompatible,
# so we chown then prefer runuser, else start as root after chown (volume is safe).
set -eu

mkdir -p /data /logs

if id rustfs >/dev/null 2>&1; then
  chown -R rustfs:rustfs /data /logs 2>/dev/null || chown -R 10001:10001 /data /logs || true
else
  chown -R 10001:10001 /data /logs || true
fi

if command -v runuser >/dev/null 2>&1 && id rustfs >/dev/null 2>&1; then
  exec runuser -u rustfs -- /usr/bin/rustfs "$@"
fi

if command -v su-exec >/dev/null 2>&1; then
  exec su-exec 10001:10001 /usr/bin/rustfs "$@"
fi

if command -v gosu >/dev/null 2>&1; then
  exec gosu 10001:10001 /usr/bin/rustfs "$@"
fi

# Volume is chowned; start the server (root fallback when no drop-privilege helper).
exec /usr/bin/rustfs "$@"
