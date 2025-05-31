import { useQuery } from "@tanstack/react-query";
import { Download, FileText, TableIcon, Wrench, ExternalLink, Lightbulb, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServiceIcon, formatCurrency } from "@/lib/aws-services";
import type { Architecture } from "@shared/schema";

interface ArchitecturePanelProps {
  chatId: number | null;
}

export default function ArchitecturePanel({ chatId }: ArchitecturePanelProps) {
  const { data: messages } = useQuery({
    queryKey: ["/api/chat-sessions", chatId, "messages"],
    enabled: !!chatId,
  });

  // Get the latest architecture from the most recent AI message
  const latestArchitecture = messages?.findLast((msg: any) => 
    msg.role === "assistant" && msg.architecture
  )?.architecture as Architecture | undefined;

  if (!chatId || !latestArchitecture) {
    return (
      <aside className="w-96 bg-white border-l border-aws-border overflow-y-auto custom-scrollbar">
        <div className="p-6 text-center">
          <div className="text-aws-gray">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No architecture to display</p>
            <p className="text-xs mt-1">Start a conversation to see architecture recommendations</p>
          </div>
        </div>
      </aside>
    );
  }

  const services = latestArchitecture.services as any[];
  const totalCost = latestArchitecture.totalCost / 100;
  const diagram = latestArchitecture.diagram as any;

  return (
    <aside className="w-96 bg-white border-l border-aws-border overflow-y-auto custom-scrollbar">
      {/* Architecture Overview */}
      <div className="p-4 border-b border-aws-border">
        <h2 className="text-lg font-semibold text-aws-blue mb-4">Architecture Overview</h2>
        
        {/* Architecture Diagram Placeholder */}
        <div className="bg-aws-light-gray rounded-lg p-4 mb-4 text-center min-h-[200px] flex flex-col items-center justify-center">
          <div className="text-aws-gray">
            <div className="text-4xl mb-2">🏗️</div>
            <p className="text-sm font-medium">Interactive Architecture Diagram</p>
            <p className="text-xs">Visual representation of your AWS services</p>
          </div>
        </div>

        {/* Architecture Tiers */}
        {diagram?.tiers && (
          <div className="space-y-3 mb-4">
            <h3 className="font-semibold text-aws-blue text-sm">Architecture Tiers</h3>
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
        )}

        {/* Services Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-aws-blue">Services Used</h3>
          <div className="space-y-2">
            {services.slice(0, 8).map((service, index) => {
              const serviceIcon = getServiceIcon(service.name);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-aws-light-gray rounded border border-aws-border">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{serviceIcon.icon}</span>
                    <span className="text-sm font-medium text-aws-blue">{service.name}</span>
                  </div>
                  <span className="text-xs text-aws-gray font-medium">
                    {formatCurrency(service.monthlyCost)}/mo
                  </span>
                </div>
              );
            })}
            
            {services.length > 8 && (
              <div className="text-center py-2">
                <span className="text-xs text-aws-gray">
                  +{services.length - 8} more services
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Summary */}
      <div className="p-4 border-b border-aws-border">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-green-800">Total Monthly Cost</h3>
          </div>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(totalCost)}
          </div>
          <div className="text-sm text-green-600 mt-1">
            Estimated for US East (N. Virginia)
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="p-4 border-b border-aws-border">
        <h3 className="font-semibold text-aws-blue mb-3 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2" />
          Optimization Tips
        </h3>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <div className="text-sm font-medium text-blue-800">Reserved Instances</div>
            <div className="text-xs text-blue-600 mt-1">Save up to 72% with 1-3 year reserved instances</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-sm font-medium text-green-800">Spot Instances</div>
            <div className="text-xs text-green-600 mt-1">Use spot instances for fault-tolerant workloads</div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-sm font-medium text-yellow-800">Auto Scaling</div>
            <div className="text-xs text-yellow-600 mt-1">Optimize scaling policies to match demand patterns</div>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="p-4">
        <h3 className="font-semibold text-aws-blue mb-3">Export & Download</h3>
        <div className="space-y-2">
          <Button
            className="w-full aws-orange aws-orange-hover text-sm font-medium transition-colors"
            onClick={() => {
              const messageId = messages?.findLast((msg: any) => 
                msg.role === "assistant" && msg.architecture
              )?.id;
              if (messageId) {
                window.open(`/api/architectures/${messageId}/cloudformation`, '_blank');
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            CloudFormation Template
          </Button>
          
          <Button
            variant="outline"
            className="w-full border-[hsl(var(--aws-light-blue))] text-[hsl(var(--aws-light-blue))] hover:bg-[hsl(var(--aws-light-blue))] hover:text-white text-sm font-medium transition-colors"
            onClick={() => {
              const messageId = messages?.findLast((msg: any) => 
                msg.role === "assistant" && msg.architecture
              )?.id;
              if (messageId) {
                window.open(`/api/architectures/${messageId}/pricing-csv`, '_blank');
              }
            }}
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Pricing Breakdown (CSV)
          </Button>
          
          <Button
            variant="outline"
            className="w-full border-aws-border text-aws-gray hover:bg-gray-100 text-sm font-medium transition-colors"
            onClick={() => {
              const messageId = messages?.findLast((msg: any) => 
                msg.role === "assistant" && msg.architecture
              )?.id;
              if (messageId) {
                window.open(`/api/architectures/${messageId}/terraform`, '_blank');
              }
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Terraform Template
          </Button>
          
          <Button
            variant="outline"
            className="w-full border-aws-border text-aws-gray hover:bg-gray-100 text-sm font-medium transition-colors"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'AWS Architecture Recommendation',
                  text: `Check out this AWS architecture recommendation with estimated cost of ${formatCurrency(totalCost)}/month`,
                  url: window.location.href
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Share Architecture
          </Button>
        </div>
      </div>
    </aside>
  );
}
