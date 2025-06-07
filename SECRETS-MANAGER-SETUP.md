# AWS Secrets Manager Setup for App Runner

## Step 1: Create Database Secret

Run the setup script to store your credentials:
```bash
./k8s/setup-secrets-manager.sh
```

This will prompt you for:
- DATABASE_URL (your PostgreSQL connection string)
- AWS_ACCESS_KEY_ID 
- AWS_SECRET_ACCESS_KEY
- AWS_REGION

## Step 2: Update App Runner Configuration

After running the script, you'll get a Secret ARN. Update `apprunner-with-secrets.yaml`:

Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID in these lines:
```yaml
secrets:
  - name: DATABASE_URL
    value_from: "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:aws-architect-app/database:DATABASE_URL::"
```

## Step 3: Deploy to App Runner

1. **Via AWS Console**:
   - Go to App Runner
   - Create service from source code
   - Upload your code with `apprunner-with-secrets.yaml`
   - App Runner will automatically use the secrets

2. **Via CLI** (if you have the App Runner CLI):
   ```bash
   aws apprunner create-service --cli-input-json file://apprunner-service.json
   ```

## IAM Permissions Required

App Runner needs permission to read from Secrets Manager. Ensure your App Runner service role has:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:*:*:secret:aws-architect-app/database*"
        }
    ]
}
```

## Benefits

- **Secure credentials** - No hardcoded secrets in code
- **Automatic rotation** - Secrets Manager can rotate credentials
- **Environment isolation** - Different secrets for dev/prod
- **Audit trail** - CloudTrail logs secret access

Your App Runner deployment will now have secure access to your PostgreSQL database through Secrets Manager.