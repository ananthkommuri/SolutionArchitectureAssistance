import { Download, FileText, TableIcon, Wrench, ExternalLink, Lightbulb, DollarSign, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getServiceIcon, formatCurrency } from "@/lib/aws-services";
import type { Architecture } from "@shared/schema";

interface ArchitecturePanelProps {
  architecture?: Architecture;
  messageId?: number;
  className?: string;
}

export default function ArchitecturePanel({ architecture, messageId, className }: ArchitecturePanelProps) {
  if (!architecture) {
    return (
      <div className={`bg-white border border-aws-border rounded-lg p-6 ${className || ''}`}>
        <div className="text-center text-aws-gray">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No architecture to display</p>
          <p className="text-xs mt-1">Generate an architecture recommendation to see details</p>
        </div>
      </div>
    );
  }

  const services = architecture.services as any[];
  const totalCost = architecture.totalCost / 100;
  const diagram = architecture.diagram as any;

  const handleDownloadCloudFormation = () => {
    if (messageId) {
      window.open(`/api/architectures/${messageId}/cloudformation`, '_blank');
    }
  };

  const handleExportPricingCSV = () => {
    if (messageId) {
      window.open(`/api/architectures/${messageId}/pricing-csv`, '_blank');
    }
  };

  const handleDownloadTerraform = () => {
    if (messageId) {
      window.open(`/api/architectures/${messageId}/terraform`, '_blank');
    }
  };

  const handleShareArchitecture = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AWS Architecture Recommendation',
        text: `Check out this AWS architecture recommendation with estimated cost of ${formatCurrency(totalCost)}/month`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className={`bg-white border border-aws-border rounded-lg overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="p-4 bg-aws-light-gray border-b border-aws-border">
        <div className="flex items-center">
          <Building2 className="w-5 h-5 text-aws-blue mr-2" />
          <h2 className="text-lg font-semibold text-aws-blue">Architecture Overview</h2>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Architecture Diagram Visualization */}
        <div className="bg-aws-light-gray rounded-lg p-4 text-center min-h-[180px] flex flex-col items-center justify-center border border-aws-border">
          <div className="text-aws-gray">
            <div className="text-4xl mb-2">🏗️</div>
            <p className="text-sm font-medium">Architecture Diagram</p>
            <p className="text-xs">Visual representation of AWS services</p>
          </div>
        </div>

        {/* Architecture Tiers */}
        {diagram?.tiers && (
          <div className="space-y-3">
            <h3 className="font-semibold text-aws-blue text-sm">Architecture Tiers</h3>
            <div className="grid gap-3">
              {diagram.tiers.map((tier: any, index: number) => (
                <Card key={index} className="border border-aws-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-aws-blue">{tier.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {tier.components.map((component: string, compIndex: number) => (
                        <Badge key={compIndex} variant="secondary" className="text-xs">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Services Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-aws-blue">AWS Services</h3>
          <div className="grid gap-2">
            {services.map((service, index) => {
              const serviceIcon = getServiceIcon(service.name);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-aws-light-gray rounded-lg border border-aws-border">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{serviceIcon.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-aws-blue">{service.name}</div>
                      <div className="text-xs text-aws-gray">{service.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-aws-blue">
                      {formatCurrency(service.monthlyCost)}
                    </div>
                    <div className="text-xs text-aws-gray">per month</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Cost Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <div className="font-semibold text-green-800">Total Monthly Cost</div>
                <div className="text-sm text-green-600">US East (N. Virginia)</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-sm text-green-600">estimated</div>
            </div>
          </div>
        </div>

        {/* Optimization Tips */}
        <div className="space-y-3">
          <h3 className="font-semibold text-aws-blue flex items-center">
            <Lightbulb className="w-4 h-4 mr-2" />
            Optimization Tips
          </h3>
          <div className="grid gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800">Reserved Instances</div>
              <div className="text-xs text-blue-600 mt-1">Save up to 72% with 1-3 year commitments</div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm font-medium text-green-800">Spot Instances</div>
              <div className="text-xs text-green-600 mt-1">Use for fault-tolerant workloads</div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-sm font-medium text-yellow-800">Auto Scaling</div>
              <div className="text-xs text-yellow-600 mt-1">Match capacity to demand patterns</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Export Actions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-aws-blue">Export & Download</h3>
          <div className="grid gap-2">
            <Button
              className="w-full aws-orange aws-orange-hover justify-start"
              onClick={handleDownloadCloudFormation}
              disabled={!messageId}
            >
              <Download className="w-4 h-4 mr-2" />
              CloudFormation Template
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-[hsl(var(--aws-light-blue))] text-[hsl(var(--aws-light-blue))] hover:bg-[hsl(var(--aws-light-blue))] hover:text-white justify-start"
              onClick={handleExportPricingCSV}
              disabled={!messageId}
            >
              <TableIcon className="w-4 h-4 mr-2" />
              Pricing Breakdown (CSV)
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-aws-border text-aws-gray hover:bg-gray-100 justify-start"
              onClick={handleDownloadTerraform}
              disabled={!messageId}
            >
              <FileText className="w-4 h-4 mr-2" />
              Terraform Template
            </Button>
            
            <Button
              variant="outline"
              className="w-full border-aws-border text-aws-gray hover:bg-gray-100 justify-start"
              onClick={handleShareArchitecture}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Share Architecture
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
