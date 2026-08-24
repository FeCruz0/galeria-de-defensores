import { useState, useEffect, useMemo } from 'react';

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
  const [presenceUsers, setPresenceUsers] = useState<Omit<PresenceUserInfo, 'isTyping' | 'isRolling'>[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [rollingUsers, setRollingUsers] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!tableId || !currentUser || !supabase) return;

    const presenceChannel = supabase.channel(`presence-table-${tableId}`, {
      config: {
        presence: { key: currentUser.id },
        broadcast: { self: false }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const usersList: Omit<PresenceUserInfo, 'isTyping' | 'isRolling'>[] = [];
        
        Object.keys(state).forEach((key) => {
          const presenceArray = state[key] as any[];
          if (presenceArray && presenceArray.length > 0) {
            const latestInfo = presenceArray[presenceArray.length - 1];
            usersList.push({
              user_id: latestInfo.user_id,
              username: latestInfo.username || 'Usuário',
              avatar_url: latestInfo.avatar_url || null,
              role: latestInfo.role || 'SPECTATOR',
              online_at: latestInfo.online_at || new Date().toISOString()
            });
          }
        });
        
        setPresenceUsers(usersList);
      })
      .on('broadcast', { event: 'typing_status' }, ({ payload }: any) => {
        if (payload && payload.user_id) {
          setTypingUsers((prev) => ({ ...prev, [payload.user_id]: !!payload.isTyping }));
        }
      })
      .on('broadcast', { event: 'dice_roll_status' }, ({ payload }: any) => {
        if (payload && payload.user_id) {
          setRollingUsers((prev) => ({ ...prev, [payload.user_id]: !!payload.isRolling }));
        }
      });

    presenceChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: currentUser.id,
          username: profile?.username || 'Usuário',
          avatar_url: profile?.avatar_url || null,
          role: userRole,
          online_at: new Date().toISOString()
        });
      }
    });

    setChannel(presenceChannel);

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [tableId, currentUser, profile, userRole, supabase]);

  // Transmitir status de digitação para a mesa em tempo real via Broadcast
  useEffect(() => {
    if (channel && channel.state === 'joined' && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'typing_status',
        payload: { user_id: currentUser.id, isTyping }
      }).catch((err: any) => console.error('Erro ao enviar broadcast de digitação:', err));
    }
  }, [isTyping, channel, currentUser]);

  // Transmitir status de animação de rolagens para a mesa em tempo real via Broadcast
  useEffect(() => {
    if (channel && channel.state === 'joined' && currentUser) {
      channel.send({
        type: 'broadcast',
        event: 'dice_roll_status',
        payload: { user_id: currentUser.id, isRolling }
      }).catch((err: any) => console.error('Erro ao enviar broadcast de rolagem:', err));
    }
  }, [isRolling, channel, currentUser]);

  // Sincronizar estados locais do usuário corrente
  useEffect(() => {
    if (currentUser) {
      setTypingUsers((prev) => ({ ...prev, [currentUser.id]: isTyping }));
    }
  }, [isTyping, currentUser]);

  useEffect(() => {
    if (currentUser) {
      setRollingUsers((prev) => ({ ...prev, [currentUser.id]: isRolling }));
    }
  }, [isRolling, currentUser]);

  // Mesclar estados em tempo real de presença com eventos de broadcast efêmeros
  const onlineUsers = useMemo(() => {
    return presenceUsers.map((user) => ({
      ...user,
      isTyping: !!typingUsers[user.user_id],
      isRolling: !!rollingUsers[user.user_id]
    }));
  }, [presenceUsers, typingUsers, rollingUsers]);

  return {
    onlineUsers,
    isTyping,
    setIsTyping,
    isRolling,
    setIsRolling
  };
}
