#!/bin/bash

# Complete AWS EKS Setup with IAM Role Creation

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="aws-architect-cluster"
NODE_GROUP_NAME="aws-architect-nodes"
ECR_REPO_NAME="aws-architect"

echo "Starting complete AWS EKS setup with IAM roles..."

# Step 1: Create required IAM roles
echo "Creating IAM roles for EKS..."

# EKS Cluster Service Role
cat > eks-cluster-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name aws-architect-eks-cluster-role \
  --assume-role-policy-document file://eks-cluster-role-trust-policy.json || echo "Cluster role exists"

aws iam attach-role-policy \
  --role-name aws-architect-eks-cluster-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

# EKS Node Group Role
cat > eks-nodegroup-role-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name aws-architect-eks-nodegroup-role \
  --assume-role-policy-document file://eks-nodegroup-role-trust-policy.json || echo "Node group role exists"

aws iam attach-role-policy \
  --role-name aws-architect-eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name aws-architect-eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

aws iam attach-role-policy \
  --role-name aws-architect-eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

echo "Waiting for IAM roles to propagate..."
sleep 30

# Step 2: Create ECR Repository
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true || echo "Repository exists"

# Step 3: Get account and role ARNs
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/aws-architect-eks-cluster-role"
NODEGROUP_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/aws-architect-eks-nodegroup-role"

# Step 4: Create EKS Cluster with explicit role ARN
echo "Creating EKS cluster with role ARN..."
aws eks create-cluster \
    --name $CLUSTER_NAME \
    --version 1.28 \
    --role-arn $CLUSTER_ROLE_ARN \
    --resources-vpc-config subnetIds=$(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[].SubnetId' --output text | tr '\t' ',')

echo "Waiting for cluster to be active..."
aws eks wait cluster-active --name $CLUSTER_NAME

# Step 5: Update kubeconfig
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

# Step 6: Create node group
echo "Creating managed node group..."
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[].SubnetId' --output text | tr '\t' ',')

aws eks create-nodegroup \
    --cluster-name $CLUSTER_NAME \
    --nodegroup-name $NODE_GROUP_NAME \
    --node-role $NODEGROUP_ROLE_ARN \
    --subnets $SUBNET_IDS \
    --instance-types t3.medium \
    --scaling-config minSize=3,maxSize=10,desiredSize=3 \
    --disk-size 20 \
    --ami-type AL2_x86_64

echo "Waiting for node group to be active..."
aws eks wait nodegroup-active --cluster-name $CLUSTER_NAME --nodegroup-name $NODE_GROUP_NAME

# Step 7: Install AWS Load Balancer Controller
echo "Installing AWS Load Balancer Controller..."
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.2/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json || echo "Policy exists"

eksctl utils associate-iam-oidc-provider --region=$AWS_REGION --cluster=$CLUSTER_NAME --approve

eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Step 8: Install Metrics Server
echo "Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo ""
echo "EKS cluster setup complete!"
echo ""
echo "Cluster Name: $CLUSTER_NAME"
echo "ECR Repository: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"
echo ""
echo "Next step: Update k8s/secret.yaml with your database URL, then run ./k8s/deploy-public.sh"

# Clean up
rm -f eks-cluster-role-trust-policy.json eks-nodegroup-role-trust-policy.json iam_policy.json