import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import TableNewClient from '@/components/TableNewClient';

export const dynamic = 'force-dynamic';

export default async function NewTablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <TableNewClient />;
}
