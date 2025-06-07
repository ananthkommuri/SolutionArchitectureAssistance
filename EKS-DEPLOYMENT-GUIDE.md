# Complete EKS Deployment Guide

## Step-by-Step AWS Deployment

### Phase 1: Prerequisites Setup
```bash
# Check if all tools are installed
./k8s/prereqs-check.sh
```

Required tools:
- AWS CLI (configured with your credentials)
- kubectl
- eksctl
- Docker
- Helm

### Phase 2: AWS Infrastructure Setup
```bash
# Create complete AWS infrastructure
./k8s/aws-setup.sh
```

This script creates:
- EKS cluster with managed node groups
- ECR repository for container images
- RDS PostgreSQL database
- SSL certificate via AWS Certificate Manager
- AWS Load Balancer Controller
- Required IAM roles and security groups

**Important**: Update these values in `k8s/aws-setup.sh` before running:
```bash
DOMAIN_NAME="your-domain.com"
CERT_EMAIL="your-email@domain.com"
```

### Phase 3: Configuration Update

After infrastructure setup, update configuration files:

**1. Update k8s/secret.yaml**
Replace with actual database URL from setup output:
```yaml
stringData:
  DATABASE_URL: "postgresql://awsarchitect:PASSWORD@endpoint:5432/postgres"
```

**2. Update k8s/ingress.yaml**
Replace with your certificate ARN and domain:
```yaml
annotations:
  alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID"
spec:
  rules:
  - host: your-domain.com
```

### Phase 4: Application Deployment
```bash
# Deploy application to EKS
./k8s/deploy.sh
```

This deploys:
- Application containers with auto-scaling
- Load balancer with SSL termination
- Health monitoring and logging

### Phase 5: DNS Configuration

Point your domain to the load balancer:
```bash
# Get load balancer DNS name
kubectl get ingress aws-architect-ingress -n aws-architect
```

Create a CNAME record in your DNS provider:
```
your-domain.com -> k8s-awsarchitect-xxxxxxxx-xxxxxxxxx.us-east-1.elb.amazonaws.com
```

## Production Features

- **Auto-scaling**: 3-10 pods based on CPU/memory usage
- **High availability**: Multi-AZ deployment
- **SSL/TLS**: Automatic certificate management
- **Health checks**: Kubernetes liveness/readiness probes
- **Database**: Managed PostgreSQL with backups
- **Monitoring**: CloudWatch integration
- **Security**: VPC isolation, security groups

## Monitoring Commands

```bash
# Check pod status
kubectl get pods -n aws-architect

# View application logs
kubectl logs -f deployment/aws-architect-app -n aws-architect

# Check auto-scaling
kubectl get hpa -n aws-architect

# Monitor ingress
kubectl describe ingress aws-architect-ingress -n aws-architect
```

## Estimated Costs

- EKS cluster: $73/month
- EC2 nodes (3x t3.medium): ~$95/month
- RDS PostgreSQL (db.t3.micro): ~$13/month
- Load balancer: ~$18/month
- **Total**: ~$200/month

## Quick Commands Reference

```bash
# Complete setup (run in order)
./k8s/prereqs-check.sh
./k8s/aws-setup.sh
# Update configuration files
./k8s/deploy.sh

# Management
kubectl get all -n aws-architect
kubectl logs -f deployment/aws-architect-app -n aws-architect
kubectl scale deployment aws-architect-app --replicas=5 -n aws-architect
```