# How I Migrated a Legacy 3-Tier Application to Kubernetes on AWS with Zero Downtime

## 1. Problem Statement

Our e-commerce platform started as a classic 3-tier monolith running on EC2 instances behind an Application Load Balancer. As traffic grew from 100 to 10,000 concurrent users, we hit scalability limits. Deployments required 30-minute maintenance windows. A single bug could take down the entire platform. Scaling meant provisioning entire new EC2 instances regardless of which component was under load. Infrastructure costs were spiraling with 40% average resource utilization.

## 2. Legacy Architecture

The legacy system consisted of:
- Application Load Balancer distributing traffic across 3 EC2 instances
- Monolithic Node.js/Express application handling authentication, product catalog, shopping cart, and order processing
- Single RDS MySQL database handling all persistence
- Manual scaling with 30-minute deployment windows

**Key metrics from the monolith:**
- Average response time: 450ms
- P95 latency: 1.2s
- Error rate: 2.3%
- Cost: $1,847/month
- Deployment time: 30 minutes with downtime

## 3. Terraform Infrastructure Setup

We designed a modular Terraform configuration with separate modules for VPC, EKS, IAM, RDS, and Monitoring. The infrastructure spans 3 availability zones with public and private subnets, NAT gateways for outbound traffic, and a fully managed EKS cluster.

**Key decisions:**
- EKS managed node groups with t3.medium instances (scaling from 3 to 20)
- Multi-AZ RDS MySQL with automated backups and deletion protection
- AWS-managed Prometheus and Grafana workspaces
- OIDC provider for IRSA (IAM Roles for Service Accounts)

Terraform state is stored in an S3 bucket with DynamoDB locking — a critical pattern for team collaboration.

## 4. Breaking the Monolith

The monolith was decomposed into 5 microservices:

- **Frontend Service** (Node.js): Serves static assets, handles SSR
- **API Gateway** (Node.js): Routes requests, handles authentication, rate limiting
- **User Service** (Node.js): Authentication, user profiles
- **Product Service** (Node.js): Product catalog, search, categories
- **Order Service** (Node.js): Cart management, order processing, payments

Each service got its own Dockerfile, health checks, resource limits, and independent scaling configuration. The Strangler Fig pattern was used — new features were built as microservices while the monolith handled existing traffic until fully replaced.

## 5. Deploying to Amazon EKS

EKS provided a managed control plane with automatic upgrades and patching. Node groups were configured with cluster autoscaler to handle traffic spikes automatically.

**Deployment configuration:**
- 3 replicas per service (minimum)
- livenessProbe and readinessProbe on every container
- Pod Disruption Budgets ensuring at least 2 pods per service
- Horizontal Pod Autoscaler scaling based on CPU and memory
- ResourceQuotas per namespace preventing resource starvation

The ALB Ingress Controller handled external traffic with path-based routing to the appropriate service.

## 6. Blue-Green Deployments

Blue-green deployment minimized risk by running two identical environments simultaneously:

- **Blue (v1.0.0):** Current production environment
- **Green (v2.0.0):** New version being deployed

**Traffic shift process:**
1. Deploy green environment alongside blue
2. Route 90% blue / 10% green to validate
3. Shift to 50% / 50% after smoke tests pass
4. Route 100% to green once confirmed stable
5. Keep blue available for instant rollback

ALB weighted target groups made this seamless. Rollback is instantaneous by shifting weights back to blue.

## 7. Canary Releases

Argo Rollouts powered our canary deployment with automated analysis and promotion:

```
Step 1: Deploy canary (10% traffic)
Step 2: Pause 5 minutes — run smoke tests
Step 3: Increase to 25% traffic
Step 4: Pause 5 minutes — monitor error rates
Step 5: Increase to 50% traffic
Step 6: Pause 10 minutes — full analysis
Step 7: Increase to 75% traffic
Step 8: Promote to 100%
```

Prometheus queries analyzed success rates during each step. If error rates exceeded 5%, the rollout automatically aborted and routed all traffic back to the stable version.

## 8. Observability Stack

Our observability stack covered three pillars:

**Metrics (Prometheus + Grafana):**
- Application: request rate, error rate, latency (p50/p95/p99)
- Infrastructure: CPU, memory, disk, network
- Kubernetes: pod status, restarts, resource usage
- Business: active users, orders/minute, revenue

**Logs (Loki + Promtail):**
- Centralized log aggregation across all services
- Structured JSON logging with correlation IDs
- Log-based alerts for error spikes

**Alerts (AlertManager):**
- Critical: PodCrashLoopBackOff, NodeNotReady, High5xxErrors
- Warning: HighCPU, HighMemory, HighLatency
- Notifications via Slack and PagerDuty with proper routing

## 9. Chaos Engineering Results

LitmusChaos experiments validated our system's resilience:

| Experiment | Duration | Impact | Recovery Time | Result |
|------------|----------|--------|---------------|--------|
| Pod Kill (random) | 60s | One pod terminated | 15s | ✅ Zero downtime |
| Node Failure | 120s | Node drained | 45s | ✅ Pods rescheduled |
| Network Latency (2s) | 60s | Order service degraded | Immediate | ✅ Circuit breaker engaged |
| CPU Stress (2 cores) | 60s | Node under load | 30s | ✅ HPA scaled up |
| Memory Stress (80%) | 60s | Pod OOM risked | 20s | ✅ OOMKilled, restarted |

**Key finding:** The system maintained 100% availability during all experiments. PodDisruptionBudgets prevented simultaneous pod termination. HPA automatically scaled to maintain performance.

## 10. Cost Optimization Analysis

| Category | Legacy Monolith | EKS Microservices | Savings |
|----------|----------------|-------------------|---------|
| Compute | $972/month | $624/month | 36% |
| Database | $432/month | $432/month | 0% |
| Network | $324/month | $288/month | 11% |
| Storage | $119/month | $96/month | 19% |
| **Total** | **$1,847/month** | **$1,440/month** | **22%** |

**Additional efficiency gains:**
- Resource utilization: 40% → 72%
- Auto-scaling reduced idle capacity
- Right-sized instances based on actual usage
- Cost per request: $0.00018 → $0.00011

## 11. Performance Benchmarks

k6 load tests compared monolith vs. microservices:

| Metric | Monolith | Microservices | Improvement |
|--------|----------|---------------|-------------|
| Avg Response Time | 450ms | 180ms | 60% |
| P95 Latency | 1,200ms | 420ms | 65% |
| Max Throughput | 1,200 req/s | 5,400 req/s | 350% |
| Error Rate (1k users) | 2.3% | 0.1% | 96% |
| Error Rate (5k users) | 12.5% | 0.8% | 94% |
| Deployment Time | 30 min | 2 min | 93% |

## 12. Lessons Learned

1. **Start with proper resource limits** — Under-provisioned pods cause cascading failures
2. **Test chaos early** — Find weaknesses before production incidents
3. **Invest in observability upfront** — Debugging without metrics is blind
4. **PodDisruptionBudgets are non-negotiable** — They prevent deployment disasters
5. **Canary everything** — Even database migrations should be canaried
6. **Automate rollbacks** — Manual rollbacks take too long during incidents
7. **Right-size continuously** — Workloads change, instance types should too
8. **Monitor costs from day one** — Cloud costs grow fast without governance

## 13. Future Improvements

- **Service Mesh (Istio):** Fine-grained traffic control, mTLS, and advanced canary capabilities
- **Database per Service:** Complete data isolation with separate RDS instances
- **Event-Driven Architecture:** Kafka/SQS for async order processing
- **GitOps:** ArgoCD for declarative continuous delivery
- **Multi-Region:** Active-active deployment for disaster recovery
- **AI-Driven Autoscaling:** Predictive scaling based on traffic patterns

---

*Built with ❤️ using Terraform, EKS, Kubernetes, ArgoCD, Prometheus, Grafana, and LitmusChaos.*
