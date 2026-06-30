FROM otel/opentelemetry-collector-contrib:0.97.0

# Railway-provided variables override these defaults. Keeping sane defaults prevents
# the collector from crash-looping during config expansion if cleanup prunes a var.
ENV CLICKHOUSE_HOST=deml-clickhouse.internal \
    CLICKHOUSE_PORT=8123 \
    CLICKHOUSE_USER=default \
    CLICKHOUSE_PASSWORD="" \
    CLICKHOUSE_DB=otel

# Copy the collector configuration
COPY otel-collector-config.yaml /etc/otel-collector-config.yaml

# Expose OTLP gRPC and HTTP ports
EXPOSE 4317 4318

USER 10001
CMD ["--config=/etc/otel-collector-config.yaml"]
