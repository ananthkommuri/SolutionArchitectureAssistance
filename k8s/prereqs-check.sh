#!/bin/bash

# Prerequisites Check Script for EKS Deployment

echo "🔍 Checking prerequisites for EKS deployment..."

# Check if AWS CLI is installed and configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed"
    echo "   Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account ID: $AWS_ACCOUNT_ID"

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    echo "   Install: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if eksctl is installed
if ! command -v eksctl &> /dev/null; then
    echo "❌ eksctl is not installed"
    echo "   Install: https://eksctl.io/installation/"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "   Install: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo "❌ Helm is not installed"
    echo "   Install: https://helm.sh/docs/intro/install/"
    exit 1
fi

echo "✅ All prerequisites are installed"
echo ""
echo "🚀 Ready to proceed with EKS deployment!"
echo "   Next step: ./k8s/aws-setup.sh"