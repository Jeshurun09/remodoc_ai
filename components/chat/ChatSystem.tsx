'use client';

import { useState, useEffect, useRef } from 'react';

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

interface Chat {
  id: string;
  type: string;
  name?: string;
  participants: Array<{
    user: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    sentAt: string;
    sender: {
      id: string;
      name: string;
    };
  }> | undefined;
  _count: {
    messages: number;
  };
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
  sender: {
    id: string;
    name: string;
  };
}

export default function ChatSystem() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chat');
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?chatId=${chatId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.id,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');

        // Update chat's last message
        setChats(prev =>
          prev.map(chat =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  messages: [{
                    id: message.id,
                    content: message.content,
                    sentAt: message.sentAt,
                    sender: message.sender,
                  }],
                }
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatDisplayName = (chat: Chat) => {
    if (chat.name) return chat.name;

    // For direct chats, show other participant's name
    const otherParticipants = chat.participants.filter(p => p.user.id !== 'current-user-id'); // Replace with actual user ID
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name;
    }

    return chat.participants.map(p => p.user.name).join(', ');
  };

  const getChatAvatar = (chat: Chat) => {
    const initials = getChatDisplayName(chat)
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return initials;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-96 flex items-center justify-center">
        <div className="animate-pulse">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-96">
      {/* Chat List */}
      <div className="bg-white rounded-lg shadow p-4 md:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <h2 className="text-lg font-semibold">Chats</h2>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No chats yet
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat?.id === chat.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                      {getChatAvatar(chat)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">
                          {getChatDisplayName(chat)}
                        </h4>
                        {chat._count.messages > 0 && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            {chat._count.messages}
                          </span>
                        )}
                      </div>
                      {chat.messages && chat.messages[0] && (
                        <p className="text-sm text-gray-600 truncate">
                          {chat.messages[0].sender.name}: {chat.messages[0].content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
        {selectedChat ? (
          <>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                {getChatAvatar(selectedChat)}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {getChatDisplayName(selectedChat)}
                </h2>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-400 rounded"></div>
                  {selectedChat.participants.length} participants
                </p>
              </div>
            </div>
            <div className="flex flex-col h-80">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                        {message.sender.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.sender.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(new Date(message.sentAt))}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="flex gap-2 mt-4">
                <input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <div className="w-4 h-4"></div>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-200 rounded mb-4 mx-auto"></div>
              <p>Select a chat to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}