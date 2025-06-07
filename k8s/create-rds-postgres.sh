#!/bin/bash

# Create Amazon RDS PostgreSQL Database for AWS Solutions Architect App

set -e

DB_INSTANCE_IDENTIFIER="aws-architect-db"
DB_NAME="awsarchitect"
DB_USERNAME="postgres"
DB_INSTANCE_CLASS="db.t3.micro"
AWS_REGION="us-east-1"
ALLOCATED_STORAGE="20"
ENGINE_VERSION="15.4"

echo "Creating Amazon RDS PostgreSQL database..."

# Generate random password
DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
echo "Generated database password: $DB_PASSWORD"

# Get default VPC and subnet group
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION)
echo "Using VPC: $VPC_ID"

# Create DB subnet group if it doesn't exist
SUBNET_GROUP_NAME="aws-architect-subnet-group"
SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[].SubnetId' --output text --region $AWS_REGION | tr '\t' ' ')

aws rds create-db-subnet-group \
    --db-subnet-group-name $SUBNET_GROUP_NAME \
    --db-subnet-group-description "Subnet group for AWS Architect database" \
    --subnet-ids $SUBNETS \
    --region $AWS_REGION 2>/dev/null || echo "Subnet group already exists"

# Create security group for RDS
SG_NAME="aws-architect-rds-sg"
SG_ID=$(aws ec2 create-security-group \
    --group-name $SG_NAME \
    --description "Security group for AWS Architect RDS database" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text \
    --region $AWS_REGION 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region $AWS_REGION)

echo "Security group: $SG_ID"

# Allow PostgreSQL access from App Runner and local development
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION 2>/dev/null || echo "PostgreSQL rule already exists"

echo "Creating RDS PostgreSQL instance..."

# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
    --db-instance-class $DB_INSTANCE_CLASS \
    --engine postgres \
    --engine-version $ENGINE_VERSION \
    --master-username $DB_USERNAME \
    --master-user-password $DB_PASSWORD \
    --allocated-storage $ALLOCATED_STORAGE \
    --db-name $DB_NAME \
    --vpc-security-group-ids $SG_ID \
    --db-subnet-group-name $SUBNET_GROUP_NAME \
    --backup-retention-period 7 \
    --storage-encrypted \
    --multi-az false \
    --storage-type gp2 \
    --publicly-accessible true \
    --region $AWS_REGION

echo "Waiting for RDS instance to be available..."
aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_IDENTIFIER --region $AWS_REGION

# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $AWS_REGION)

RDS_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text \
    --region $AWS_REGION)

# Construct DATABASE_URL
DATABASE_URL="postgresql://$DB_USERNAME:$DB_PASSWORD@$RDS_ENDPOINT:$RDS_PORT/$DB_NAME"

echo ""
echo "RDS PostgreSQL database created successfully!"
echo ""
echo "Database Details:"
echo "- Instance ID: $DB_INSTANCE_IDENTIFIER"
echo "- Endpoint: $RDS_ENDPOINT"
echo "- Port: $RDS_PORT"
echo "- Database: $DB_NAME"
echo "- Username: $DB_USERNAME"
echo "- Password: $DB_PASSWORD"
echo ""
echo "DATABASE_URL: $DATABASE_URL"
echo ""
echo "Use this DATABASE_URL in your Secrets Manager setup."
echo ""
echo "Monthly cost: Approximately $15-25 for db.t3.micro"