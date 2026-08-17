import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import { fetchAllPublicTables } from '@/services/tableService';

// Forçar renderização dinâmica para que o RSC busque dados atualizados a cada requisição
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Executar todas as consultas em paralelo no servidor (RSC)
  const [
    profileRes,
    charactersRes,
    ownedTablesRes,
    playerTablesRes,
    systemsRes,
    notificationsRes,
    publicTables
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('characters').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('tables').select('*').eq('master_id', user.id),
    supabase.from('table_players').select('table_id, tables(*)').eq('player_id', user.id),
    supabase.from('rule_systems').select('*').or(`user_id.is.null,user_id.eq.${user.id}`).order('name', { ascending: true }),
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false }),
    fetchAllPublicTables(supabase)
  ]);

  const profile = profileRes.data || null;
  const characters = (charactersRes.data || []) as any[];
  const ownedTables = (ownedTablesRes.data || []) as any[];
  const guestTables = playerTablesRes.data
    ? playerTablesRes.data.map((item: any) => item.tables).filter(Boolean)
    : [];

  const allTables = [
    ...ownedTables,
    ...guestTables
  ].filter((table: any, index: number, self: any[]) =>
    self.findIndex((t) => t.id === table.id) === index
  );

  const ruleSystems = (systemsRes.data || []) as any[];
  const notifications = (notificationsRes.data || []) as any[];

  return (
    <DashboardClient
      initialProfile={profile}
      initialCharacters={characters}
      initialTables={allTables}
      initialPublicTables={publicTables}
      initialRuleSystems={ruleSystems}
      initialNotifications={notifications}
    />
  );
}
