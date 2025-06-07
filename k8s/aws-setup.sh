#!/bin/bash

# AWS EKS Complete Setup Script
# This script creates the entire AWS infrastructure needed for the application

set -e

# Configuration - UPDATE THESE VALUES
AWS_REGION="us-east-1"
CLUSTER_NAME="aws-architect-cluster"
NODE_GROUP_NAME="aws-architect-nodes"
ECR_REPO_NAME="aws-architect"
DOMAIN_NAME="your-domain.com"  # Update with your actual domain
CERT_EMAIL="your-email@domain.com"  # Update with your email

echo "🚀 Starting AWS EKS setup for AWS Solutions Architect application"

# Step 1: Create ECR Repository
echo "📦 Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true || echo "Repository might already exist"

# Step 2: Create EKS Cluster
echo "☸️  Creating EKS cluster (this takes 10-15 minutes)..."

# Check if SSH key exists, create if not
if [ ! -f ~/.ssh/id_rsa.pub ]; then
    echo "🔑 SSH key not found, creating one..."
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -q
fi

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
    --with-oidc \
    --ssh-access \
    --ssh-public-key ~/.ssh/id_rsa.pub

# Step 3: Install AWS Load Balancer Controller
echo "⚖️  Installing AWS Load Balancer Controller..."
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

# Step 4: Install Metrics Server for HPA
echo "📊 Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Step 5: Create SSL Certificate (if using ACM)
echo "🔒 Creating SSL certificate..."
CERT_ARN=$(aws acm request-certificate \
    --domain-name $DOMAIN_NAME \
    --domain-name "*.$DOMAIN_NAME" \
    --validation-method DNS \
    --region $AWS_REGION \
    --query 'CertificateArn' \
    --output text)

echo "Certificate ARN: $CERT_ARN"
echo "⚠️  IMPORTANT: You need to validate the certificate in ACM console"
echo "   Go to AWS Certificate Manager and add the DNS records to your domain"

# Step 6: Create RDS Database (PostgreSQL)
echo "🗄️  Creating RDS PostgreSQL database..."
DB_SUBNET_GROUP_NAME="aws-architect-db-subnet-group"
DB_IDENTIFIER="aws-architect-db"
DB_PASSWORD=$(openssl rand -base64 32)

# Get VPC and subnets from EKS cluster
VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query 'cluster.resourcesVpcConfig.vpcId' --output text)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:kubernetes.io/role/internal-elb,Values=1" --query 'Subnets[].SubnetId' --output text)

# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name $DB_SUBNET_GROUP_NAME \
    --db-subnet-group-description "Subnet group for AWS Architect DB" \
    --subnet-ids $SUBNET_IDS || echo "Subnet group might already exist"

# Create security group for RDS
DB_SG_ID=$(aws ec2 create-security-group \
    --group-name aws-architect-db-sg \
    --description "Security group for AWS Architect database" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow PostgreSQL access from EKS nodes
EKS_SG_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' --output text)
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $EKS_SG_ID

# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier $DB_IDENTIFIER \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username awsarchitect \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --vpc-security-group-ids $DB_SG_ID \
    --db-subnet-group-name $DB_SUBNET_GROUP_NAME \
    --no-publicly-accessible \
    --storage-encrypted

echo "⏳ Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier $DB_IDENTIFIER

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $DB_IDENTIFIER --query 'DBInstances[0].Endpoint.Address' --output text)

echo "✅ AWS Infrastructure Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Update k8s/secret.yaml with:"
echo "   DATABASE_URL: postgresql://awsarchitect:$DB_PASSWORD@$DB_ENDPOINT:5432/postgres"
echo ""
echo "2. Update k8s/ingress.yaml with:"
echo "   Certificate ARN: $CERT_ARN"
echo "   Domain: $DOMAIN_NAME"
echo ""
echo "3. Run the deployment script:"
echo "   ./k8s/deploy.sh"
echo ""
echo "🔐 Database Password (save this): $DB_PASSWORD"
echo "🏗️  Cluster Name: $CLUSTER_NAME"
echo "📍 ECR Repository: $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"

# Clean up temporary files
rm -f iam_policy.json