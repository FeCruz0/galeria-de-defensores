import { supabase as staticSupabase } from '../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

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

function getSupabase(customClient?: SupabaseClient) {
  return customClient || staticSupabase;
}

export async function fetchUserFriends(userId: string, customClient?: SupabaseClient): Promise<Friendship[]> {
  const supabase = getSupabase(customClient);
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
  const friendsList = (data || []) as { user_id: string; friend_id: string }[];
  const friendUserIds = friendsList.map((f) => (f.user_id === userId ? f.friend_id : f.user_id));
  
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', friendUserIds);

  if (profError) {
    console.error('Error fetching profiles for friends:', profError);
  }

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Formatar perfil de amigo relativo ao usuário logado
  return friendsList.map((f) => {
    const targetId = f.user_id === userId ? f.friend_id : f.user_id;
    return {
      ...f,
      friend_profile: (profileMap.get(targetId) || { id: targetId, username: 'Aventureiro', avatar_url: '' }) as { id: string; username: string | null; avatar_url: string | null },
    };
  }) as Friendship[];
}

export async function searchUserProfile(query: string, customClient?: SupabaseClient) {
  const supabase = getSupabase(customClient);
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

export async function sendFriendRequest(userId: string, friendId: string, customClient?: SupabaseClient): Promise<Friendship | null> {
  const supabase = getSupabase(customClient);
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

export async function updateFriendshipStatus(friendshipId: string, status: 'accepted' | 'blocked', customClient?: SupabaseClient): Promise<boolean> {
  const supabase = getSupabase(customClient);
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

export async function deleteFriendship(friendshipId: string, customClient?: SupabaseClient): Promise<boolean> {
  const supabase = getSupabase(customClient);
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

export async function fetchDirectMessages(userId: string, friendId: string, customClient?: SupabaseClient): Promise<DirectMessage[]> {
  const supabase = getSupabase(customClient);
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
  const messagesList = (data || []) as { sender_id: string; receiver_id: string; content: string }[];
  const senderIds = Array.from(new Set(messagesList.map((m) => m.sender_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', senderIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return messagesList.map((m) => ({
    ...m,
    sender_profile: (profileMap.get(m.sender_id) || { username: 'Aventureiro', avatar_url: '' }) as { username: string | null; avatar_url: string | null }
  })) as DirectMessage[];
}

export async function sendDirectMessage(senderId: string, receiverId: string, content: string, customClient?: SupabaseClient): Promise<DirectMessage | null> {
  const supabase = getSupabase(customClient);
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
