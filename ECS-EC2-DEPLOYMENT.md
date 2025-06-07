# ECS with EC2 Deployment Guide

## Prerequisites

1. **Install AWS CLI** on your local machine:
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip && sudo ./aws/install
   
   # Windows
   # Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID
   # Enter your AWS Secret Access Key
   # Enter your default region (e.g., us-east-1)
   # Enter output format: json
   ```

3. **Install Docker** if not already installed

## Deploy Your Application

Download the project files and run:
```bash
./k8s/ecs-ec2-deployment.sh
```

## What This Does

1. **Creates ECR repository** and pushes your Docker image
2. **Sets up IAM roles** for ECS instances and task execution
3. **Launches EC2 instance** with ECS-optimized AMI
4. **Configures security groups** for HTTP and SSH access
5. **Creates ECS cluster and service** with your application
6. **Provides public IP access** to your application

## Expected Result

```
ECS with EC2 deployment successful!

Application URL: http://XX.XXX.XXX.XXX:5000
Instance ID: i-0123456789abcdef0
Public IP: XX.XXX.XXX.XXX
Cluster: aws-architect-cluster
Service: aws-architect-service

Cost: Approximately $25-45/month for t3.medium instance
```

## Benefits of ECS with EC2

- **Direct EC2 access** via SSH for debugging
- **Cost predictable** - fixed monthly EC2 cost
- **Full control** over instance configuration
- **Easy scaling** by adding more instances
- **Container orchestration** with ECS management

## Management Commands

```bash
# Check service status
aws ecs describe-services --cluster aws-architect-cluster --services aws-architect-service

# View running tasks
aws ecs list-tasks --cluster aws-architect-cluster

# Scale service
aws ecs update-service --cluster aws-architect-cluster --service aws-architect-service --desired-count 2

# SSH to instance
ssh -i your-key.pem ec2-user@PUBLIC_IP
```

## Troubleshooting

- **Service not starting**: Check ECS agent logs on EC2 instance
- **Application not accessible**: Verify security group allows port 5000
- **Container fails**: Check CloudWatch logs in `/ecs/aws-architect`

Your application will be accessible at the provided public IP address on port 5000.