'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { RuleSystem } from '@/types/game';
import { ArrowLeft, Sword, Shield, Loader2, Save } from 'lucide-react';


export default function NewCharacterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [baseSystems, setBaseSystems] = useState<RuleSystem[]>([]);
  const [customSystems, setCustomSystems] = useState<RuleSystem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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

    setLoading(true);

    // Encontrar definição do sistema selecionado
    let systemAttrs: Record<string, any> = {};
    let systemRes: Record<string, any> = {};
    let dbRuleSystemId: string | null = null;

    const selectedSys = [...baseSystems, ...customSystems].find(s => s.id === selectedSystemId);
    if (selectedSys) {
      systemAttrs = selectedSys.attributes;
      systemRes = selectedSys.resources;
      dbRuleSystemId = selectedSys.id;
    }

    // Inicializar atributos a zero
    const attributes_values: Record<string, number> = {};
    Object.keys(systemAttrs).forEach(key => {
      attributes_values[key] = 0;
    });

    // Inicializar recursos correntes com base na Resistência (começa em 0, logo valor = 1)
    const resources_current: Record<string, number> = {};
    Object.keys(systemRes).forEach(key => {
      resources_current[key] = 1; // Minimo inicial
    });

    const defaultDamageType = (selectedSys?.damage_types && Array.isArray(selectedSys.damage_types) && selectedSys.damage_types.length > 0)
      ? selectedSys.damage_types[0]
      : 'Corte';

    try {
      // Verificar se já existe um personagem com o mesmo nome para este usuário
      const { data: duplicate } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name.trim())
        .maybeSingle();

      if (duplicate) {
        alert(`Você já possui um personagem com o nome "${name}"! Por favor, escolha um nome diferente.`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('characters')
        .insert({
          user_id: userId,
          rule_system_id: dbRuleSystemId,
          name,
          concept,
          points_total: pointsTotal,
          points_spent: 0,
          attributes_values,
          resources_current,
          advantages: [],
          disadvantages: [],
          skills: [],
          specializations: [],
          spells: [],
          inventory: [],
          custom_rolls: [],
          damage_type_forca: defaultDamageType,
          damage_type_pdf: defaultDamageType,
          saved_points: 0,
          experience: 0,
          annotations: '',
          is_hidden: false,
          image_url: ''
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        router.push(`/characters/${data.id}`);
      }
    } catch (err) {
      console.error('Erro ao salvar personagem:', err);
      alert('Falha ao criar o personagem. Tente novamente.');
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-55"
            >
              {loading ? (
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
    </div>
  );
}
