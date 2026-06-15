# Production Lessons Learned

## Architecture Decisions

### 1. Service Granularity
- Started with 5 services; avoid over-splitting
- Each service owns its data domain
- API gateway handles cross-cutting concerns

### 2. Database Strategy
- Single shared RDS initially, then per-service databases
- Connection pooling critical for MySQL under load
- Multi-AZ deployment essential for production

### 3. Kubernetes Resource Management
- Set proper requests/limits from day one
- HPA prevents cascading failures
- PDB ensures deployment availability

## Performance Optimizations

### 1. Container Image Optimization
- Multi-stage Docker builds reduced image sizes by 60%
- Alpine base images minimized attack surface
- Proper layer caching cut build times by 70%

### 2. ALB Configuration
- Connection idle timeout: 60s
- Deregistration delay: 30s
- Slow start duration: 60s for new targets

### 3. Caching Strategy
- Redis cluster for session caching
- CDN for static assets
- Application-level caching for product catalog

## Pitfalls Encountered

### 1. IAM Role Propagation
- Role changes took 5-10 minutes to propagate
- Solution: Create roles during infrastructure setup

### 2. DNS Propagation
- Route53 changes delayed canary testing
- Solution: Use weighted records with health checks

### 3. Resource Limits
- Default Kubernetes limits too generous
- Solution: Enforce ResourceQuotas per namespace

## Monitoring Insights

### 1. Alert Fatigue
- Started with 50+ alerts, reduced to 15 actionable ones
- Critical alerts page-duty, warnings to Slack

### 2. Logging Strategy
- Structured JSON logs simplified Loki queries
- Added correlation IDs across services

### 3. Metrics That Matter
- Focus on SLOs: latency, error rate, throughput
- Business metrics: conversion rate, revenue

## Cost Optimization

### 1. Right-Sizing
- Used VPA recommendations for initial sizing
- Switched to HPA after baseline established
- Spot instances for non-critical workloads

### 2. Storage Optimization
- GP3 volumes with IOPS provisioning
- Automated snapshot cleanup
- S3 lifecycle policies for logs

### 3. Network Costs
- NAT Gateway primary cost driver
- Reduced cross-AZ traffic with pod topology
- CloudFront edge caching
