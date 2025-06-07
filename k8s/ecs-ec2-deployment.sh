#!/bin/bash

# ECS with EC2 Deployment for AWS Solutions Architect Application

set -e

CLUSTER_NAME="aws-architect-cluster"
SERVICE_NAME="aws-architect-service"
TASK_FAMILY="aws-architect-task"
ECR_REPO="aws-architect"
AWS_REGION="us-east-1"
INSTANCE_TYPE="t3.medium"

echo "Deploying to ECS with EC2 instances..."

# Get account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

# Create ECR repository
echo "Creating ECR repository..."
aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION 2>/dev/null || echo "Repository exists"

# Build and push Docker image
echo "Building and pushing Docker image..."
docker build -t $ECR_REPO .
docker tag $ECR_REPO:latest $ECR_URI:latest
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
docker push $ECR_URI:latest

# Create ECS cluster
echo "Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION 2>/dev/null || echo "Cluster exists"

# Create IAM role for ECS instances
echo "Creating IAM roles..."
cat > ecs-instance-trust-policy.json << EOF
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
  --role-name ecsInstanceRole \
  --assume-role-policy-document file://ecs-instance-trust-policy.json 2>/dev/null || echo "Role exists"

aws iam attach-role-policy \
  --role-name ecsInstanceRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role 2>/dev/null || echo "Policy attached"

# Create instance profile
aws iam create-instance-profile --instance-profile-name ecsInstanceProfile 2>/dev/null || echo "Profile exists"
aws iam add-role-to-instance-profile \
  --instance-profile-name ecsInstanceProfile \
  --role-name ecsInstanceRole 2>/dev/null || echo "Role added"

# Create task execution role
cat > ecs-task-execution-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file://ecs-task-execution-trust-policy.json 2>/dev/null || echo "Role exists"

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || echo "Policy attached"

# Wait for IAM propagation
echo "Waiting for IAM roles to propagate..."
sleep 30

# Get default VPC and subnet
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION)

# Create security group
echo "Creating security group..."
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
    --region $AWS_REGION 2>/dev/null || echo "HTTP rule exists"

# Allow SSH access
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "SSH rule exists"

# Get latest ECS-optimized AMI
AMI_ID=$(aws ssm get-parameters \
    --names /aws/service/ecs/optimized-ami/amazon-linux-2/recommended \
    --region $AWS_REGION \
    --query 'Parameters[0].Value' \
    --output text | jq -r '.image_id')

# Create user data script for ECS agent
cat > user-data.sh << 'EOF'
#!/bin/bash
echo ECS_CLUSTER=aws-architect-cluster >> /etc/ecs/ecs.config
echo ECS_ENABLE_LOGGING=true >> /etc/ecs/ecs.config
EOF

# Encode user data
USER_DATA=$(base64 -w 0 user-data.sh)

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name default \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --iam-instance-profile Name=ecsInstanceProfile \
    --user-data $USER_DATA \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=aws-architect-ecs-instance}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    --region $AWS_REGION)

echo "Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text \
    --region $AWS_REGION)

echo "Waiting for ECS agent to register..."
sleep 60

# Create CloudWatch log group
aws logs create-log-group --log-group-name "/ecs/aws-architect" --region $AWS_REGION 2>/dev/null || echo "Log group exists"

# Create task definition
cat > task-definition.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "bridge",
  "requiresCompatibilities": ["EC2"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "aws-architect",
      "image": "$ECR_URI:latest",
      "portMappings": [
        {
          "hostPort": 5000,
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
      },
      "essential": true
    }
  ]
}
EOF

# Register task definition
echo "Registering task definition..."
aws ecs register-task-definition --cli-input-json file://task-definition.json --region $AWS_REGION

# Create ECS service
echo "Creating ECS service..."
aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_FAMILY \
    --desired-count 1 \
    --launch-type EC2 \
    --region $AWS_REGION

echo "Waiting for service to be stable..."
aws ecs wait services-stable --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION

echo ""
echo "ECS with EC2 deployment successful!"
echo ""
echo "Application URL: http://$PUBLIC_IP:5000"
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo ""
echo "Cost: Approximately $25-45/month for t3.medium instance"
echo ""
echo "SSH Access: ssh -i your-key.pem ec2-user@$PUBLIC_IP"
echo "ECS Console: https://console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$CLUSTER_NAME"

# Cleanup temporary files
rm -f ecs-instance-trust-policy.json ecs-task-execution-trust-policy.json task-definition.json user-data.sh