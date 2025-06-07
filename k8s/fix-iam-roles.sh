#!/bin/bash

# Fix IAM Roles for EKS Cluster Creation

set -e

echo "Creating required IAM roles for EKS cluster..."

# Create EKS Cluster Service Role
echo "Creating EKS cluster service role..."
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
  --role-name eks-cluster-role \
  --assume-role-policy-document file://eks-cluster-role-trust-policy.json || echo "Role might already exist"

aws iam attach-role-policy \
  --role-name eks-cluster-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

# Create EKS Node Group Role
echo "Creating EKS node group role..."
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
  --role-name eks-nodegroup-role \
  --assume-role-policy-document file://eks-nodegroup-role-trust-policy.json || echo "Role might already exist"

aws iam attach-role-policy \
  --role-name eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy

aws iam attach-role-policy \
  --role-name eks-nodegroup-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

echo "Waiting for roles to be available..."
sleep 10

echo "IAM roles created successfully!"
echo "You can now proceed with EKS cluster creation."

# Clean up temporary files
rm -f eks-cluster-role-trust-policy.json eks-nodegroup-role-trust-policy.json