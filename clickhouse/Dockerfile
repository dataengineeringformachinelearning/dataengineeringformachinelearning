FROM clickhouse/clickhouse-server:24.3

# Copy the custom XML configuration for ClickHouse
COPY clickhouse-config.xml /etc/clickhouse-server/config.d/custom-config.xml

# Ensure correct permissions
RUN chmod 644 /etc/clickhouse-server/config.d/custom-config.xml

# Expose HTTP and Native ports
EXPOSE 8123 9000

USER clickhouse
CMD ["clickhouse-server", "--config-file=/etc/clickhouse-server/config.xml"]
