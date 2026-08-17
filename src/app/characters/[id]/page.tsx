import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CharacterClient from '@/components/CharacterClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function CharacterSheetPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Carregar Personagem
  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!character) {
    redirect('/dashboard');
  }

  // 2. Carregar Perfil e Sistema de Regras em paralelo
  const systemId = character.rule_system_id || '33333333-3333-3333-3333-333333333333';
  const [profileRes, systemRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', character.user_id).maybeSingle(),
    supabase.from('rule_systems').select('*').eq('id', systemId).maybeSingle()
  ]);

  const profile = profileRes.data || null;
  const systemDef = systemRes.data || null;

  return (
    <CharacterClient
      characterId={id}
      initialCurrentUser={user}
      initialCharacter={character as any}
      initialProfile={profile}
      initialSystemDef={systemDef}
    />
  );
}
