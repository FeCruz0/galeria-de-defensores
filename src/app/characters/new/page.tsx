import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import CharacterNewClient from '@/components/CharacterNewClient';

export const dynamic = 'force-dynamic';

export default async function NewCharacterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <CharacterNewClient />;
}
