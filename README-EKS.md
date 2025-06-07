# AWS Solutions Architect - EKS Deployment Guide

This guide walks you through deploying the AWS Solutions Architect application to Amazon EKS.

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **kubectl** installed and configured
3. **Docker** installed
4. **EKS cluster** already created
5. **ECR repository** created
6. **AWS Load Balancer Controller** installed in your EKS cluster

## Quick Setup

### 1. Create ECR Repository
```bash
aws ecr create-repository --repository-name aws-architect --region us-east-1
```

### 2. Update Configuration
Before deployment, update these files with your actual values:

**k8s/secret.yaml**
```yaml
stringData:
  DATABASE_URL: "postgresql://username:password@your-rds-endpoint:5432/database"
  AWS_ACCESS_KEY_ID: "your-actual-access-key"
  AWS_SECRET_ACCESS_KEY: "your-actual-secret-key"
```

**k8s/ingress.yaml**
```yaml
annotations:
  alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:YOUR-ACCOUNT:certificate/YOUR-CERT-ID"
spec:
  rules:
  - host: your-domain.com
```

**k8s/deploy.sh**
```bash
ECR_REPOSITORY="YOUR-ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/aws-architect"
CLUSTER_NAME="your-cluster-name"
```

### 3. Deploy Application
```bash
# Make script executable
chmod +x k8s/deploy.sh

# Run deployment
./k8s/deploy.sh
```

## Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Build and push Docker image
docker build -t aws-architect .
docker tag aws-architect:latest YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/aws-architect:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker push YOUR-ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/aws-architect:latest

# 2. Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name your-cluster-name

# 3. Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# 4. Check deployment status
kubectl get pods -n aws-architect
kubectl logs -f deployment/aws-architect-app -n aws-architect
```

## Features Included

- **High Availability**: 3 replicas with auto-scaling (3-10 pods)
- **Health Checks**: Liveness and readiness probes
- **Security**: Non-root user, resource limits
- **Load Balancing**: AWS Application Load Balancer
- **SSL/TLS**: Certificate manager integration
- **Monitoring**: Health check endpoint at `/api/health`

## Scaling Configuration

The HPA (Horizontal Pod Autoscaler) automatically scales based on:
- CPU utilization: 70% threshold
- Memory utilization: 80% threshold
- Min replicas: 3
- Max replicas: 10

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n aws-architect

# View logs
kubectl logs -f deployment/aws-architect-app -n aws-architect

# Check ingress
kubectl get ingress -n aws-architect

# Check HPA status
kubectl get hpa -n aws-architect

# Describe deployment for events
kubectl describe deployment aws-architect-app -n aws-architect
```

## Environment Variables

The application uses these environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region (default: us-east-1)
- `NODE_ENV`: Environment (production)
- `PORT`: Application port (5000)

## Security Considerations

1. Store sensitive data in AWS Secrets Manager instead of Kubernetes secrets
2. Use IAM roles for service accounts (IRSA) instead of access keys
3. Enable network policies for pod-to-pod communication
4. Use private subnets for worker nodes
5. Enable CloudTrail logging

## Cost Optimization

- Use Spot instances for worker nodes
- Configure cluster autoscaler
- Set appropriate resource requests and limits
- Monitor costs with AWS Cost Explorer