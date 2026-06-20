# Kubernetes Integration

Integrating our ML Platform natively into your Kubernetes cluster allows your existing microservices to easily stream data or request predictions via our API Gateway.

## Architecture: The Sidecar Proxy Pattern

For the most robust integration, we recommend deploying a lightweight Sidecar Proxy (e.g., Envoy or a custom lightweight Go binary) alongside your pods. This proxy handles the API key injection, rate limiting backoff, and secure connection to our `/api/v1/predict` and `/api/v1/ingest` endpoints.

### Setup Instructions

1. **Store your API Key in a Secret:**

   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: ml-platform-credentials
   type: Opaque
   data:
     api-key: <base64-encoded-key>
   ```

2. **Deploy the Sidecar (Example Pod Spec):**
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: my-app
   spec:
     containers:
       - name: my-app-container
         image: my-app-image
         env:
           - name: ML_GATEWAY_URL
             value: "http://localhost:8001" # Talks to sidecar
       - name: ml-platform-sidecar
         image: ml-platform-sidecar:latest
         env:
           - name: UPSTREAM_URL
             value: "https://your-domain.com/api/v1"
           - name: API_KEY
             valueFrom:
               secretKeyRef:
                 name: ml-platform-credentials
                 key: api-key
   ```

### Future Enhancements

We are currently developing a native **Kubernetes Operator** (`MLPlatform CRD`) that will allow you to dynamically provision inference routes and data pipelines declaratively.
