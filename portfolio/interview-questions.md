# Interview Questions

## AWS & Infrastructure

### Q: How did you handle Terraform state management?
**A:** We used S3 as the backend with DynamoDB for state locking. This prevented concurrent modifications and provided a single source of truth. We structured modules for reusability across dev and prod environments.

### Q: Why EKS over self-managed Kubernetes?
**A:** EKS provides a managed control plane with automatic upgrades, patching, and high availability. It integrates natively with AWS services (ALB, IAM, CloudWatch). This reduced our operational overhead significantly.

### Q: How did you secure the cluster?
**A:** Network policies for pod-level security, IAM Roles for Service Accounts (IRSA) for fine-grained permissions, Secrets Manager for database credentials, and security groups restricting traffic to necessary ports only.

## Kubernetes

### Q: How did you achieve zero-downtime deployments?
**A:** Combined strategies: PodDisruptionBudgets ensuring minimum available pods, readinessProbe delaying traffic until pods are healthy, preStop hooks for graceful shutdown, and rolling update strategy with maxSurge/maxUnavailable.

### Q: How did you handle database migrations?
**A:** We used the Strangler Fig pattern — new schema changes were backward compatible. Migrations ran as Kubernetes jobs before deployment. Canary deployments ensured only a subset of traffic hit the new schema initially.

### Q: Explain your auto-scaling strategy.
**A:** Two levels: HPA scales pods within a node group based on CPU/memory metrics. Cluster Autoscaler adds/removes nodes when pods are unschedulable. This ensures cost-efficient scaling without manual intervention.

## CI/CD

### Q: How does your canary release work?
**A:** Argo Rollouts manages the canary process. A new version receives 10% traffic, then automatic analysis checks error rates via Prometheus queries. If success rate >95%, it progressively increases traffic through defined steps (25%, 50%, 75%, 100%). Any failure triggers automatic rollback.

### Q: How did you implement blue-green on AWS?
**A:** Two identical target groups (blue/green) behind the ALB. Weighted forwarding rules control traffic distribution. We shift 90/10, validate, then 50/50, then 100% to green. The old blue target group remains for instant rollback.

## Observability

### Q: What metrics do you track?
**A:** Golden signals: latency (p50/p95/p99), traffic (requests/sec), errors (5xx rate), saturation (CPU/memory utilization). Additionally: pod restarts, deployment frequency, change failure rate, and business metrics like order conversion rate.

### Q: How did you set up alerting?
**A:** Prometheus rules evaluate every 30 seconds. Critical alerts (pod crash, node failure, high error rate) routed to PagerDuty. Warnings (high CPU/memory) sent to Slack. We use inhibition rules to prevent alert storms.

## Chaos Engineering

### Q: What chaos experiments did you run?
**A:** Pod kill (random pod termination), node failure (drain nodes), network latency (2s delay injection), CPU stress (hog 2 cores), memory stress (80% consumption). All verified with health probes during experiments.

### Q: What was the most surprising finding?
**A:** Network latency injection revealed a race condition in our order service that only manifested under 2s+ delays. This would never have been caught in normal testing. Fixing it improved P95 latency by 30%.

## Cost Optimization

### Q: How did you reduce costs?
**A:** Right-sizing instances based on actual usage, auto-scaling reducing idle capacity, switching to gp3 storage, and using spot instances for non-critical batch workloads. Cost explorer API data fed into Grafana dashboards for visibility.
