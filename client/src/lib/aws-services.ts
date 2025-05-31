export interface AWSServiceIcon {
  name: string;
  category: string;
  icon: string;
  color: string;
}

export const AWS_SERVICE_ICONS: Record<string, AWSServiceIcon> = {
  "EC2": {
    name: "Amazon EC2",
    category: "Compute",
    icon: "🖥️",
    color: "#FF9900"
  },
  "RDS": {
    name: "Amazon RDS",
    category: "Database",
    icon: "🗄️",
    color: "#3F48CC"
  },
  "Lambda": {
    name: "AWS Lambda",
    category: "Compute",
    icon: "⚡",
    color: "#FF9900"
  },
  "S3": {
    name: "Amazon S3",
    category: "Storage",
    icon: "🗂️",
    color: "#569A31"
  },
  "ALB": {
    name: "Application Load Balancer",
    category: "Networking",
    icon: "⚖️",
    color: "#8C4FFF"
  },
  "CloudFront": {
    name: "Amazon CloudFront",
    category: "Content Delivery",
    icon: "🌐",
    color: "#8C4FFF"
  },
  "DynamoDB": {
    name: "Amazon DynamoDB",
    category: "Database",
    icon: "📊",
    color: "#3F48CC"
  },
  "ElastiCache": {
    name: "Amazon ElastiCache",
    category: "Caching",
    icon: "⚡",
    color: "#C925D1"
  },
  "API Gateway": {
    name: "Amazon API Gateway",
    category: "Application Integration",
    icon: "🚪",
    color: "#FF4B4B"
  },
  "SQS": {
    name: "Amazon SQS",
    category: "Application Integration",
    icon: "📬",
    color: "#FF4B4B"
  },
  "SNS": {
    name: "Amazon SNS",
    category: "Application Integration",
    icon: "📢",
    color: "#FF4B4B"
  },
  "EKS": {
    name: "Amazon EKS",
    category: "Containers",
    icon: "🚢",
    color: "#FF9900"
  },
  "VPC": {
    name: "Amazon VPC",
    category: "Networking",
    icon: "🔒",
    color: "#8C4FFF"
  },
  "Route 53": {
    name: "Amazon Route 53",
    category: "Networking",
    icon: "🌍",
    color: "#8C4FFF"
  },
  "CloudWatch": {
    name: "Amazon CloudWatch",
    category: "Management & Governance",
    icon: "📊",
    color: "#759C3E"
  }
};

export function getServiceIcon(serviceName: string): AWSServiceIcon {
  // Try exact match first
  if (AWS_SERVICE_ICONS[serviceName]) {
    return AWS_SERVICE_ICONS[serviceName];
  }

  // Try partial matches
  for (const [key, service] of Object.entries(AWS_SERVICE_ICONS)) {
    if (serviceName.toLowerCase().includes(key.toLowerCase()) || 
        service.name.toLowerCase().includes(serviceName.toLowerCase())) {
      return service;
    }
  }

  // Default fallback
  return {
    name: serviceName,
    category: "AWS Service",
    icon: "☁️",
    color: "#FF9900"
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateArchitectureDiagram(architecture: any): string {
  // Simple text-based architecture diagram
  if (!architecture?.tiers) return "Architecture diagram not available";

  return architecture.tiers.map((tier: any) => {
    return `${tier.name}:\n${tier.components.map((comp: string) => `  • ${comp}`).join('\n')}`;
  }).join('\n\n');
}

export function downloadFile(content: string, filename: string, contentType: string = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
