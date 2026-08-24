import React, { useState, useRef, useEffect, useOptimistic } from 'react';
import { Send } from 'lucide-react';
import { Table, Profile, Character, ChatMessage } from '@/types/game';
import { formatTime } from '@/lib/formatters';
import { useVirtualizer } from '@tanstack/react-virtual';

interface TableChatPanelProps {
  table: Table | null;
  chatChannel: 'ON' | 'OFF';
  setChatChannel: (channel: 'ON' | 'OFF') => void;
  messages: ChatMessage[];
  currentUser: any;
  profile: Profile | null;
  linkedCharacters: Character[];
  selectedSenderIdentity: string;
  setSelectedSenderIdentity: (identity: string) => void;
  chatCooldownRemaining: number;
  onSendMessage: (content: string) => Promise<void>;
  userRole: 'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST';
  setIsTyping?: (typing: boolean) => void;
}

export default function TableChatPanel({
  table,
  chatChannel,
  setChatChannel,
  messages,
  currentUser,
  profile,
  linkedCharacters,
  selectedSenderIdentity,
  setSelectedSenderIdentity,
  chatCooldownRemaining,
  onSendMessage,
  userRole,
  setIsTyping,
}: TableChatPanelProps) {
  const [messageText, setMessageText] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timeout de digitação quando desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (setIsTyping) {
      setIsTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    }
  };

  // Hook otimista do React 19 para mensagens
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: ChatMessage) => [...state, newMessage]
  );

  const filteredMessages = optimisticMessages.filter(
    (msg) => !table?.has_separated_chat || (msg.channel || 'ON') === chatChannel
  );

  // Virtualizador de lista para alta escala de mensagens
  const virtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Auto-scroll chat feed to bottom on new messages
  useEffect(() => {
    if (filteredMessages.length > 0) {
      virtualizer.scrollToIndex(filteredMessages.length - 1, { align: 'end' });
    }
  }, [filteredMessages.length, chatChannel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || chatCooldownRemaining > 0) return;
    const textToSend = messageText.trim();

    if (setIsTyping) {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Adicionar mensagem otimista localmente antes do retorno da requisição assíncrona
    addOptimisticMessage({
      id: `temp-${Date.now()}`,
      table_id: table?.id || '',
      sender_id: currentUser?.id || '',
      sender_name: selectedSenderIdentity === 'MASTER'
        ? (profile?.username || 'Mestre')
        : (linkedCharacters.find(c => c.id === selectedSenderIdentity)?.name || 'Personagem'),
      content: textToSend,
      type: 'TEXT',
      channel: chatChannel,
      is_edited: false,
      created_at: new Date().toISOString()
    });

    setMessageText('');
    await onSendMessage(textToSend);
  };

  return (
    <>
      {/* Sub-abas de Canal se o Chat Separado estiver Ativo na Mesa */}
      {table?.has_separated_chat && (
        <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-3 py-1.5 gap-2">
          <button
            onClick={() => setChatChannel('ON')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              chatChannel === 'ON'
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚔️ Narrativa (ON)
          </button>
          <button
            onClick={() => setChatChannel('OFF')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              chatChannel === 'OFF'
                ? 'bg-slate-700/40 text-slate-200 border border-slate-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Conversa Livre (OFF)
          </button>
        </div>
      )}

      {/* Feed de Mensagens */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-none"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const msg = filteredMessages[virtualItem.index];
            if (!msg) return null;
            const isMe = msg.sender_id === currentUser?.id;

            return (
              <div
                key={virtualItem.key}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                className="w-full flex flex-col py-1.5"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {msg.type === 'ROLL' ? (
                  <div className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs text-purple-400">
                      <span className="font-bold">{msg.sender_name}</span>
                      <span>{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-300">{msg.content}</p>
                    {msg.roll_result && (
                      <div className="bg-slate-900/60 p-2.5 rounded-lg flex items-center justify-between border border-slate-800">
                        <span className="text-xs font-mono text-slate-400">{msg.roll_result.componentsText}</span>
                        <div className="text-right">
                          <span className={`text-lg font-black ${msg.roll_result.isCrit ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                            {msg.roll_result.total}
                          </span>
                          {msg.roll_result.isCrit && (
                            <span className="text-[10px] text-amber-400 block font-bold">CRÍTICO!</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`flex flex-col max-w-[85%] ${isMe ? 'self-end ml-auto' : 'mr-auto'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-400 truncate flex items-center gap-1">
                        {msg.sender_avatar && (
                          <img src={msg.sender_avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover inline-block" />
                        )}
                        {msg.sender_name}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    <div
                      className={`p-3 text-xs leading-relaxed break-words whitespace-pre-wrap rounded-2xl ${
                        isMe
                          ? 'bg-purple-600 text-white rounded-tr-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Input Form com Seletor de Identidade */}
      <div className="p-3 border-t border-slate-800 bg-[#0c1224] space-y-2 flex-shrink-0">
        {/* Seletor de Identidades se for Chat ON e a mesa tiver chats separados */}
        {table?.has_separated_chat && chatChannel === 'ON' && (
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>Falando como:</span>
            {currentUser?.id === table.master_id ? (
              <select
                value={selectedSenderIdentity}
                onChange={(e) => setSelectedSenderIdentity(e.target.value)}
                className="bg-slate-900 border border-slate-700/60 rounded px-2 py-0.5 text-[11px] text-amber-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value="MASTER">🛡️ Mestre</option>
                {linkedCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-purple-300">
                👤 {linkedCharacters.find((c) => c.user_id === currentUser?.id)?.name || `${profile?.username} (Sem Ficha)`}
              </span>
            )}
          </div>
        )}

        {messageText.length > 0 && (
          <div className="flex justify-between items-center px-1 pb-1 text-[10px]">
            <span className="text-slate-500">Tamanho da mensagem</span>
            <span
              className={`font-mono font-medium ${
                messageText.length > 900 ? 'text-rose-400' : messageText.length > 750 ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              {messageText.length} / 1000
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={handleInputChange}
            placeholder={
              chatCooldownRemaining > 0
                ? `Aguarde ${chatCooldownRemaining}s...`
                : table?.has_separated_chat && chatChannel === 'OFF'
                ? 'Mensagem no chat livre (OFF)...'
                : 'Mensagem no chat narrativo (ON)...'
            }
            maxLength={1000}
            disabled={chatCooldownRemaining > 0 || userRole === 'SPECTATOR' || userRole === 'GUEST'}
            className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || chatCooldownRemaining > 0 || userRole === 'SPECTATOR' || userRole === 'GUEST'}
            className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-95 disabled:opacity-55 min-w-[44px] flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
