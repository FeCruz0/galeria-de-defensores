import { useState, useEffect } from 'react';

export interface PresenceUserInfo {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  role: string;
  isTyping: boolean;
  isRolling: boolean;
  online_at: string;
}

export function useTablePresence(
  supabase: any,
  tableId: string,
  currentUser: any,
  profile: any,
  userRole: string
) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUserInfo[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!tableId || !currentUser || !supabase) return;

    const presenceChannel = supabase.channel(`presence-table-${tableId}`, {
      config: { presence: { key: currentUser.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const usersList: PresenceUserInfo[] = [];
        
        Object.keys(state).forEach((key) => {
          const presenceArray = state[key] as any[];
          if (presenceArray && presenceArray.length > 0) {
            const latestInfo = presenceArray[presenceArray.length - 1];
            usersList.push({
              user_id: latestInfo.user_id,
              username: latestInfo.username || 'Usuário',
              avatar_url: latestInfo.avatar_url || null,
              role: latestInfo.role || 'SPECTATOR',
              isTyping: !!latestInfo.isTyping,
              isRolling: !!latestInfo.isRolling,
              online_at: latestInfo.online_at || new Date().toISOString()
            });
          }
        });
        
        setOnlineUsers(usersList);
      });

    presenceChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: currentUser.id,
          username: profile?.username || 'Usuário',
          avatar_url: profile?.avatar_url || null,
          role: userRole,
          isTyping,
          isRolling,
          online_at: new Date().toISOString()
        });
      }
    });

    setChannel(presenceChannel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [tableId, currentUser, profile, userRole, supabase]);

  // Atualizar o status de digitação/rolagem em tempo real enviando track atualizado
  useEffect(() => {
    if (channel && channel.state === 'joined' && currentUser) {
      channel.track({
        user_id: currentUser.id,
        username: profile?.username || 'Usuário',
        avatar_url: profile?.avatar_url || null,
        role: userRole,
        isTyping,
        isRolling,
        online_at: new Date().toISOString()
      }).catch((err: any) => console.error('Erro ao atualizar presença:', err));
    }
  }, [isTyping, isRolling, channel, currentUser, profile, userRole]);

  return {
    onlineUsers,
    isTyping,
    setIsTyping,
    isRolling,
    setIsRolling
  };
}
