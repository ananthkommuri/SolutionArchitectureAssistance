import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Describe your AWS architecture requirements..." 
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim() || disabled) return;
    
    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
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
              placeholder={placeholder}
              disabled={disabled}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || disabled}
              className="absolute right-3 bottom-3 aws-orange aws-orange-hover p-2 rounded-lg transition-colors"
              size="sm"
            >
              {disabled ? (
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
  );
}
