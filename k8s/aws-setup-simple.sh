#!/bin/bash

# Simplified AWS EKS Setup (No SSH Access Required)

set -e

# Configuration - UPDATE THESE VALUES
AWS_REGION="us-east-1"
CLUSTER_NAME="aws-architect-cluster"
NODE_GROUP_NAME="aws-architect-nodes"
ECR_REPO_NAME="aws-architect"
DOMAIN_NAME="your-domain.com"  # Update with your actual domain
CERT_EMAIL="your-email@domain.com"  # Update with your email

echo "Starting simplified AWS EKS setup..."

# Step 1: Create ECR Repository
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true || echo "Repository might already exist"

# Step 2: Create EKS Cluster (without SSH access)
echo "Creating EKS cluster (this takes 10-15 minutes)..."
eksctl create cluster \
    --name $CLUSTER_NAME \
    --region $AWS_REGION \
    --version 1.28 \
    --nodegroup-name $NODE_GROUP_NAME \
    --node-type t3.medium \
    --nodes 3 \
    --nodes-min 3 \
    --nodes-max 10 \
    --managed \
    --with-oidc

# Step 3: Install AWS Load Balancer Controller
echo "Installing AWS Load Balancer Controller..."
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json || echo "Policy might already exist"

eksctl utils associate-iam-oidc-provider --region=$AWS_REGION --cluster=$CLUSTER_NAME --approve

eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Step 4: Install Metrics Server
echo "Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Step 5: Create SSL Certificate
echo "Creating SSL certificate..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --domain-name "*.$DOMAIN_NAME" \
    --validation-method DNS \
    --region $AWS_REGION \
    --query 'CertificateArn' \
    --output text)

echo "Certificate ARN: $CERT_ARN"

# Get cluster info
VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query 'cluster.resourcesVpcConfig.vpcId' --output text)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "AWS Infrastructure Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Validate SSL certificate in AWS Certificate Manager console"
echo "2. Update k8s/secret.yaml with your database URL"
echo "3. Update k8s/ingress.yaml with:"
echo "   Certificate ARN: $CERT_ARN"
echo "   Domain: $DOMAIN_NAME"
echo "4. Run: ./k8s/deploy.sh"
echo ""
echo "Cluster Name: $CLUSTER_NAME"
echo "ECR Repository: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Clean up
rm -f iam_policy.json