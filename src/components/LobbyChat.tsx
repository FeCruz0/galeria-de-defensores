'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  UserPlus, 
  Sparkles,
  Power,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendFriendRequestAction } from '@/actions/socialActions';
import { calculateLobbyCooldown } from '@/lib/validations/social';
import SystemModal, { SystemModalType } from './SystemModal';

interface LobbyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
}

interface OnlineUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

interface LobbyChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUsername: string;
  currentAvatarUrl?: string;
}

export default function LobbyChat({
  isOpen,
  onClose,
  currentUserId,
  currentUsername,
  currentAvatarUrl = ''
}: LobbyChatProps) {
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'online'>('chat');

  // Cooldown de envio
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Modal alert
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: SystemModalType;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Timer de Cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    // Connect to Supabase Broadcast & Presence channel for Lobby
    const channel = supabase.channel('lobby-global', {
      config: {
        presence: { key: currentUserId }
      }
    });

    // Listen for broadcasted messages (limit array to max 50 items in client memory)
    channel.on('broadcast', { event: 'lobby-msg' }, ({ payload }) => {
      setMessages((prev) => [...prev.slice(-49), payload]);
    });

    // Sync online presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: OnlineUser[] = [];
      Object.keys(state).forEach((key) => {
        const presences = state[key] as any[];
        if (presences && presences.length > 0) {
          users.push({
            userId: presences[0].userId,
            username: presences[0].username,
            avatarUrl: presences[0].avatarUrl
          });
        }
      });
      setOnlineUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: currentUserId,
          username: currentUsername || 'Aventureiro',
          avatarUrl: currentAvatarUrl
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUserId, currentUsername, currentAvatarUrl]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !channelRef.current || cooldownRemaining > 0) return;

    const newMsg: LobbyMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: currentUserId,
      senderName: currentUsername || 'Aventureiro',
      senderAvatar: currentAvatarUrl,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Retenção máxima de 50 mensagens em memória
    setMessages((prev) => [...prev.slice(-49), newMsg]);
    await channelRef.current.send({
      type: 'broadcast',
      event: 'lobby-msg',
      payload: newMsg
    });

    // Calcular cooldown proporcional (mínimo 5s, teto max 30s)
    const nextCooldown = calculateLobbyCooldown(text.length);
    setCooldownRemaining(nextCooldown);

    setInputText('');
  };

  const handleAddFriend = async (targetId: string, targetName: string) => {
    if (targetId === currentUserId) return;

    const result = await sendFriendRequestAction({ targetInput: targetId });
    if (result.success) {
      setModalConfig({
        isOpen: true,
        title: 'Solicitação Enviada',
        message: `Solicitação de amizade enviada para ${targetName}!`,
        type: 'success'
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Aviso',
        message: result.error || 'Não foi possível enviar a solicitação',
        type: 'alert'
      });
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-slate-950/80 border-l border-slate-800/80 flex flex-col shrink-0 h-full shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/90 border-b border-slate-800/80 flex justify-between items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-xl shrink-0">
            <MessageSquare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Lobby
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {onlineUsers.length} Online
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab(activeTab === 'chat' ? 'online' : 'chat')}
            className={`p-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'online'
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Alternar lista de usuários online"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
            title="Desconectar do Lobby e Ficar Offline"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30">
          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-purple-400/40 animate-bounce" />
                <p className="text-xs font-semibold text-slate-400">Lobby conectado</p>
                <p className="text-[11px]">Seja o primeiro a mandar um oi!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <img
                      src={msg.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className={`max-w-[80%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{msg.senderName}</span>
                        <span className="text-[9px] text-slate-500">{msg.timestamp}</span>
                        {!isMe && (
                          <button
                            onClick={() => handleAddFriend(msg.senderId, msg.senderName)}
                            className="text-[9px] text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                            title="Adicionar Amigo"
                          >
                            <UserPlus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words ${
                          isMe
                            ? 'bg-purple-600 text-white rounded-tr-none'
                            : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form com Cooldown */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={cooldownRemaining > 0 ? `Aguarde ${cooldownRemaining}s...` : 'Escreva no Lobby...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={cooldownRemaining > 0}
                maxLength={500}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || cooldownRemaining > 0}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20 cursor-pointer min-w-[70px]"
              >
                {cooldownRemaining > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] text-amber-300">
                    <Clock className="w-3 h-3 animate-spin" />
                    {cooldownRemaining}s
                  </span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </>
                )}
              </button>
            </div>
            {cooldownRemaining > 0 && (
              <span className="text-[10px] text-amber-400/80 flex items-center gap-1 justify-center">
                <Clock className="w-3 h-3" /> Cooldown ativo (proporcional ao tamanho da mensagem)
              </span>
            )}
          </form>
        </div>
      ) : (
        /* Tab: Online Users List */
        <div className="flex-1 p-3 overflow-y-auto bg-slate-900/30">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Usuários Online ({onlineUsers.length})</h4>
          <div className="space-y-2">
            {onlineUsers.map((user) => {
              const isMe = user.userId === currentUserId;
              return (
                <div
                  key={user.userId}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img
                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={user.username}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-200 block truncate">
                        {user.username} {isMe && '(Você)'}
                      </span>
                    </div>
                  </div>

                  {!isMe && (
                    <button
                      onClick={() => handleAddFriend(user.userId, user.username)}
                      className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SystemModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </aside>
  );
}
