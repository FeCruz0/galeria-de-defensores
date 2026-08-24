'use client';

import React, { useEffect, useState, useActionState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { RuleSystem } from '@/types/game';
import { ArrowLeft, Sword, Shield, Loader2, Save } from 'lucide-react';
import { createCharacterAction } from '@/actions/characterActions';

import SystemModal, { SystemModalOptions } from '@/components/SystemModal';

export default function CharacterNewClient() {
  const router = useRouter();
  const supabase = createClient();

  const [baseSystems, setBaseSystems] = useState<RuleSystem[]>([]);
  const [customSystems, setCustomSystems] = useState<RuleSystem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, payload: any) => {
      const res = await createCharacterAction(payload);
      if (res.success && res.data) {
        router.push(`/characters/${res.data.id}`);
      } else if (res.error) {
        showSystemModal({
          type: 'alert',
          title: 'Erro ao Criar',
          message: res.error,
        });
      }
      return res;
    },
    { success: false }
  );

  // Modal State
  const [modalConfig, setModalConfig] = useState<SystemModalOptions>({
    isOpen: false,
    message: '',
  });

  const showSystemModal = (options: Omit<SystemModalOptions, 'isOpen'>) => {
    setModalConfig({ ...options, isOpen: true });
  };

  // Form states
  const [name, setName] = useState('Defensor');
  const [concept, setConcept] = useState('Guerreiro');
  const [pointsTotal, setPointsTotal] = useState(7); // Lutador por padrão
  const [selectedSystemId, setSelectedSystemId] = useState('33333333-3333-3333-3333-333333333333'); // Default 3D&T Alpha

  useEffect(() => {
    async function loadSystems() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      try {
        const { data } = await supabase
          .from('rule_systems')
          .select('*')
          .or(`user_id.eq.${user.id},is_base_system.eq.true`);
        if (data) {
          setBaseSystems(data.filter(s => s.is_base_system));
          setCustomSystems(data.filter(s => !s.is_base_system));
        }
      } catch (err) {
        console.error('Erro ao carregar sistemas:', err);
      }
    }
    loadSystems();
  }, [router, supabase]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    startTransition(() => {
      formAction({
        name,
        concept,
        points_total: pointsTotal,
        rule_system_id: selectedSystemId,
      });
    });
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
          <h1 className="font-bold text-lg text-white">Novo Personagem</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-[#0f172a]/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center">
              <Sword className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Escolha os atributos iniciais</h2>
              <p className="text-slate-400 text-xs">Preencha os dados básicos do seu defensor</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Nome do Personagem
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Conceito */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Conceito / Classe
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Pontuação */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Pontuação Inicial
                </label>
                <select
                  value={pointsTotal}
                  onChange={(e) => setPointsTotal(Number(e.target.value))}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value={5}>5 Pontos (Novato)</option>
                  <option value={7}>7 Pontos (Lutador)</option>
                  <option value={10}>10 Pontos (Campeão)</option>
                  <option value={12}>12 Pontos (Lenda)</option>
                </select>
              </div>

              {/* Sistema de Regras */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Sistema de Regras
                </label>
                 <select
                  value={selectedSystemId}
                  onChange={(e) => setSelectedSystemId(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <optgroup label="Sistemas Padrão">
                    {baseSystems.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                  {customSystems.length > 0 && (
                    <optgroup label="Sistemas Customizados (Sandbox)">
                      {customSystems.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* Descrição do Sistema Selecionado */}
            <div className="p-4 bg-slate-800/30 border border-slate-800/80 rounded-xl text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block mb-1">
                Descrição do Sistema:
              </span>
              {baseSystems.find(s => s.id === selectedSystemId)?.description || 
               customSystems.find(s => s.id === selectedSystemId)?.description || 
               'Sem descrição disponível.'}
            </div>

            {/* Botão de Enviar */}
             <button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-55"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Personagem e Ir para a Ficha
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <SystemModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
