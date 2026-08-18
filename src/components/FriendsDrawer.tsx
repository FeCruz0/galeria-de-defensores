'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  X, 
  Check, 
  UserX, 
  Search, 
  Send,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  fetchUserFriends, 
  fetchDirectMessages, 
  Friendship, 
  DirectMessage 
} from '@/services/socialService';
import { 
  sendFriendRequestAction, 
  respondFriendRequestAction, 
  sendDirectMessageAction 
} from '@/actions/socialActions';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/lib/formatters';
import SystemModal, { SystemModalType } from './SystemModal';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function FriendsDrawer({
  isOpen,
  onClose,
  currentUserId
}: FriendsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'amigos' | 'pendentes' | 'adicionar'>('amigos');
  const [friendsList, setFriendsList] = useState<Friendship[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friendship | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  
  // Search & add input
  const [searchQuery, setSearchQuery] = useState('');
  const [dmCooldownRemaining, setDmCooldownRemaining] = useState<number>(0);

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

  const loadFriendsData = async () => {
    if (!currentUserId) return;
    const data = await fetchUserFriends(currentUserId);
    setFriendsList(data);
  };

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    loadFriendsData();

    // Realtime channel for friendships and DMs
    const channel = supabase
      .channel(`social-user-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => loadFriendsData()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          if (
            activeFriend &&
            (newMsg.sender_id === activeFriend.friend_profile?.id ||
             newMsg.receiver_id === activeFriend.friend_profile?.id)
          ) {
            setDirectMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUserId, activeFriend]);

  // Load DMs when active friend changes
  useEffect(() => {
    if (!activeFriend?.friend_profile?.id) return;
    fetchDirectMessages(currentUserId, activeFriend.friend_profile.id).then((msgs) => {
      setDirectMessages(msgs);
    });
  }, [activeFriend, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [directMessages]);

  useEffect(() => {
    if (dmCooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setDmCooldownRemaining((prev) => (prev > 0.1 ? Number((prev - 0.1).toFixed(1)) : 0));
    }, 100);
    return () => clearInterval(interval);
  }, [dmCooldownRemaining]);

  if (!isOpen) return null;

  const acceptedFriends = friendsList.filter((f) => f.status === 'accepted');
  const pendingRequests = friendsList.filter(
    (f) => f.status === 'pending' && f.friend_id === currentUserId
  );

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const res = await sendFriendRequestAction({ targetInput: searchQuery.trim() });
    if (res.success) {
      setModalConfig({
        isOpen: true,
        title: 'Solicitação Enviada',
        message: 'Solicitação de amizade enviada com sucesso!',
        type: 'success'
      });
      setSearchQuery('');
      loadFriendsData();
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Erro',
        message: res.error || 'Não foi possível enviar solicitação',
        type: 'alert'
      });
    }
  };

  const handleRespondRequest = async (friendshipId: string, action: 'accept' | 'reject' | 'block') => {
    const res = await respondFriendRequestAction({ friendshipId, action });
    if (res.success) {
      loadFriendsData();
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Erro',
        message: res.error || 'Erro ao responder solicitação',
        type: 'alert'
      });
    }
  };

  const handleSendDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmInput.trim() || !activeFriend?.friend_profile?.id || dmCooldownRemaining > 0) return;

    const friendId = activeFriend.friend_profile.id;
    const content = dmInput.trim();
    if (content.length > 1000) {
      setModalConfig({
        isOpen: true,
        title: 'Aviso',
        message: 'A mensagem excedeu o limite de 1000 caracteres.',
        type: 'alert'
      });
      return;
    }

    setDmCooldownRemaining(1);
    setDmInput('');

    const res = await sendDirectMessageAction({
      receiverId: friendId,
      content
    });

    if (res.success && res.data) {
      const newMsg = res.data;
      setDirectMessages((prev) => [...prev, newMsg]);
    } else {
      setModalConfig({
        isOpen: true,
        title: 'Erro de Envio',
        message: res.error || 'Falha ao enviar mensagem',
        type: 'alert'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in">
        
        {/* Botão de Fechar no Canto Superior Direito */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-30 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl transition-all cursor-pointer shadow-md"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar: Navigation & Friends List */}
        <div className="w-full md:w-80 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex justify-between items-center pr-14 md:pr-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Social & Amigos
            </h3>
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-2 gap-1 bg-slate-900/60 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('amigos')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'amigos' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Amigos ({acceptedFriends.length})
            </button>

            <button
              onClick={() => setActiveTab('pendentes')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
                activeTab === 'pendentes' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendentes
              {pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('adicionar')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'adicionar' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
            {activeTab === 'amigos' && (
              acceptedFriends.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-8">Nenhum amigo adicionado ainda.</p>
              ) : (
                acceptedFriends.map((friend) => {
                  const isSelected = activeFriend?.id === friend.id;
                  const profile = friend.friend_profile;
                  return (
                    <div
                      key={friend.id}
                      onClick={() => setActiveFriend(friend)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <img
                        src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={profile?.username || 'Amigo'}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold block truncate">{profile?.username || 'Aventureiro'}</span>
                        <span className="text-[10px] text-slate-400 block truncate">Clique para abrir chat privado</span>
                      </div>
                    </div>
                  );
                })
              )
            )}

            {activeTab === 'pendentes' && (
              pendingRequests.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-8">Nenhuma solicitação pendente.</p>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={req.friend_profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={req.friend_profile?.username || 'Usuário'}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-200 truncate">{req.friend_profile?.username}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                        title="Aceitar Amizade"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                        title="Recusar"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'adicionar' && (
              <form onSubmit={handleAddFriend} className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 block uppercase">Buscar por ID ou Nome</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Digite o Nome de Usuário ou UUID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none text-slate-200"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Enviar Solicitação
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main Panel: DM Conversation */}
        <div className="flex-1 flex flex-col bg-slate-900/20">
          {activeFriend ? (
            <>
              {/* Header */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center pr-14">
                <div className="flex items-center gap-3">
                  <img
                    src={activeFriend.friend_profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={activeFriend.friend_profile?.username || 'Amigo'}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{activeFriend.friend_profile?.username}</h4>
                    <span className="text-[10px] text-slate-400">Mensagens diretas privadas e criptografadas</span>
                  </div>
                </div>
              </div>

              {/* DM Messages Scroll Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
                {directMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                    <Sparkles className="w-8 h-8 text-purple-400/30" />
                    <p className="text-xs">Nenhuma mensagem trocada ainda com {activeFriend.friend_profile?.username}.</p>
                  </div>
                ) : (
                  directMessages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed break-words ${
                            isMe
                              ? 'bg-purple-600 text-white rounded-tr-none'
                              : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* DM Input */}
              {dmInput.length > 0 && (
                <div className="flex justify-between items-center px-4 py-1 text-[10px] bg-slate-950/45 border-t border-slate-900">
                  <span className="text-slate-500">Tamanho da mensagem</span>
                  <span className={`font-mono font-medium ${
                    dmInput.length > 900 ? 'text-rose-400' :
                    dmInput.length > 750 ? 'text-amber-400' :
                    'text-slate-400'
                  }`}>
                    {dmInput.length} / 1000
                  </span>
                </div>
              )}
               <form onSubmit={handleSendDM} className="p-3 bg-slate-950/60 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  placeholder={dmCooldownRemaining > 0 ? `Aguarde ${dmCooldownRemaining}s...` : `Enviar mensagem privada para ${activeFriend.friend_profile?.username}...`}
                  value={dmInput}
                  onChange={(e) => setDmInput(e.target.value)}
                  maxLength={1000}
                  disabled={dmCooldownRemaining > 0}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!dmInput.trim() || dmCooldownRemaining > 0}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-[44px]"
                >
                  {dmCooldownRemaining > 0 ? (
                    <span className="text-[10px] font-mono font-bold text-amber-300">{dmCooldownRemaining}s</span>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-semibold text-slate-400">Selecione um amigo para iniciar uma conversa privada</p>
            </div>
          )}
        </div>

      </div>

      <SystemModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}
