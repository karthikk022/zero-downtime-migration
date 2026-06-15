# Troubleshooting Guide

## Common Issues

### 1. Terraform State Lock Issues

```
Error: Error acquiring the state lock
```

```bash
# Force unlock
terraform force-unlock LOCK_ID

# Or delete lock from DynamoDB
aws dynamodb delete-item \
  --table-name zero-downtime-tfstate-lock \
  --key '{"LockID": {"S": "terraform.tfstate"}}'
```

### 2. EKS Node Group Not Joining

```bash
# Check cluster status
aws eks describe-cluster --name zero-downtime-cluster

# Check node group
aws eks describe-nodegroup \
  --cluster-name zero-downtime-cluster \
  --nodegroup-name zero-downtime-node-group

# Verify security groups allow traffic
aws ec2 describe-security-groups \
  --filters Name=group-name,Values=*eks*
```

### 3. Pods Stuck in Pending

```bash
# Check events
kubectl describe pod POD_NAME -n production

# Check node resources
kubectl describe nodes

# Check PVC status
kubectl get pvc -n production
```

### 4. ALB Not Provisioning

```bash
# Check ingress controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Verify subnets have proper tags
aws ec2 describe-tags \
  --filters Name=resource-id,Values=subnet-xxx

# Check ingress events
kubectl describe ingress ecommerce-ingress -n production
```

### 5. Database Connection Issues

```bash
# Test connectivity
kubectl run db-test --rm -it --restart=Never \
  --image=mysql:8.0 -- mysql -h RDS_ENDPOINT -u admin -p

# Check secrets
kubectl get secret db-credentials -n production -o jsonpath='{.data}'
```

### 6. Prometheus/Grafana Not Scraping

```bash
# Check target status
kubectl port-forward svc/prometheus-server 9090:80 -n monitoring
# Open http://localhost:9090/targets

# Check config
kubectl get configmap prometheus-server -n monitoring -o yaml
```

### 7. Chaos Experiments Failing

```bash
# Check Litmus status
kubectl get pods -n chaos

# Check experiment status
kubectl get chaosengine -n chaos
kubectl describe chaosengine pod-kill-engine -n chaos

# Verify RBAC
kubectl get clusterrole litmus-admin -o yaml
```

### 8. Canary Rollout Stuck

```bash
# Check rollout status
kubectl argo rollouts get rollout frontend-rollout -n production

# Promote manually
kubectl argo rollouts promote frontend-rollout -n production

# Abort if needed
kubectl argo rollouts abort frontend-rollout -n production
```

## Recovery Procedures

### Cluster Recovery

```bash
# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save snapshot.db

# Restore cluster from snapshot
terraform plan -destroy
terraform apply
```

### Database Failover

```bash
# Force failover
aws rds failover-db-instance \
  --db-instance-identifier zero-downtime-mysql

# Monitor failover
aws rds describe-events \
  --source-type db-instance \
  --source-identifier zero-downtime-mysql
```

## Logs Collection

```bash
# View Loki logs
kubectl port-forward svc/loki 3100:3100 -n monitoring
curl http://localhost:3100/loki/api/v1/query?query={app="frontend"}
```
