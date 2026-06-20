FROM clickhouse/clickhouse-server:24.3

# Copy the custom XML configuration for ClickHouse
COPY clickhouse-config.xml /etc/clickhouse-server/config.d/custom-config.xml
COPY users.xml /etc/clickhouse-server/users.d/users.xml

# Ensure correct permissions
RUN chmod 644 /etc/clickhouse-server/config.d/custom-config.xml && \
    chmod 644 /etc/clickhouse-server/users.d/users.xml

# Expose HTTP and Native ports
EXPOSE 8123 9000
