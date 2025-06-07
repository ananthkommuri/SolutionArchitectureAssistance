# Quick Public AWS Deployment (No Domain Required)

## Step 1: Create AWS Infrastructure
```bash
./k8s/aws-setup-public-ip.sh
```
This creates your EKS cluster, database, and load balancer (takes 15-20 minutes).

## Step 2: Update Database Configuration
After the setup completes, update `k8s/secret.yaml` with the database URL provided in the output:

```yaml
stringData:
  DATABASE_URL: "postgresql://awsarchitect:PASSWORD@endpoint:5432/postgres"
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_REGION: "us-east-1"
```

## Step 3: Deploy Application
```bash
./k8s/deploy-public.sh
```

## Result
You'll get a public URL like:
`http://k8s-awsarchi-12345678-1234567890.us-east-1.elb.amazonaws.com`

## Total Cost: ~$200/month
- EKS cluster: $73/month
- 3 EC2 nodes: $95/month
- Database: $13/month
- Load balancer: $18/month

## Management Commands
```bash
# Check status
kubectl get pods -n aws-architect

# View logs
kubectl logs -f deployment/aws-architect-app -n aws-architect

# Get public URL
kubectl get ingress -n aws-architect
```