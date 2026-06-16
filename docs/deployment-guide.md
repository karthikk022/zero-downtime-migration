# Deployment Guide

## Prerequisites

- AWS CLI configured with admin access
- Terraform >= 1.5
- kubectl
- Helm >= 3.0
- Docker
- Node.js >= 18
- GitHub account with Actions enabled

## Step 1: Infrastructure Setup

```bash
# Clone repository
cd zero-downtime-migration

# Initialize Terraform
cd terraform/environments/dev
terraform init

# Set variables
export TF_VAR_db_username="admin"
export TF_VAR_db_password="ChangeMe123!"

# Deploy infrastructure
terraform plan -out=tfplan
terraform apply tfplan

# Note the outputs: state_bucket and dynamodb_table
# These are used for remote state backend in production.
```

## Step 1b: Migrate to Remote State (Production)

After the first apply, migrate from local to S3 backend:

```bash
# Edit terraform/main.tf: replace backend "local" with:
#   backend "s3" {
#     bucket         = "zero-downtime-prod-tfstate"
#     key            = "prod/terraform.tfstate"
#     region         = "us-east-1"
#     encrypt        = true
#     dynamodb_table = "zero-downtime-prod-tfstate-lock"
#   }

# Migrate state
cd terraform/environments/prod
terraform init -migrate-state
```

## Step 2: Configure kubectl

```bash
aws eks update-kubeconfig --name zero-downtime-dev-cluster --region us-east-1
kubectl get nodes
```

## Step 3: Deploy Monitoring Stack

```bash
# Create namespaces
kubectl apply -f k8s/namespaces/

# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword=admin123

# Install Loki
helm install loki grafana/loki-stack --namespace monitoring

# Apply alerting rules
kubectl apply -f observability/prometheus/rules/
```

## Step 4: Deploy Applications

```bash
# Deploy databases
kubectl apply -f k8s/rds/

# Install services via Helm
for service in frontend api-gateway user-service product-service order-service; do
  helm install $service ./helm-charts/$service --namespace production
done

# Apply HPA and PDB
kubectl apply -f k8s/hpa/
kubectl apply -f k8s/pdb/

# Apply network policies
kubectl apply -f k8s/network-policies/
```

## Step 5: Configure ALB Ingress

```bash
# Install ALB controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=zero-downtime-dev-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Apply ingress
kubectl apply -f k8s/ingress/ingress.yaml
```

## Step 6: Blue-Green Deployment

```bash
# Deploy blue environment
kubectl apply -f blue-green/k8s/blue-deployment.yaml

# Deploy green environment
kubectl apply -f blue-green/k8s/green-deployment.yaml

# Apply weighted routing
kubectl apply -f blue-green/k8s/service-entry.yaml

# Shift traffic
kubectl apply -f blue-green/terraform/blue-green.tf
```

## Step 7: Canary Releases

```bash
# Install Argo Rollouts
kubectl create namespace argocd
kubectl apply -n argocd -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Apply rollout
kubectl apply -f canary/argo-rollouts/rollout.yaml
```

## Step 8: Chaos Engineering

```bash
# Install LitmusChaos
helm repo add litmuschaos https://litmuschaos.github.io/litmus-helm/
helm install chaos litmuschaos/litmus --namespace=chaos

# Apply chaos experiments
kubectl apply -f chaos/litmus/experiments/
```

## Step 9: Run Load Tests

```bash
# Install k6
choco install k6

# Set target URL
export BASE_URL=http://$(kubectl get ingress ecommerce-ingress -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Run tests
k6 run load-testing/k6/scripts/smoke-test.js
k6 run load-testing/k6/scripts/load-test.js
k6 run load-testing/k6/scripts/stress-test.js
```

## Step 10: Auto-Healing Demo

```bash
# Run failure simulator
python3 auto-healing/scripts/failure-simulator.py

# Or run bash demo
bash auto-healing/scripts/demo-scenarios.sh
```

## Cleanup

```bash
# Destroy all resources
cd terraform/environments/dev
terraform destroy
```
