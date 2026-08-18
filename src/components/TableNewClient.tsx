'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Users, Loader2, Save, BookOpen, HelpCircle, MessageSquare } from 'lucide-react';
import { RuleSystem } from '@/types/game';

import SystemModal, { SystemModalOptions } from '@/components/SystemModal';

export default function TableNewClient() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<SystemModalOptions>({
    isOpen: false,
    message: '',
  });

  const showSystemModal = (options: Omit<SystemModalOptions, 'isOpen'>) => {
    setModalConfig({ ...options, isOpen: true });
  };

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [password, setPassword] = useState('');

  const handlePrivateChange = (checked: boolean) => {
    setIsPrivate(checked);
    if (!checked) {
      showSystemModal({
        type: 'info',
        title: 'Mesa Pública',
        message: 'Aviso: Qualquer usuário poderá entrar nesta mesa como jogador se não houver senha.'
      });
    }
  };
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [hasSeparatedChat, setHasSeparatedChat] = useState(true);
  const [systems, setSystems] = useState<RuleSystem[]>([]);
  const [ruleSystemId, setRuleSystemId] = useState<string>('');

  useEffect(() => {
    async function init() {
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
          setSystems(data);
          // Pré-selecionar o 3D&T Alpha como padrão se houver
          const defaultSys = data.find(s => s.name === '3D&T Alpha' || s.is_base_system);
          if (defaultSys) {
            setRuleSystemId(defaultSys.id);
          } else if (data.length > 0) {
            setRuleSystemId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar sistemas:', err);
      }
    }
    init();
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
          rule_system_id: ruleSystemId || null,
          is_private: isPrivate,
          password: isPrivate && password ? password : null,
          max_players: maxPlayers,
          allow_spectators: allowSpectators,
          has_separated_chat: hasSeparatedChat,
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
      showSystemModal({
        type: 'alert',
        title: 'Erro ao Criar Mesa',
        message: 'Ocorreu um erro ao criar a mesa de jogo.',
      });
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
                maxLength={500}
                className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Sistema de Regras */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Sistema de Regras da Mesa
              </label>
              <div className="relative">
                <select
                  required
                  value={ruleSystemId}
                  onChange={(e) => setRuleSystemId(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-slate-900">Selecione o sistema</option>
                  {systems.map((sys) => (
                    <option key={sys.id} value={sys.id} className="bg-slate-900 text-slate-200">
                      {sys.name} {sys.is_base_system ? '(Nativo)' : '(Personalizado)'}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Apenas fichas criadas com este mesmo sistema poderão ser vinculadas a esta mesa.
              </p>
            </div>

            {/* Configurações de Capacidade & Espectadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Limite Máximo de Jogadores
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 4)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-[10px] text-slate-400">Exclui o Mestre. Ex: 4 jogadores + 1 mestre.</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-800/80 rounded-xl">
                <div>
                  <span className="font-semibold text-slate-200 text-sm block">Permitir Espectadores</span>
                  <span className="text-[11px] text-slate-400">Outros usuários poderão assistir à partida</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) => setAllowSpectators(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Configurações de Chat & Privacidade */}
            <div className="p-4 bg-slate-800/20 border border-slate-800/80 rounded-xl space-y-4">
              {/* Chat Separado Narrativo vs Off */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-200 text-sm block">Separar Chat em Narrativa (ON) e Fora de Personagem (OFF)</span>
                    <button
                      type="button"
                      onClick={() => showSystemModal({
                        type: 'info',
                        title: 'Sobre o Chat Narrativo Separado',
                        message: 'Ao ativar esta opção, a mesa terá duas abas de chat separadas:\n\n• Chat Narrativa (ON): Mensagens enviadas dentro do jogo com o nome e avatar dos personagens.\n• Chat Conversa Livre (OFF): Mensagens fora do jogo utilizando o nome de usuário real dos jogadores.'
                      })}
                      className="text-slate-400 hover:text-purple-400 transition-colors p-0.5"
                      title="Clique para mais informações"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 block">Cria dois canais para organizar falas do personagem e conversas dos jogadores</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasSeparatedChat}
                  onChange={(e) => setHasSeparatedChat(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                />
              </div>

              {/* Mesa Privada */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                <div>
                  <span className="font-semibold text-slate-200 text-sm block">Mesa Privada</span>
                  <span className="text-xs text-slate-400">Jogadores precisarão de uma senha para entrar na mesa</span>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => handlePrivateChange(e.target.checked)}
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

      <SystemModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
