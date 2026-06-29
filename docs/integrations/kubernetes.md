# Kubernetes Integration

Integrating the DEML platform into your Kubernetes cluster lets microservices stream telemetry and request predictions through our API Gateway without leaving your cluster boundary.

## Architecture Options

| Pattern | Best for | Latency | Ops overhead |
|---------|----------|---------|--------------|
| **Sidecar proxy** | Per-pod inference + ingest | Lowest | Medium |
| **Cluster gateway** | Shared ingress for many services | Low | Low |
| **CRD / Operator** _(roadmap)_ | Declarative pipeline provisioning | Low | Lowest at scale |

## Sidecar Proxy Pattern (Recommended)

Deploy a lightweight sidecar alongside your application pods. The sidecar injects your API key, handles rate-limit backoff, and forwards traffic to `/api/v1/predict` and `/api/v1/ingest`.

### 1. Store your API key in a Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: deml-platform-credentials
  namespace: production
type: Opaque
stringData:
  api-key: YOUR_API_KEY
```

### 2. Configure the sidecar in your Pod spec

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-inference-service
  labels:
    app: ml-inference
spec:
  containers:
    - name: app
      image: your-registry/inference-app:latest
      env:
        - name: DEML_GATEWAY_URL
          value: "http://127.0.0.1:8080"
    - name: deml-sidecar
      image: ghcr.io/deml/sidecar-proxy:latest
      ports:
        - containerPort: 8080
      env:
        - name: DEML_UPSTREAM_URL
          value: "https://backend.deml.app/api/v1"
        - name: DEML_API_KEY
          valueFrom:
            secretKeyRef:
              name: deml-platform-credentials
              key: api-key
```

Your application calls `http://127.0.0.1:8080/predict` locally; the sidecar adds authentication and forwards to DEML.

### 3. Verify connectivity

```bash
kubectl exec -it ml-inference-service -c app -- \
  curl -s http://127.0.0.1:8080/health
```

Check integration status from your cluster (optional health endpoint):

```bash
curl https://backend.deml.app/api/v1/integrations/kubernetes \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Cluster Gateway Pattern

For shared access across namespaces, expose a single internal Service that proxies to DEML:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: deml-gateway
  namespace: platform
spec:
  selector:
    app: deml-gateway
  ports:
    - port: 443
      targetPort: 8443
```

Point workloads at `https://deml-gateway.platform.svc.cluster.local` and mount the API key via External Secrets or GCP Secret Manager.

## Telemetry Ingest from Kubernetes

Stream pod metrics, request logs, or custom events to `/api/v1/ingest`:

```bash
curl -X POST https://backend.deml.app/api/v1/ingest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "kubernetes",
    "cluster_id": "prod-us-east-1",
    "records": [
      {"pod": "inference-7f8b", "latency_ms": 42, "status": 200}
    ]
  }'
```

Events flow through Redpanda → telemetry workers → your analytics dashboard in real time.

## Roadmap: Kubernetes Operator

We are developing a native **MLPlatform CRD** so you can declare inference routes and ingestion pipelines in Git:

```yaml
apiVersion: deml.app/v1
kind: InferenceRoute
metadata:
  name: sla-model
spec:
  modelVersion: v2
  replicas: 3
  tenantId: YOUR_TENANT_UUID
```

Subscribe to release notes for operator availability.
