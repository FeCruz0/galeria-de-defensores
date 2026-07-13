'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Users, Loader2, Save } from 'lucide-react';

export default function NewTablePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    }
    checkUser();
  }, [router, supabase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          name: name.trim(),
          description: description.trim(),
          master_id: userId,
          is_private: isPrivate,
          password: isPrivate && password ? password : null,
          rules_mod: {},
          custom_damage_types: [],
          custom_unique_advantages: [],
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Redireciona para a mesa criada
        router.push(`/tables/${data.id}`);
      }
    } catch (err) {
      console.error('Erro ao criar mesa:', err);
      alert('Ocorreu um erro ao criar a mesa de jogo.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg text-white">Nova Mesa de Jogo</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-[#0f172a]/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Reúna seu grupo</h2>
              <p className="text-slate-400 text-xs">Crie um espaço online para rolar dados em tempo real</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Nome da Mesa */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Nome da Mesa
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campanha Só Aventuras"
                className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Descrição da Campanha
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve introdução para os jogadores..."
                rows={3}
                className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Configurações de Privacidade */}
            <div className="p-4 bg-slate-800/20 border border-slate-800/80 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200 text-sm block">Mesa Privada</span>
                  <span className="text-xs text-slate-400">Jogadores precisarão de uma senha para entrar na mesa</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                />
              </div>

              {isPrivate && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Defina uma senha"
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Botão de Enviar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-55"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Mesa de Jogo
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
