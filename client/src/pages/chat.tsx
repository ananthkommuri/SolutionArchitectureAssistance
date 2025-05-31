import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatSidebar from "@/components/chat-sidebar";
import ChatMessages from "@/components/chat-messages";
import ArchitecturePanel from "@/components/chat-architecture-panel";
import { Button } from "@/components/ui/button";
import { SiAmazonaws } from "react-icons/si";
import { Plus, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ChatPage() {
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);

  const { data: chatSessions, refetch: refetchSessions } = useQuery({
    queryKey: ["/api/chat-sessions"],
  });

  const handleNewChat = async () => {
    try {
      const response = await apiRequest("POST", "/api/chat-sessions", {
        title: "New Architecture Discussion"
      });
      const newSession = await response.json();
      setCurrentChatId(newSession.id);
      refetchSessions();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  return (
    <div className="min-h-screen bg-aws-light-gray">
      {/* Header */}
      <header className="aws-blue shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <SiAmazonaws className="text-[hsl(var(--aws-orange))] text-2xl" />
            <h1 className="text-xl font-semibold text-white">Architecture Assistant</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleNewChat}
              className="aws-orange aws-orange-hover px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-white">Solutions Architect</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-72px)]">
        {/* Sidebar */}
        <ChatSidebar 
          chatSessions={chatSessions || []}
          currentChatId={currentChatId}
          onChatSelect={setCurrentChatId}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <ChatMessages 
            chatId={currentChatId}
            onChatCreated={(id) => {
              setCurrentChatId(id);
              refetchSessions();
            }}
          />
        </main>

        {/* Architecture Panel */}
        <ArchitecturePanel chatId={currentChatId} />
      </div>
    </div>
  );
}
