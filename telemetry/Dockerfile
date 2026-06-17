FROM otel/opentelemetry-collector-contrib:0.97.0

# Copy the collector configuration
COPY otel-collector-config.yaml /etc/otel-collector-config.yaml

# Expose OTLP gRPC and HTTP ports
EXPOSE 4317 4318

USER 10001
CMD ["--config=/etc/otel-collector-config.yaml"]
