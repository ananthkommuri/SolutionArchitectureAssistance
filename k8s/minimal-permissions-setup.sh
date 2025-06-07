#!/bin/bash

# Minimal EKS Setup with Reduced Permissions Requirements

set -e

AWS_REGION="us-east-1"
CLUSTER_NAME="aws-architect-cluster"
ECR_REPO_NAME="aws-architect"

echo "Setting up EKS with minimal permissions requirements..."

# Use eksctl with minimal configuration to avoid permission issues
echo "Creating EKS cluster with eksctl (handles IAM automatically)..."

# Create a simple cluster config file
cat > cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $AWS_REGION

nodeGroups:
  - name: aws-architect-nodes
    instanceType: t3.medium
    minSize: 2
    maxSize: 5
    desiredCapacity: 3
    volumeSize: 20
    ssh:
      allow: false

# Use existing VPC if available to avoid permission issues
# vpc:
#   autoAllocateIPv6: false

# Enable OIDC for service accounts
iam:
  withOIDC: true

# Install essential addons
addons:
  - name: vpc-cni
  - name: coredns
  - name: kube-proxy
EOF

# Create cluster using eksctl config
eksctl create cluster -f cluster-config.yaml

# Create ECR repository (minimal permissions required)
echo "Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPO_NAME \
    --region $AWS_REGION || echo "Repository might already exist"

# Install AWS Load Balancer Controller
echo "Installing AWS Load Balancer Controller..."
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --override-existing-serviceaccounts \
  --approve

kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

echo ""
echo "EKS cluster created successfully!"
echo "Cluster: $CLUSTER_NAME"
echo "Region: $AWS_REGION"
echo ""
echo "Next: Update k8s/secret.yaml and run ./k8s/deploy-public.sh"

# Cleanup
rm -f cluster-config.yaml