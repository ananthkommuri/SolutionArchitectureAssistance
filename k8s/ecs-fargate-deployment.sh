#!/bin/bash

# ECS Fargate Deployment - Available in All Regions

set -e

CLUSTER_NAME="aws-architect-cluster"
SERVICE_NAME="aws-architect-service"
TASK_FAMILY="aws-architect-task"
ECR_REPO="aws-architect"
AWS_REGION="us-east-1"

echo "Deploying to ECS Fargate..."

# Get account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

# Create ECR repository
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION 2>/dev/null || echo "Repository exists"

# Build and push image
docker build -t $ECR_REPO .
docker tag $ECR_REPO:latest $ECR_URI:latest
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $ECR_URI:latest

# Create ECS cluster
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || echo "Cluster exists"

# Create task definition
cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "aws-architect",
      "image": "$ECR_URI:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "$AWS_REGION"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/aws-architect",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Create CloudWatch log group
aws logs create-log-group --log-group-name "/ecs/aws-architect" --region $AWS_REGION 2>/dev/null || echo "Log group exists"

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION

# Get default VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region $AWS_REGION | tr '\t' ',')

# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name aws-architect-sg \
    --description "Security group for AWS Architect app" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=aws-architect-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $AWS_REGION)

# Allow HTTP traffic
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5000 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "Rule exists"

# Create ECS service
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --region $AWS_REGION

echo "Waiting for service to be stable..."
aws ecs wait services-stable --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION

# Get public IP
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query 'taskArns[0]' --output text --region $AWS_REGION)
PUBLIC_IP=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text --region $AWS_REGION | xargs -I {} aws ec2 describe-network-interfaces --network-interface-ids {} --query 'NetworkInterfaces[0].Association.PublicIp' --output text --region $AWS_REGION)

echo ""
echo "ECS Fargate deployment successful!"
echo ""
echo "Application URL: http://$PUBLIC_IP:5000"
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo ""
echo "Cost: Approximately $20-40/month"

# Cleanup
rm -f task-definition.json