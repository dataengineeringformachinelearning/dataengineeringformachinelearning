#!/bin/sh
# Ensure Railway (and other host) volumes are writable by the rustfs runtime user.
set -eu

mkdir -p /data /logs

# Prefer ownership by the image's non-root user (UID/GID 10001).
if id rustfs >/dev/null 2>&1; then
  chown -R rustfs:rustfs /data /logs 2>/dev/null || chown -R 10001:10001 /data /logs || true
else
  chown -R 10001:10001 /data /logs || true
fi

# Drop privileges when possible.
if command -v runuser >/dev/null 2>&1 && id rustfs >/dev/null 2>&1; then
  exec runuser -u rustfs -- /usr/bin/rustfs "$@"
fi
if command -v setpriv >/dev/null 2>&1; then
  exec setpriv --reuid=10001 --regid=10001 --clear-groups /usr/bin/rustfs "$@"
fi

# Fallback: run as root only if we cannot drop privileges (volume still usable).
exec /usr/bin/rustfs "$@"
