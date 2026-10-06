import { useCallback, useEffect, useState } from "react";
import EmberBackground from "./components/EmberBackground";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import SettingsPanel from "./components/SettingsPanel";
import { api } from "./api/client";
import type { Conversation } from "./types";

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [backendDown, setBackendDown] = useState(false);

  const refreshConversations = useCallback((query?: string) => {
    api
      .listConversations(query)
      .then((c) => {
        setConversations(c);
        setBackendDown(false);
      })
      .catch(() => setBackendDown(true));
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const handleNewChat = () => setActiveId(null);

  const handleDelete = async (id: string) => {
    await api.deleteConversation(id);
    if (activeId === id) setActiveId(null);
    refreshConversations();
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <EmberBackground />

      {backendDown && (
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-lg border border-ember-600/40 bg-obsidian-900/95 px-4 py-2 text-sm text-ember-400 shadow-glass">
          Can't reach the DragonAI backend at 127.0.0.1:8000. Start it with{" "}
          <code className="text-ink-100">python run.py</code> in the backend folder.
        </div>
      )}

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onSearch={(q) => refreshConversations(q || undefined)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ChatWindow
        conversationId={activeId}
        onConversationCreated={(id) => {
          setActiveId(id);
          refreshConversations();
        }}
        onConversationUpdated={() => refreshConversations()}
      />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
