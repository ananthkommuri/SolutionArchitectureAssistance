import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import type { Message, Architecture } from "@shared/schema";
import { cn } from "@/lib/utils";
import { getServiceIcon, formatCurrency } from "@/lib/aws-services";

interface ChatMessagesProps {
  chatId: number | null;
  onChatCreated: (id: number) => void;
}

interface MessageWithArchitecture extends Message {
  architecture?: Architecture;
}

export default function ChatMessages({ chatId, onChatCreated }: ChatMessagesProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat-sessions", chatId, "messages"],
    enabled: !!chatId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: number; content: string }) => {
      const response = await apiRequest("POST", `/api/chat-sessions/${chatId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions", chatId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat-sessions"] });
      setInputValue("");
    },
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chat-sessions", {
        title: "New Architecture Discussion"
      });
      return response.json();
    },
    onSuccess: (newChat) => {
      onChatCreated(newChat.id);
    },
  });

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!chatId) {
      // Create new chat first
      const newChat = await createChatMutation.mutateAsync();
      sendMessageMutation.mutate({ chatId: newChat.id, content: inputValue });
    } else {
      sendMessageMutation.mutate({ chatId, content: inputValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const renderMessage = (message: MessageWithArchitecture) => {
    const isUser = message.role === "user";
    
    return (
      <div key={message.id} className={cn("flex items-start space-x-3", isUser ? "justify-end" : "")}>
        {!isUser && (
          <div className="aws-orange p-2 rounded-full flex-shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
        )}
        
        <div className={cn(
          "max-w-3xl rounded-lg shadow-sm p-4",
          isUser 
            ? "aws-light-blue text-white" 
            : "bg-white border border-aws-border"
        )}>
          <div className="whitespace-pre-wrap text-sm">
            {message.content}
          </div>
          
          {message.architecture && (
            <div className="mt-4 space-y-4">
              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {message.architecture.services.slice(0, 6).map((service: any, index: number) => {
                  const serviceIcon = getServiceIcon(service.name);
                  return (
                    <div key={index} className="bg-aws-light-gray p-3 rounded-lg border border-aws-border">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">{serviceIcon.icon}</span>
                        <h4 className="font-semibold text-sm text-aws-blue">{service.name}</h4>
                      </div>
                      <p className="text-xs text-aws-gray mb-1">{service.description}</p>
                      <p className="text-sm font-medium text-green-600">
                        {formatCurrency(service.monthlyCost)}/month
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Total Cost */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  💰 Estimated Monthly Cost: {formatCurrency(message.architecture.totalCost / 100)}
                </h3>
                <div className="text-sm text-green-700">
                  Based on AWS pricing for US East (N. Virginia) region
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="aws-orange aws-orange-hover"
                  onClick={() => window.open(`/api/architectures/${message.id}/cloudformation`, '_blank')}
                >
                  📄 CloudFormation
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="aws-light-blue hover:bg-blue-600"
                  onClick={() => window.open(`/api/architectures/${message.id}/pricing-csv`, '_blank')}
                >
                  📊 Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[hsl(var(--aws-orange))] text-[hsl(var(--aws-orange))] hover:bg-[hsl(var(--aws-orange))] hover:text-white"
                  onClick={() => window.open(`/api/architectures/${message.id}/terraform`, '_blank')}
                >
                  🏗️ Terraform
                </Button>
              </div>
            </div>
          )}
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        )}
      </div>
    );
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <Bot className="w-16 h-16 mx-auto mb-4 text-[hsl(var(--aws-orange))]" />
            <h2 className="text-2xl font-semibold text-aws-blue mb-2">
              Welcome to AWS Architecture Assistant
            </h2>
            <p className="text-aws-gray mb-6">
              I'm here to help you design, optimize, and estimate costs for your AWS infrastructure. 
              Describe your requirements below to get started with AI-powered architecture recommendations.
            </p>
            <div className="bg-white rounded-lg p-4 border border-aws-border">
              <p className="text-sm text-aws-gray mb-2">
                <strong>Example prompts:</strong>
              </p>
              <ul className="text-sm text-left text-aws-gray space-y-1">
                <li>• "Design a scalable e-commerce platform for 100k daily users"</li>
                <li>• "I need a serverless API with real-time data processing"</li>
                <li>• "Help me migrate from on-premises to AWS with minimal downtime"</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-aws-border bg-white p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full border border-aws-border rounded-lg p-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--aws-orange))] focus:border-[hsl(var(--aws-orange))]"
                  rows={3}
                  placeholder="Describe your AWS architecture requirements..."
                  disabled={createChatMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || createChatMutation.isPending}
                  className="absolute right-3 bottom-3 aws-orange aws-orange-hover p-2 rounded-lg transition-colors"
                  size="sm"
                >
                  {createChatMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-aws-gray">
            <div>Press Enter to send, Shift+Enter for new line</div>
            <div>Powered by AWS best practices & OpenAI</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--aws-orange))]" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--aws-orange))]" />
              <p className="text-aws-gray">Start the conversation by describing your requirements</p>
            </div>
          </div>
        ) : (
          <>
            {messages?.map(renderMessage)}
            {sendMessageMutation.isPending && (
              <div className="flex items-start space-x-3">
                <div className="aws-orange p-2 rounded-full">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-aws-border">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-aws-gray rounded-full typing-dot"></div>
                    <div className="w-2 h-2 bg-aws-gray rounded-full typing-dot"></div>
                    <div className="w-2 h-2 bg-aws-gray rounded-full typing-dot"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-aws-border bg-white p-4">
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-aws-border rounded-lg p-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--aws-orange))] focus:border-[hsl(var(--aws-orange))]"
                rows={3}
                placeholder="Describe your AWS architecture requirements..."
                disabled={sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
                className="absolute right-3 bottom-3 aws-orange aws-orange-hover p-2 rounded-lg transition-colors"
                size="sm"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-aws-gray">
          <div>Press Enter to send, Shift+Enter for new line</div>
          <div>Powered by AWS best practices & OpenAI</div>
        </div>
      </div>
    </div>
  );
}
