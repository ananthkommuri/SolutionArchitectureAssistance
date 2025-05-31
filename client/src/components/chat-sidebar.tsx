import { Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@shared/schema";

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  currentChatId: number | null;
  onChatSelect: (id: number) => void;
}

export default function ChatSidebar({ chatSessions, currentChatId, onChatSelect }: ChatSidebarProps) {
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return past.toLocaleDateString();
  };

  return (
    <aside className="w-80 bg-white border-r border-aws-border overflow-y-auto custom-scrollbar">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-aws-blue">Recent Conversations</h2>
        
        {chatSessions.length === 0 ? (
          <div className="text-center py-8 text-aws-gray">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to get architecture recommendations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatSessions.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat.id)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors",
                  currentChatId === chat.id
                    ? "bg-aws-light-gray border-l-4 border-[hsl(var(--aws-orange))]"
                    : "bg-white hover:bg-gray-50"
                )}
              >
                <div className="font-medium text-sm text-aws-blue line-clamp-2">
                  {chat.title}
                </div>
                <div className="text-xs text-aws-gray mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTimeAgo(chat.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {chatSessions.length > 0 && (
        <div className="p-4 border-t border-aws-border">
          <button className="w-full text-left text-sm text-aws-gray hover:text-aws-blue transition-colors flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            View All Conversations
          </button>
        </div>
      )}
    </aside>
  );
}
