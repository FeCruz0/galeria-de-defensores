import { supabase } from '../lib/supabase';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
  friend_profile?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export async function fetchUserFriends(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

  if (error) {
    console.error('Error fetching user friends:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Extrair IDs de perfis dos amigos
  const friendUserIds = data.map((f: any) => (f.user_id === userId ? f.friend_id : f.user_id));
  
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', friendUserIds);

  if (profError) {
    console.error('Error fetching profiles for friends:', profError);
  }

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Formatar perfil de amigo relativo ao usuário logado
  return data.map((f: any) => {
    const targetId = f.user_id === userId ? f.friend_id : f.user_id;
    return {
      ...f,
      friend_profile: profileMap.get(targetId) || { id: targetId, username: 'Aventureiro', avatar_url: '' },
    };
  }) as Friendship[];
}

export async function searchUserProfile(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try search by UUID exact match first if valid UUID
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed);

  if (isUuid) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', trimmed)
      .single();
    if (data) return data;
  }

  // Search by username
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', trimmed)
    .single();

  return data || null;
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<Friendship | null> {
  const { data, error } = await supabase
    .from('friendships')
    .insert([{ user_id: userId, friend_id: friendId, status: 'pending' }])
    .select('*')
    .single();

  if (error) {
    console.error('Error sending friend request:', error);
    return null;
  }
  return data as Friendship;
}

export async function updateFriendshipStatus(friendshipId: string, status: 'accepted' | 'blocked'): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', friendshipId);

  if (error) {
    console.error('Error updating friendship status:', error);
    return false;
  }
  return true;
}

export async function deleteFriendship(friendshipId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);

  if (error) {
    console.error('Error deleting friendship:', error);
    return false;
  }
  return true;
}

export async function fetchDirectMessages(userId: string, friendId: string): Promise<DirectMessage[]> {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching direct messages:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get sender profiles
  const senderIds = Array.from(new Set(data.map((m: any) => m.sender_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', senderIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return data.map((m: any) => ({
    ...m,
    sender_profile: profileMap.get(m.sender_id) || { username: 'Aventureiro', avatar_url: '' }
  })) as DirectMessage[];
}

export async function sendDirectMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage | null> {
  const { data, error } = await supabase
    .from('direct_messages')
    .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
    .select('*')
    .single();

  if (error) {
    console.error('Error sending direct message:', error);
    return null;
  }
  return data as DirectMessage;
}
