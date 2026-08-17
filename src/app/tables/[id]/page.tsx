import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TableClient from '@/components/TableClient';
import { fetchTableNpcs } from '@/services/npcService';

// Forçar renderização dinâmica para que o RSC busque dados atualizados a cada requisição
export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function GameTablePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Executar todas as consultas em paralelo no servidor (RSC)
  const [
    profileRes,
    tableRes,
    messagesRes,
    playersRes,
    npcsData,
    linkedCharsRes,
    myCharsRes,
    customCondsRes,
    publicJournalRes,
    privateJournalRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('tables').select('*, rule_systems(name, attribute_roll_config)').eq('id', id).maybeSingle(),
    supabase.from('chat_messages').select('*').eq('table_id', id).order('created_at', { ascending: true }).limit(100),
    supabase.from('table_players').select('player_id, role, profiles(username, avatar_url)').eq('table_id', id),
    fetchTableNpcs(id, supabase),
    supabase.from('characters').select('*').eq('table_id', id),
    supabase.from('characters').select('*').eq('user_id', user.id),
    supabase.from('table_status_conditions').select('*').eq('table_id', id),
    supabase.from('campaign_journals').select('*').eq('table_id', id).eq('is_public', true).maybeSingle(),
    supabase.from('campaign_journals').select('*').eq('table_id', id).eq('user_id', user.id).eq('is_public', false).maybeSingle()
  ]);

  const table = tableRes.data;
  if (!table) {
    redirect('/dashboard');
  }

  const profile = profileRes.data || null;
  const messages = messagesRes.data || [];
  const tablePlayers = playersRes.data || [];
  const linkedCharacters = (linkedCharsRes.data || []) as any[];
  const myCharacters = (myCharsRes.data || []) as any[];
  const customConditions = (customCondsRes.data || []) as any[];
  const publicJournal = publicJournalRes.data || null;
  const privateJournal = privateJournalRes.data || null;

  return (
    <TableClient
      tableId={id}
      initialCurrentUser={user}
      initialProfile={profile}
      initialTable={table as any}
      initialMessages={messages}
      initialTablePlayers={tablePlayers}
      initialTableNpcs={npcsData}
      initialLinkedCharacters={linkedCharacters}
      initialMyCharacters={myCharacters}
      initialCustomConditions={customConditions}
      initialPublicJournal={publicJournal}
      initialPrivateJournal={privateJournal}
    />
  );
}
