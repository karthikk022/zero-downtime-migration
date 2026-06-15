# Architecture Diagrams

## Legacy Architecture

```mermaid
graph TD
    Users["👤 Users"] --> ALB["Application Load Balancer"]
    ALB --> ASG["EC2 Auto Scaling Group"]
    ASG --> Monolith["Monolithic Web App<br/>(Node.js + Express)"]
    Monolith --> RDS["RDS MySQL"]

    style Users fill:#e1f5fe
    style ALB fill:#fff3e0
    style ASG fill:#f3e5f5
    style Monolith fill:#ffebee
    style RDS fill:#e8f5e9
```

## Modern Architecture

```mermaid
graph TD
    Users["👤 Users"] --> CloudFront["CloudFront CDN"]
    CloudFront --> ALB["AWS ALB Ingress Controller"]
    ALB --> EKS["Amazon EKS Cluster"]
    
    subgraph EKS["Kubernetes Cluster"]
        subgraph Production["Production Namespace"]
            Frontend["Frontend Service<br/>(Static UI)"]
            Gateway["API Gateway<br/>(Reverse Proxy)"]
            UserSvc["User Service<br/>(Auth + Profiles)"]
            ProductSvc["Product Service<br/>(Catalog)"]
            OrderSvc["Order Service<br/>(Cart + Orders)"]
            
            Gateway --> UserSvc
            Gateway --> ProductSvc
            Gateway --> OrderSvc
            Frontend --> Gateway
        end
        
        subgraph Monitoring["Monitoring Namespace"]
            Prometheus["Prometheus"]
            Grafana["Grafana"]
            AlertManager["AlertManager"]
            Loki["Loki"]
            Promtail["Promtail"]
        end
        
        subgraph Chaos["Chaos Namespace"]
            Litmus["LitmusChaos"]
        end
    end
    
    OrderSvc --> RDS["RDS MySQL<br/>(Multi-AZ)"]
    
    style Users fill:#e1f5fe
    style CloudFront fill:#bbdefb
    style ALB fill:#fff3e0
    style EKS fill:#f3e5f5
    style Production fill:#e8f5e9
    style Monitoring fill:#fff8e1
    style Chaos fill:#fce4ec
    style RDS fill:#e8f5e9
```

## Migration Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub Actions
    participant ECR as ECR
    participant EKS as EKS Cluster
    participant ALB as ALB
    
    Dev->>GH: Push code
    GH->>GH: Build & Test
    GH->>GH: Security Scan (Trivy)
    GH->>ECR: Push Docker Image
    GH->>EKS: Deploy Canary (10%)
    EKS->>ALB: Route 10% traffic
    GH->>GH: Run Smoke Tests
    GH->>EKS: Increase to 50%
    EKS->>ALB: Route 50% traffic
    GH->>EKS: Full Production (100%)
    EKS->>ALB: Route 100% traffic
```

## Blue-Green Deployment

```mermaid
graph LR
    subgraph Blue["Blue Environment (v1.0.0)"]
        B1["3 Pods"]
        B2["3 Pods"]
        B3["3 Pods"]
    end
    
    subgraph Green["Green Environment (v2.0.0)"]
        G1["3 Pods"]
        G2["3 Pods"]
        G3["3 Pods"]
    end
    
    ALB["ALB"] -->|"90%"| Blue
    ALB -->|"10%"| Green
    
    style Blue fill:#e3f2fd
    style Green fill:#e8f5e9
    style ALB fill:#fff3e0
```

## CI/CD Pipeline

```mermaid
graph LR
    Build["Build"] --> Test["Test"]
    Test --> Security["Security Scan"]
    Security --> Push["Push Image"]
    Push --> Canary["Deploy Canary"]
    Canary --> Smoke["Smoke Tests"]
    Smoke --> Ramp["Increase Traffic"]
    Ramp --> Full["Full Production"]
    
    style Build fill:#e1f5fe
    style Test fill:#fff3e0
    style Security fill:#fce4ec
    style Push fill:#e8f5e9
    style Canary fill:#f3e5f5
    style Smoke fill:#fff8e1
    style Ramp fill:#e0f7fa
    style Full fill:#e8f5e9
```

## Observability Stack

```mermaid
graph TD
    K8s["Kubernetes Cluster"] -->|"Metrics"| Prometheus["Prometheus"]
    K8s -->|"Logs"| Promtail["Promtail"]
    Promtail --> Loki["Loki"]
    Prometheus --> Grafana["Grafana"]
    Loki --> Grafana
    Prometheus --> AlertManager["AlertManager"]
    AlertManager --> Slack["Slack"]
    AlertManager --> PagerDuty["PagerDuty"]
    
    style K8s fill:#f3e5f5
    style Prometheus fill:#e1f5fe
    style Promtail fill:#e1f5fe
    style Loki fill:#e8f5e9
    style Grafana fill:#fff3e0
    style AlertManager fill:#fce4ec
    style Slack fill:#e8f5e9
    style PagerDuty fill:#fce4ec
```

## Chaos Engineering

```mermaid
graph TD
    Litmus["LitmusChaos"] -->|"Inject"| PodKill["Pod Kill<br/>Experiment"]
    Litmus -->|"Inject"| NodeFail["Node Failure<br/>Experiment"]
    Litmus -->|"Inject"| NetLatency["Network Latency<br/>Experiment"]
    Litmus -->|"Inject"| CPUStress["CPU Stress<br/>Experiment"]
    Litmus -->|"Inject"| MemStress["Memory Stress<br/>Experiment"]
    
    PodKill -->|"Verify"| Probe["Health Probes"]
    NodeFail -->|"Verify"| Probe
    NetLatency -->|"Verify"| Probe
    CPUStress -->|"Verify"| Probe
    MemStress -->|"Verify"| Probe
    
    Probe -->|"Pass/Fail"| Report["Recovery Report"]
    
    style Litmus fill:#fce4ec
    style PodKill fill:#ffebee
    style NodeFail fill:#ffebee
    style NetLatency fill:#ffebee
    style CPUStress fill:#ffebee
    style MemStress fill:#ffebee
    style Probe fill:#e8f5e9
    style Report fill:#e3f2fd
```

## Network Architecture

```mermaid
graph TD
    IGW["Internet Gateway"] --> PublicSubnet1["Public Subnet 1"]
    IGW --> PublicSubnet2["Public Subnet 2"]
    IGW --> PublicSubnet3["Public Subnet 3"]
    
    PublicSubnet1 --> NAT1["NAT Gateway 1"]
    PublicSubnet2 --> NAT2["NAT Gateway 2"]
    PublicSubnet3 --> NAT3["NAT Gateway 3"]
    
    NAT1 --> PrivateSubnet1["Private Subnet 1<br/>(AZ a)"]
    NAT2 --> PrivateSubnet2["Private Subnet 2<br/>(AZ b)"]
    NAT3 --> PrivateSubnet3["Private Subnet 3<br/>(AZ c)"]
    
    subgraph PrivateSubnet1
        Node1["EKS Node 1"]
        RDS1["RDS Read Replica"]
    end
    
    subgraph PrivateSubnet2
        Node2["EKS Node 2"]
        RDS_Primary["RDS Primary"]
    end
    
    subgraph PrivateSubnet3
        Node3["EKS Node 3"]
        RDS2["RDS Read Replica"]
    end
    
    style IGW fill:#fff3e0
    style PublicSubnet1 fill:#e1f5fe
    style PublicSubnet2 fill:#e1f5fe
    style PublicSubnet3 fill:#e1f5fe
    style NAT1 fill:#fce4ec
    style NAT2 fill:#fce4ec
    style NAT3 fill:#fce4ec
    style PrivateSubnet1 fill:#e8f5e9
    style PrivateSubnet2 fill:#e8f5e9
    style PrivateSubnet3 fill:#e8f5e9
```
