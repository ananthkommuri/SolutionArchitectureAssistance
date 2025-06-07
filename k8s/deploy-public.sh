#!/bin/bash

# Deploy to EKS with Public Load Balancer Access

set -e

# Configuration
CLUSTER_NAME="aws-architect-cluster"
REGION="us-east-1"
IMAGE_NAME="aws-architect"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPOSITORY="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/aws-architect"
NAMESPACE="aws-architect"

echo "Starting deployment to EKS cluster: $CLUSTER_NAME"

# Step 1: Build and push Docker image to ECR
echo "Building Docker image..."
docker build -t $IMAGE_NAME .

echo "Tagging image for ECR..."
docker tag $IMAGE_NAME:latest $ECR_REPOSITORY:latest
docker tag $IMAGE_NAME:latest $ECR_REPOSITORY:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

echo "Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

echo "Pushing image to ECR..."
docker push $ECR_REPOSITORY:latest

# Step 2: Update kubeconfig
echo "Updating kubeconfig..."
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

# Step 3: Update deployment image
echo "Updating deployment image..."
sed -i.bak "s|image: aws-architect:latest|image: $ECR_REPOSITORY:latest|g" k8s/deployment.yaml

# Step 4: Apply Kubernetes manifests
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "Applying secrets (make sure to update with real values)..."
kubectl apply -f k8s/secret.yaml

echo "Applying configmap..."
kubectl apply -f k8s/configmap.yaml

echo "Applying deployment..."
kubectl apply -f k8s/deployment.yaml

echo "Applying service..."
kubectl apply -f k8s/service.yaml

echo "Applying public ingress..."
kubectl apply -f k8s/ingress-public.yaml

echo "Applying HPA..."
kubectl apply -f k8s/hpa.yaml

# Step 5: Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/aws-architect-app -n $NAMESPACE --timeout=300s

# Step 6: Get application URL
echo "Waiting for load balancer to be ready..."
sleep 30

INGRESS_URL=""
for i in {1..10}; do
    INGRESS_URL=$(kubectl get ingress aws-architect-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    if [ ! -z "$INGRESS_URL" ]; then
        break
    fi
    echo "Waiting for load balancer... (attempt $i/10)"
    sleep 30
done

if [ ! -z "$INGRESS_URL" ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo "🌐 Application URL: http://$INGRESS_URL"
    echo ""
    echo "📊 Management commands:"
    echo "kubectl get pods -n $NAMESPACE"
    echo "kubectl logs -f deployment/aws-architect-app -n $NAMESPACE"
    echo "kubectl get ingress -n $NAMESPACE"
else
    echo ""
    echo "⚠️  Deployment completed but load balancer URL not yet available"
    echo "Run this command to get the URL when ready:"
    echo "kubectl get ingress aws-architect-ingress -n $NAMESPACE"
fi

# Restore original deployment file
mv k8s/deployment.yaml.bak k8s/deployment.yaml 2>/dev/null || true