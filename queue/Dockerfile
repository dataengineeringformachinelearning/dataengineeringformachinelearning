FROM redpandadata/redpanda:v26.1.9

# We bake the configuration directly into the image's CMD to completely 
# bypass Railway's custom start command shell parsing quirks.

# Breakdown of arguments:
# - smp 1 & memory 2G: Prevents OOM Segmentation Faults on Railway's 8GB limit
# - kafka-addr: Listens on port 9092 on all interfaces
# - advertise-kafka-addr: Tells clients to connect via the Railway internal network

# Expose the Kafka port so Railway registers this service on the internal DNS
EXPOSE 9092

CMD ["redpanda", "start", \
     "--mode", "dev-container", \
     "--smp", "1", \
     "--memory", "2G", \
     "--kafka-addr", "PLAINTEXT://0.0.0.0:9092", \
     "--advertise-kafka-addr", "PLAINTEXT://deml-queue.railway.internal:9092"]
