# Zero-Downtime Migration

[![Deploy](https://github.com/karthikk022/zero-downtime-migration/actions/workflows/deploy.yml/badge.svg)](https://github.com/karthikk022/zero-downtime-migration/actions/workflows/deploy.yml)

Production-grade simulation of migrating a legacy monolith to Kubernetes microservices on AWS EKS with zero downtime. Full observability, chaos engineering, cost analysis, and CI/CD included.

## Architecture

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚              AWS EKS Cluster             â”‚
                    â”‚                                         â”‚
                    â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”‚
                    â”‚  â”‚ Ingress  â”‚  â”‚   HPA    â”‚            â”‚
                    â”‚  â”‚Controllerâ”‚  â”‚ Autoscalerâ”‚            â”‚
                    â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
                    â”‚       â”‚                                  â”‚
                    â”‚  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
                    â”‚  â”‚      API Gateway (Kong)       â”‚      â”‚
                    â”‚  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
                    â”‚       â”‚        â”‚        â”‚               â”‚
                    â”‚  â”Œâ”€â”€â”€â”€â”´â”€â”€â” â”Œâ”€â”€â”€â”´â”€â”€â”€â” â”Œâ”€â”€â”´â”€â”€â”€â”€â”        â”‚
                    â”‚  â”‚ User  â”‚ â”‚ Order â”‚ â”‚Productâ”‚         â”‚
                    â”‚  â”‚Serviceâ”‚ â”‚Serviceâ”‚ â”‚Serviceâ”‚         â”‚
                    â”‚  â””â”€â”€â”€â”¬â”€â”€â”€â”˜ â””â”€â”€â”€â”¬â”€â”€â”€â”˜ â””â”€â”€â”€â”¬â”€â”€â”€â”˜        â”‚
                    â”‚      â”‚         â”‚         â”‚              â”‚
                    â”‚  â”Œâ”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”        â”‚
                    â”‚  â”‚    RDS â”‚ ElastiCache â”‚ S3  â”‚        â”‚
                    â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚              â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”
                    â”‚Prometheus  â”‚  â”‚    Loki       â”‚
                    â”‚ + Grafana  â”‚  â”‚  + Promtail   â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Features

| Capability | Tool | Description |
|------------|------|-------------|
| Infrastructure as Code | Terraform | EKS, VPC, RDS, ElastiCache across 3 environments |
| Microservices | Node.js/Express | 5 services: API Gateway, User, Order, Product, Frontend |
| Blue-Green Deploy | ArgoCD + Nginx | Zero-downtime blue-green with traffic shifting |
| Canary Deploy | Istio | Progressive canary with metrics-based promotion |
| Chaos Engineering | Litmus | Pod delete, network partition, CPU/memory stress |
| Observability | Prometheus + Grafana + Loki | Full metrics, logs, and alerting |
| Auto-Remediation | Python + Alertmanager | SLO breach triggers auto-scale/restart/rollback |
| Cost Analysis | Custom dashboards | Per-service cost tracking and optimization |
| Security | Network Policies + PDB | Pod disruption budgets, resource quotas, network isolation |
| CI/CD | GitHub Actions | Automated build, test, deploy on push |
| Load Testing | k6 | Sustained load tests for migration validation |

## Project Structure

```
zero-downtime-migration/
â”œâ”€â”€ .github/workflows/       # CI/CD automation
â”‚   â””â”€â”€ deploy.yml           # Build â†’ Test â†’ Deploy pipeline
â”œâ”€â”€ terraform/               # Infrastructure as Code
â”‚   â”œâ”€â”€ main.tf              # Root module configuration
â”‚   â”œâ”€â”€ variables.tf         # Input variables
â”‚   â”œâ”€â”€ outputs.tf           # Output values
â”‚   â”œâ”€â”€ environments/        # dev / staging / prod configs
â”‚   â””â”€â”€ modules/             # Reusable Terraform modules
â”œâ”€â”€ k8s/                     # Kubernetes manifests
â”‚   â”œâ”€â”€ namespaces/          # Namespace isolation
â”‚   â”œâ”€â”€ hpa/                 # Horizontal Pod Autoscaler
â”‚   â”œâ”€â”€ ingress/             # Ingress controller config
â”‚   â”œâ”€â”€ network-policies/    # Network segmentation
â”‚   â”œâ”€â”€ pdb/                 # Pod Disruption Budgets
â”‚   â””â”€â”€ resource-quotas.yaml # Resource quota enforcement
â”œâ”€â”€ microservices/           # Application code
â”‚   â”œâ”€â”€ api-gateway/         # Kong API gateway
â”‚   â”œâ”€â”€ frontend/            # React frontend
â”‚   â”œâ”€â”€ user-service/        # User management
â”‚   â”œâ”€â”€ order-service/       # Order processing
â”‚   â””â”€â”€ product-service/     # Product catalog
â”œâ”€â”€ monolith/                # Legacy monolith code
â”œâ”€â”€ blue-green/              # Blue-green deployment configs
â”œâ”€â”€ canary/                  # Canary deployment configs
â”œâ”€â”€ chaos/                   # Litmus chaos experiments
â”‚   â””â”€â”€ litmus/              # Chaos fault definitions
â”œâ”€â”€ auto-healing/            # Auto-remediation scripts
â”‚   â””â”€â”€ scripts/             # Python auto-heal handlers
â”œâ”€â”€ observability/           # Monitoring stack
â”‚   â”œâ”€â”€ prometheus/          # Prometheus rules & config
â”‚   â”œâ”€â”€ grafana/             # Grafana dashboards
â”‚   â”œâ”€â”€ loki/                # Loki log aggregation
â”‚   â”œâ”€â”€ promtail/            # Promtail log shipping
â”‚   â””â”€â”€ alertmanager/        # Alertmanager routing
â”œâ”€â”€ helm-charts/             # Helm chart definitions
â”œâ”€â”€ cost-analysis/           # Cost tracking
â”‚   â”œâ”€â”€ dashboards/          # Cost visualization
â”‚   â”œâ”€â”€ scripts/             # Cost calculation scripts
â”‚   â””â”€â”€ package.json         # Cost analysis dependencies
â”œâ”€â”€ load-testing/            # k6 load test scripts
â”œâ”€â”€ docs/                    # Architecture documentation
â”œâ”€â”€ blog/                    # Migration blog posts
â””â”€â”€ docker-compose.integration.yml  # Local integration testing
```

## Migration Strategy

### Phase 1: Strangler Fig Pattern
- Deploy monolith alongside microservices
- Route traffic gradually via API Gateway
- Validate each service independently

### Phase 2: Blue-Green Cutover
- Run blue (old) and green (new) environments simultaneously
- Switch traffic atomically with zero downtime
- Rollback capability within seconds

### Phase 3: Canary Promotion
- Route 5% â†’ 10% â†’ 50% â†’ 100% traffic to new services
- Monitor error rates and latency at each step
- Automatic rollback if SLO breach detected

### Phase 4: Chaos Validation
- Inject pod failures, network partitions, CPU stress
- Verify auto-healing and resilience
- Validate observability captures all failure modes

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI | >= 2.0 | EKS, S3, RDS management |
| Terraform | >= 1.5 | Infrastructure provisioning |
| kubectl | >= 1.28 | Kubernetes cluster management |
| Helm | >= 3.12 | Chart deployments |
| ArgoCD | >= 2.8 | GitOps continuous delivery |
| k6 | >= 0.47 | Load testing |

## Quick Start

### 1. Provision Infrastructure

```bash
cd terraform
terraform init
terraform plan -var="environment=dev"
terraform apply -var="environment=dev"
```

### 2. Configure kubectl

```bash
aws eks update-kubeconfig --name zero-downtime-dev --region ap-south-1
```

### 3. Deploy Observability Stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring
helm install loki grafana/loki -n monitoring
helm install promtail grafana/promtail -n monitoring
```

### 4. Deploy Microservices

```bash
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/resource-quotas.yaml
kubectl apply -f k8s/network-policies/
kubectl apply -f k8s/pdb/
kubectl apply -f k8s/hpa/
kubectl apply -f k8s/ingress/
```

### 5. Run Load Test

```bash
cd load-testing
k6 run migration-test.js --vus 100 --duration 10m
```

### 6. Run Chaos Experiments

```bash
cd chaos/litmus
kubectl apply -f pod-delete.yaml
kubectl apply -f network-partition.yaml
kubectl apply -f cpu-stress.yaml
```

## Environments

| Environment | Instance | Nodes | Monthly Cost | Purpose |
|-------------|----------|-------|--------------|---------|
| dev | m6i.large | 2 | ~$200 | Development & testing |
| staging | m6i.xlarge | 3-8 | ~$500 | Pre-production validation |
| prod | m6i.2xlarge | 5-15 | ~$3,000 | Production workloads |

## Observability

### Prometheus Metrics
- Service request rate, latency (p50/p95/p99), error rate
- Kubernetes pod/container metrics
- Custom business metrics (orders/min, users/min)

### Grafana Dashboards
- Infrastructure overview (CPU, memory, network)
- Service-level SLI/SLO dashboards
- Migration progress tracking

### Loki + Promtail
- Centralized log aggregation
- Structured logging from all microservices
- Log-based alerting for error patterns

### Alertmanager Rules
| Alert | Threshold | Action |
|-------|-----------|--------|
| HighErrorRate | > 5% in 5min | Auto-rollback |
| HighLatency | p99 > 2s for 5min | Scale up pods |
| PodCrashLooping | > 3 restarts in 10min | Restart deployment |
| SLOBreach | Availability < 99.9% | Page on-call |

## Auto-Remediation

| SLO Breach | Trigger | Remediation |
|------------|---------|-------------|
| API Availability < 99.9% | Prometheus alert | Scale replicas 2â†’5 + restart |
| Error Rate > 5% | Alertmanager webhook | Rollback to previous version |
| Latency p99 > 2s | Custom metric | Scale HPA max 10â†’20 pods |

## CI/CD Pipeline

A GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to `main`:

| Job | Trigger | Action |
|-----|---------|--------|
| `terraform` | Push to `terraform/` | fmt â†’ validate â†’ plan â†’ apply |
| `deploy-k8s` | Push to `k8s/` or `microservices/` | Build â†’ Push â†’ Deploy via Helm |
| `argo-sync` | After `deploy-k8s` | Sync ArgoCD applications + wait for health |

## Chaos Engineering

### Litmus Experiments

| Experiment | Fault | Duration | Expected Behavior |
|------------|-------|----------|-------------------|
| pod-delete | Kill random pods | 5min | Auto-restart, no downtime |
| network-partition | Block pod-to-pod traffic | 3min | Graceful degradation |
| cpu-stress | 100% CPU for 5min | 5min | HPA scales up, service recovers |
| memory-stress | 512MB memory spike | 3min | OOMKill â†’ restart â†’ recover |
| disk-fill | Fill /tmp to 90% | 5min | Alert fires, pod evicted |

## Cost Optimization

- Lambda functions use appropriate memory sizes (128MB-512MB)
- DynamoDB on-demand billing for unpredictable workloads
- S3 lifecycle policies for DLQ cleanup
- CloudWatch log retention set to 14 days
- EventBridge archive retention limited to 7 days

## Security

- **OPA/Gatekeeper**: 7 policies enforced (no privileged containers, no latest tag, probes required, etc.)
- **Checkov**: Terraform/K8s/Dockerfile misconfiguration scanning
- **Trivy**: Container vulnerability scanning (HIGH/CRITICAL only)
- **Network Policies**: Pod-to-pod communication restricted
- **Resource Quotas**: Namespace-level resource limits
- **Pod Disruption Budgets**: Prevent voluntary disruptions during migrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/migration-improvement`)
3. Commit your changes (`git commit -m 'Add migration improvement'`)
4. Push to the branch (`git push origin feature/migration-improvement`)
5. Open a Pull Request

## License

MIT License

---

Built with Terraform, Kubernetes, ArgoCD, Litmus, Prometheus, Grafana, Loki, and GitHub Actions.
