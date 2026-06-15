# Resume Bullet Points

## Infrastructure & DevOps

- Designed and deployed a production-grade AWS EKS cluster using modular Terraform with 5+ reusable modules (VPC, EKS, IAM, RDS, Monitoring)
- Reduced infrastructure deployment time from days to 15 minutes with Infrastructure as Code and S3-backed Terraform state with DynamoDB locking
- Implemented auto-scaling infrastructure with Cluster Autoscaler and HPA, achieving 72% resource utilization (up from 40%)
- Secured infrastructure with IAM Roles for Service Accounts (IRSA), OIDC provider, network policies, and Secrets Manager

## Microservices & Kubernetes

- Refactored a monolithic Node.js e-commerce application into 5 independently scalable microservices with Docker containers
- Reduced deployment time from 30 minutes with downtime to 2 minutes zero-downtime using Kubernetes rolling updates
- Improved application resilience with PodDisruptionBudgets, liveness/readiness probes, and resource quotas across namespaces
- Achieved 60% reduction in average response time (450ms → 180ms) through microservices architecture

## CI/CD & Release Engineering

- Built a complete CI/CD pipeline with GitHub Actions including build, test, security scanning (Trivy), and automated deployment
- Implemented Argo Rollouts for canary deployments with automated Prometheus-based analysis and rollback
- Executed blue-green deployments with weighted ALB traffic shifting (90/10 → 50/50 → 100/0)

## Observability & Monitoring

- Deployed comprehensive observability stack (Prometheus, Grafana, Loki, Promtail, AlertManager)
- Created 4 Grafana dashboards covering application, infrastructure, cost, and deployment metrics
- Configured alerting with severity-based routing to Slack and PagerDuty
- Achieved 99.9% uptime with automated alerting and incident response

## Chaos Engineering & Reliability

- Implemented LitmusChaos experiments validating system resilience during pod failures, node failures, network latency, and resource stress
- Maintained 100% application availability during all chaos experiments
- Developed automated failure simulator with Python testing pod kill, deployment scaling, and network partition scenarios

## Cost Optimization

- Reduced monthly infrastructure costs by 22% ($1,847 → $1,440) through right-sizing and auto-scaling
- Analyzed cost data using AWS Cost Explorer API and Grafana cost dashboards
- Optimized container resource limits reducing compute costs by 36%
