'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Character, Profile, Table } from '@/types/game';
import { validateUniqueNameAndKey, validateFormula } from '@/lib/validations';
import { 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Users, 
  Sword, 
  ShieldAlert, 
  Loader2, 
  BookOpen,
  Trash2,
  Save,
  Download,
  Upload,
  Copy,
  Edit,
  HelpCircle,
  AlertCircle,
  Check,
  Palette
} from 'lucide-react';
import PreferencesModal from '@/components/PreferencesModal';
import { getTheme, ThemeId, DEFAULT_SECTION_ORDER } from '@/lib/theme';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState<'characters' | 'tables' | 'rule_systems'>('characters');
  const [ruleSystems, setRuleSystems] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // States de Preferências e Exibição
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('dark');
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // States do Sandbox de Sistemas de Regras
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [systemJsonImport, setSystemJsonImport] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // 1. Carregar Perfil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);

          const prefs = profileData.preferences || {};
          const themeFromDb = prefs.theme || (localStorage.getItem('gdd_theme') as ThemeId) || 'dark';
          const orderFromDb = prefs.section_order || JSON.parse(localStorage.getItem('gdd_section_order') || 'null') || DEFAULT_SECTION_ORDER;

          setCurrentTheme(themeFromDb);
          setSectionOrder(orderFromDb);
          localStorage.setItem('gdd_theme', themeFromDb);
          localStorage.setItem('gdd_section_order', JSON.stringify(orderFromDb));
        }

        // 2. Carregar Personagens
        const { data: charData } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        if (charData) setCharacters(charData);

        // 3. Carregar Mesas (como Mestre ou como Jogador)
        const { data: ownedTables } = await supabase
          .from('tables')
          .select('*')
          .eq('master_id', user.id);

        // Mesas onde joga (através de table_players)
        const { data: playerTablesData } = await supabase
          .from('table_players')
          .select('table_id, tables(*)')
          .eq('player_id', user.id);

        const guestTables = playerTablesData
          ? playerTablesData.map((item: any) => item.tables).filter(Boolean)
          : [];

        const allTables = [
          ...(ownedTables || []),
          ...guestTables
        ].filter((table, index, self) => 
          self.findIndex((t) => t.id === table.id) === index
        );

        setTables(allTables);

        // 4. Carregar Sistemas de Regras
        const { data: systemsData } = await supabase
          .from('rule_systems')
          .select('*')
          .or(`user_id.is.null,user_id.eq.${user.id}`)
          .order('name', { ascending: true });
        if (systemsData) setRuleSystems(systemsData);

        // 5. Carregar Notificações / Convites
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false });
        if (notifData) setNotifications(notifData);
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router, supabase]);

  // 1. Criar novo sistema de regras
  function handleCreateSystem() {
    const defaultSystem = {
      name: 'Meu Sistema RPG',
      description: 'Um sistema de regras personalizado.',
      attributes: {
        F: { name: 'Força', key: 'F', color: 'purple' },
        H: { name: 'Habilidade', key: 'H', color: 'cyan' },
        R: { name: 'Resistência', key: 'R', color: 'emerald' },
        A: { name: 'Armadura', key: 'A', color: 'slate' },
        PdF: { name: 'Poder de Fogo', key: 'PdF', color: 'rose' }
      },
      resources: {
        PV: { name: 'Pontos de Vida', key: 'PV', color: 'rose', baseAttributeKey: 'R', formula: 'R * 5' },
        PM: { name: 'Pontos de Magia', key: 'PM', color: 'cyan', baseAttributeKey: 'R', formula: 'R * 5' }
      },
      advantages: [],
      disadvantages: [],
      skills: [],
      damage_types: ['Corte', 'Perfuração', 'Esmagamento', 'Fogo', 'Frio', 'Elétrico', 'Químico', 'Sônico', 'Força', 'Poder de Fogo', 'Magia'],
      dice_config: { count: 1, faces: 6 },
      is_base_system: false
    };

    setEditingSystem(defaultSystem);
    setIsEditingSystem(true);
  }

  // 2. Editar sistema de regras existente
  function handleEditSystem(system: any) {
    setEditingSystem(JSON.parse(JSON.stringify(system)));
    setIsEditingSystem(true);
  }

  // 3. Excluir sistema de regras
  async function handleDeleteSystem(systemId: string) {
    if (!confirm('Deseja realmente excluir este sistema de regras? Todos os personagens associados perderão as referências dinâmicas.')) return;
    try {
      const { error } = await supabase
        .from('rule_systems')
        .delete()
        .eq('id', systemId);
      if (error) throw error;
      setRuleSystems(ruleSystems.filter(s => s.id !== systemId));
    } catch (err) {
      alert('Erro ao excluir sistema de regras.');
      console.error(err);
    }
  }

  // Excluir personagem
  async function handleDeleteCharacter(charId: string) {
    if (!confirm('Deseja realmente excluir este personagem? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', charId);
      if (error) throw error;
      setCharacters(prev => prev.filter(c => c.id !== charId));
    } catch (err) {
      alert('Erro ao excluir personagem.');
      console.error(err);
    }
  }

  // Excluir mesa (apenas para o mestre)
  async function handleDeleteTable(tableId: string) {
    if (!confirm('Deseja realmente excluir esta mesa? Todas as mensagens do chat e dados da mesa serão excluídos permanentemente.')) return;
    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);
      if (error) throw error;
      setTables(prev => prev.filter(t => t.id !== tableId));
    } catch (err) {
      alert('Erro ao excluir mesa.');
      console.error(err);
    }
  }

  // Sair da mesa (para jogadores)
  async function handleLeaveTable(tableId: string) {
    if (!confirm('Deseja realmente sair desta mesa?')) return;
    try {
      const { error } = await supabase
        .from('table_players')
        .delete()
        .eq('table_id', tableId)
        .eq('player_id', profile?.id);
      if (error) throw error;
      setTables(prev => prev.filter(t => t.id !== tableId));
    } catch (err) {
      alert('Erro ao sair da mesa.');
      console.error(err);
    }
  }

  // 4. Salvar alterações do sistema de regras
  async function handleSaveSystem() {
    if (!editingSystem.name.trim()) {
      alert('Nome do sistema é obrigatório.');
      return;
    }

    const attributeKeys = Object.keys(editingSystem.attributes || {});
    if (attributeKeys.length === 0) {
      alert('O sistema de regras deve possuir ao menos um atributo.');
      return;
    }

    const resources = editingSystem.resources || {};
    for (const key of Object.keys(resources)) {
      const res = resources[key];
      const formVal = validateFormula(res.formula || `${res.baseAttributeKey} * 5`, attributeKeys);
      if (!formVal.valid) {
        alert(`Fórmula inválida para o recurso ${res.name}: ${formVal.error}`);
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        name: editingSystem.name,
        description: editingSystem.description,
        attributes: editingSystem.attributes,
        resources: editingSystem.resources,
        advantages: editingSystem.advantages || [],
        disadvantages: editingSystem.disadvantages || [],
        skills: editingSystem.skills || [],
        damage_types: editingSystem.damage_types || [],
        dice_config: editingSystem.dice_config || { count: 1, faces: 6 },
        is_base_system: false,
        user_id: user.id
      };

      // Verificar se já existe um sistema de regras com o mesmo nome
      const { data: duplicate } = await supabase
        .from('rule_systems')
        .select('id')
        .eq('name', editingSystem.name.trim())
        .neq('id', editingSystem.id || '00000000-0000-0000-0000-000000000000') // Ignorar o próprio ao editar
        .maybeSingle();

      if (duplicate) {
        alert(`Já existe um sistema de regras cadastrado com o nome "${editingSystem.name}"! Por favor, escolha outro nome.`);
        return;
      }

      let query;
      if (editingSystem.id) {
        query = supabase
          .from('rule_systems')
          .update(payload)
          .eq('id', editingSystem.id)
          .select();
      } else {
        query = supabase
          .from('rule_systems')
          .insert([payload])
          .select();
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data[0]) {
        const updated = data[0];
        if (editingSystem.id) {
          setRuleSystems(ruleSystems.map(s => s.id === updated.id ? updated : s));
        } else {
          setRuleSystems([...ruleSystems, updated]);
        }
      }
      setIsEditingSystem(false);
      setEditingSystem(null);
    } catch (err: any) {
      alert('Erro ao salvar sistema de regras: ' + (err?.message || JSON.stringify(err)));
      console.error(err);
    }
  }

  // 5. Importar JSON
  function handleImportSystem() {
    try {
      const parsed = JSON.parse(systemJsonImport);
      if (!parsed.name || !parsed.attributes) {
        alert('Formato de JSON inválido. O arquivo deve conter ao menos os campos "name" e "attributes".');
        return;
      }
      const merged = {
        ...editingSystem,
        ...parsed,
        id: editingSystem?.id
      };
      setEditingSystem(merged);
      setSystemJsonImport('');
      alert('Sistema importado com sucesso!');
    } catch (e) {
      alert('Erro ao analisar JSON. Certifique-se de que é um JSON válido.');
    }
  }

  // 6. Exportar JSON
  function handleExportSystem(system: any) {
    const cleanSystem = {
      name: system.name,
      description: system.description,
      attributes: system.attributes,
      resources: system.resources,
      advantages: system.advantages,
      disadvantages: system.disadvantages,
      skills: system.skills,
      damage_types: system.damage_types,
      dice_config: system.dice_config
    };
    const jsonStr = JSON.stringify(cleanSystem, null, 2);
    navigator.clipboard.writeText(jsonStr);
    alert('Configuração do sistema (JSON) copiada para a área de transferência!');
  }

  async function handleSavePreferences(newPrefs: { theme: ThemeId; avatar_url: string; section_order: string[] }) {
    setCurrentTheme(newPrefs.theme);
    setSectionOrder(newPrefs.section_order);
    if (newPrefs.avatar_url) setAvatarUrl(newPrefs.avatar_url);

    localStorage.setItem('gdd_theme', newPrefs.theme);
    localStorage.setItem('gdd_section_order', JSON.stringify(newPrefs.section_order));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        preferences: {
          theme: newPrefs.theme,
          section_order: newPrefs.section_order
        }
      };
      if (newPrefs.avatar_url) {
        payload.avatar_url = newPrefs.avatar_url;
      }

      await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id);

      setProfile(prev => prev ? { ...prev, ...payload } : null);
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleAcceptInvite(notif: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: joinErr } = await supabase
        .from('table_players')
        .insert({
          table_id: notif.table_id,
          player_id: user.id
        });

      if (joinErr) throw joinErr;

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notif.id);

      setNotifications(prev => prev.filter(n => n.id !== notif.id));

      const { data: ownedTables } = await supabase
        .from('tables')
        .select('*')
        .eq('master_id', user.id);

      const { data: playerTablesData } = await supabase
        .from('table_players')
        .select('table_id, tables(*)')
        .eq('player_id', user.id);

      const guestTables = playerTablesData
        ? playerTablesData.map((item: any) => item.tables).filter(Boolean)
        : [];

      const allTables = [
        ...(ownedTables || []),
        ...guestTables
      ].filter((table, index, self) => 
        self.findIndex((t) => t.id === table.id) === index
      );

      setTables(allTables);
      alert('Convite aceito com sucesso! A mesa agora está disponível no seu painel.');
    } catch (err) {
      console.error('Erro ao aceitar convite:', err);
      alert('Erro ao aceitar o convite.');
    }
  }

  async function handleDeclineInvite(notifId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);

      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Erro ao recusar convite:', err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <p className="text-slate-400 text-sm">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const themeConfig = getTheme(currentTheme);

  return (
    <div className={`min-h-screen ${themeConfig.bgClass} ${themeConfig.textPrimaryClass} pb-12 transition-colors duration-300`}>
      {/* Header / Navbar */}
      <header className={`border-b ${themeConfig.borderClass} ${themeConfig.headerBgClass} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-md shadow-purple-500/10">
              <Sword className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Galeria de Defensores
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-purple-400 font-semibold text-sm overflow-hidden">
                {avatarUrl || profile?.avatar_url ? (
                  <img src={avatarUrl || profile?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile?.username?.charAt(0).toUpperCase() || <UserIcon className="w-4 h-4" />
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-300">
                {profile?.username || 'Jogador'}
              </span>
            </div>

            <button
              onClick={() => setIsPreferencesOpen(true)}
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
              title="Preferências de Exibição"
            >
              <Palette className="w-5 h-5" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Banner de Boas-vindas */}
        <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/10 border border-slate-800/80 rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Saudações, {profile?.username || 'Defensor'}!
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Gerencie suas fichas e participe de mesas multiplayer de 3D&T.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/characters/new')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-600/15 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Personagem
            </button>
            <button 
              onClick={() => router.push('/tables/new')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Mesa
            </button>
          </div>
        </div>

        {/* Notificações / Convites */}
        {notifications.length > 0 && (
          <div className="mb-8 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Check className="w-4 h-4 text-purple-400 animate-pulse" />
              Convites Pendentes ({notifications.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="bg-purple-950/10 border border-purple-900/35 p-4 rounded-xl flex flex-col justify-between sm:flex-row sm:items-center gap-4 shadow-xl">
                  <div>
                    <span className="text-xs font-bold text-purple-400 block mb-1">{notif.title}</span>
                    <p className="text-xs text-slate-300">{notif.message}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptInvite(notif)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(notif.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-1.5 px-3 rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Abas e Visualização */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('characters')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'characters'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Meus Personagens ({characters.length})
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'tables'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Minhas Mesas ({tables.length})
          </button>
          <button
            onClick={() => setActiveTab('rule_systems')}
            className={`pb-3 px-4 font-semibold text-sm transition-all border-b-2 ${
              activeTab === 'rule_systems'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sistemas de Regras (Sandbox) ({ruleSystems.length})
          </button>
        </div>

        {/* Grid de Conteúdo */}
        {activeTab === 'characters' ? (
          characters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char) => (
                <div
                  key={char.id}
                  onClick={() => router.push(`/characters/${char.id}`)}
                  className="bg-[#0f172a]/40 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 cursor-pointer shadow-md hover:shadow-purple-500/5 active:scale-[0.99] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {char.concept || 'Guerreiro'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {char.points_total} Pontos
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCharacter(char.id);
                          }}
                          className="p-1 hover:bg-rose-950/40 text-slate-500 hover:text-rose-450 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Personagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2 truncate">
                      {char.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex justify-between text-xs text-slate-400">
                    <span>Exp: {char.experience}</span>
                    <span>Atualizado: {new Date(char.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Nenhum personagem encontrado</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
                Crie sua primeira ficha de personagem de 3D&T Alpha clicando no botão abaixo.
              </p>
              <button
                onClick={() => router.push('/characters/new')}
                className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 px-5 py-2 rounded-xl font-medium text-sm transition-all"
              >
                Criar Ficha
              </button>
            </div>
          )
        ) : activeTab === 'tables' ? (
          tables.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tables.map((table) => (
                <div
                  key={table.id}
                  onClick={() => router.push(`/tables/${table.id}`)}
                  className="bg-[#0f172a]/40 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 cursor-pointer shadow-md hover:shadow-cyan-500/5 active:scale-[0.99] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Multiplayer
                      </span>
                      <div className="flex items-center gap-2">
                        {table.is_private && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-800/20 px-1.5 py-0.5 rounded-full">
                            Privada
                          </span>
                        )}
                        {table.master_id === profile?.id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTable(table.id);
                            }}
                            className="p-1 hover:bg-rose-950/40 text-slate-500 hover:text-rose-455 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Mesa (Mestre)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveTable(table.id);
                            }}
                            className="p-1 hover:bg-amber-950/40 text-slate-500 hover:text-amber-450 rounded-lg transition-colors cursor-pointer"
                            title="Sair da Mesa"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2 truncate">
                      {table.name}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {table.description || 'Sem descrição.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800/60 flex justify-between text-xs text-slate-500">
                    <span>Mesa ID: {table.id.slice(0, 8)}...</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl">
              <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-300">Nenhuma mesa encontrada</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
                Você ainda não criou ou foi convidado para nenhuma mesa de jogo multiplayer.
              </p>
              <button
                onClick={() => router.push('/tables/new')}
                className="bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/20 px-5 py-2 rounded-xl font-medium text-sm transition-all"
              >
                Criar Mesa
              </button>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-[#0f172a]/20 border border-slate-800/40 p-5 rounded-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-200">Sandbox de Sistemas de Regras</h3>
                <p className="text-xs text-slate-400 mt-1">Crie seus próprios RPGs e configure atributos, recursos, vantagens e perícias.</p>
              </div>
              <button
                onClick={handleCreateSystem}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Sistema
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ruleSystems.map((system) => {
                const isBase = system.is_base_system || !system.user_id;
                const attributeCount = Object.keys(system.attributes || {}).length;
                const resourceCount = Object.keys(system.resources || {}).length;

                return (
                  <div
                    key={system.id}
                    className="bg-[#0f172a]/40 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col justify-between hover:border-purple-500/25 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isBase 
                            ? 'bg-purple-950/40 border-purple-800/30 text-purple-400' 
                            : 'bg-emerald-950/40 border-emerald-800/30 text-emerald-400'
                        }`}>
                          {isBase ? 'Base Nativo' : 'Customizado'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-200 truncate">{system.name}</h3>
                      {system.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{system.description}</p>
                      )}
                      
                      <div className="flex gap-4 mt-4 text-[10px] text-slate-500 font-medium">
                        <span>Atributos: {attributeCount}</span>
                        <span>Recursos: {resourceCount}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800/60 flex justify-between gap-2">
                      <button
                        onClick={() => handleExportSystem(system)}
                        className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-700/65 text-slate-350 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copiar JSON
                      </button>
                      
                      {!isBase && (
                        <>
                          <button
                            onClick={() => handleEditSystem(system)}
                            className="flex-1 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/25 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSystem(system.id)}
                            className="p-1.5 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {ruleSystems.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-500 italic">Nenhum sistema de regras carregado.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Editor do Sandbox de Sistemas de Regras */}
      {isEditingSystem && editingSystem && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sword className="w-5 h-5 text-purple-500" />
                  {editingSystem.id ? 'Editar Sistema de Regras' : 'Novo Sistema de Regras'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Configure os metadados, atributos e recursos do seu RPG.</p>
              </div>
              <button
                onClick={() => {
                  setIsEditingSystem(false);
                  setEditingSystem(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                Fechar ×
              </button>
            </div>

            {/* Conteúdo Principal (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              
              {/* Seção 1: Metadados */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">1. Identificação</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Nome do Sistema</label>
                    <input
                      type="text"
                      value={editingSystem.name || ''}
                      onChange={(e) => setEditingSystem({ ...editingSystem, name: e.target.value })}
                      placeholder="Ex: 3D&T Alpha, D&D 5e..."
                      className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Descrição do Sistema</label>
                    <input
                      type="text"
                      value={editingSystem.description || ''}
                      onChange={(e) => setEditingSystem({ ...editingSystem, description: e.target.value })}
                      placeholder="Breve resumo..."
                      className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Atributos */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">2. Atributos Básicos</span>
                
                {/* Tabela/Lista de Atributos Existentes */}
                <div className="space-y-2.5">
                  {Object.keys(editingSystem.attributes || {}).map((key) => {
                    const attr = editingSystem.attributes[key];
                    return (
                      <div key={key} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/45 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: attr.color || '#64748b' }} />
                          <span className="font-semibold text-sm text-slate-200 uppercase font-mono w-10">{key}</span>
                          <span className="text-sm text-slate-350">{attr.name}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newAttrs = { ...editingSystem.attributes };
                            delete newAttrs[key];
                            setEditingSystem({ ...editingSystem, attributes: newAttrs });
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md hover:bg-rose-950/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {Object.keys(editingSystem.attributes || {}).length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500 italic">Nenhum atributo adicionado.</div>
                  )}
                </div>

                {/* Formulário Inline de Novo Atributo */}
                <div className="border-t border-slate-800/60 pt-4 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Novo Atributo</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      id="new-attr-key"
                      type="text"
                      placeholder="Chave (ex: F, H)"
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <input
                      id="new-attr-name"
                      type="text"
                      placeholder="Nome (ex: Força)"
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <select
                      id="new-attr-color"
                      className="bg-slate-850 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300"
                    >
                      <option value="purple">Roxo</option>
                      <option value="cyan">Ciano</option>
                      <option value="emerald">Verde</option>
                      <option value="rose">Rosa</option>
                      <option value="amber">Âmbar</option>
                      <option value="slate">Cinza</option>
                    </select>
                    <button
                      onClick={() => {
                        const keyInput = document.getElementById('new-attr-key') as HTMLInputElement;
                        const nameInput = document.getElementById('new-attr-name') as HTMLInputElement;
                        const colorSelect = document.getElementById('new-attr-color') as HTMLSelectElement;
                        
                        const key = keyInput?.value?.trim();
                        const name = nameInput?.value?.trim();
                        const color = colorSelect?.value;

                        if (!key || !name) {
                          alert('Preencha chave e nome do atributo.');
                          return;
                        }

                        const currentList = Object.keys(editingSystem.attributes || {}).map(k => ({
                          id: k,
                          key: k,
                          name: editingSystem.attributes[k].name
                        }));
                        const val = validateUniqueNameAndKey(currentList, key, name);
                        if (!val.valid) {
                          alert(val.error);
                          return;
                        }

                        const newAttrs = {
                          ...(editingSystem.attributes || {}),
                          [key]: { name, key, color }
                        };

                        setEditingSystem({ ...editingSystem, attributes: newAttrs });

                        keyInput.value = '';
                        nameInput.value = '';
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs py-2 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 3: Recursos */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">3. Recursos Dinâmicos</span>
                
                {/* Tabela/Lista de Recursos */}
                <div className="space-y-2.5">
                  {Object.keys(editingSystem.resources || {}).map((key) => {
                    const res = editingSystem.resources[key];
                    return (
                      <div key={key} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/45 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: res.color || '#64748b' }} />
                          <span className="font-semibold text-sm text-slate-200 uppercase font-mono w-10">{key}</span>
                          <span className="text-xs text-slate-350">{res.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-900/40 px-2 py-0.5 rounded border border-slate-800/30">
                            Fórmula: {res.formula || `${res.baseAttributeKey} * 5`}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const newResources = { ...editingSystem.resources };
                            delete newResources[key];
                            setEditingSystem({ ...editingSystem, resources: newResources });
                          }}
                          className="p-1 text-slate-500 hover:text-rose-450 rounded-md hover:bg-rose-950/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {Object.keys(editingSystem.resources || {}).length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500 italic">Nenhum recurso adicionado.</div>
                  )}
                </div>

                {/* Formulário Inline de Novo Recurso */}
                <div className="border-t border-slate-800/60 pt-4 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Novo Recurso</span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <input
                      id="new-res-key"
                      type="text"
                      placeholder="Chave (ex: PV, PM)"
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <input
                      id="new-res-name"
                      type="text"
                      placeholder="Nome (ex: Vida)"
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <input
                      id="new-res-formula"
                      type="text"
                      placeholder="Fórmula (ex: R * 5)"
                      className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 font-mono"
                    />
                    <select
                      id="new-res-color"
                      className="bg-slate-850 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300"
                    >
                      <option value="rose">Rosa/Vermelho</option>
                      <option value="cyan">Ciano/Azul</option>
                      <option value="emerald">Verde</option>
                      <option value="purple">Roxo</option>
                      <option value="amber">Âmbar</option>
                    </select>
                    <button
                      onClick={() => {
                        const keyInput = document.getElementById('new-res-key') as HTMLInputElement;
                        const nameInput = document.getElementById('new-res-name') as HTMLInputElement;
                        const formulaInput = document.getElementById('new-res-formula') as HTMLInputElement;
                        const colorSelect = document.getElementById('new-res-color') as HTMLSelectElement;

                        const key = keyInput?.value?.trim();
                        const name = nameInput?.value?.trim();
                        const formula = formulaInput?.value?.trim() || 'R * 5';
                        const color = colorSelect?.value;

                        if (!key || !name) {
                          alert('Preencha chave e nome do recurso.');
                          return;
                        }

                        const attributeKeys = Object.keys(editingSystem.attributes || {});
                        const fVal = validateFormula(formula, attributeKeys);
                        if (!fVal.valid) {
                          alert(fVal.error);
                          return;
                        }

                        const currentList = [
                          ...Object.keys(editingSystem.attributes || {}).map(k => ({
                            id: k, key: k, name: editingSystem.attributes[k].name
                          })),
                          ...Object.keys(editingSystem.resources || {}).map(k => ({
                            id: k, key: k, name: editingSystem.resources[k].name
                          }))
                        ];
                        const val = validateUniqueNameAndKey(currentList, key, name);
                        if (!val.valid) {
                          alert(val.error);
                          return;
                        }

                        const newResources = {
                          ...(editingSystem.resources || {}),
                          [key]: { name, key, color, formula, baseAttributeKey: attributeKeys[0] || 'R' }
                        };

                        setEditingSystem({ ...editingSystem, resources: newResources });

                        keyInput.value = '';
                        nameInput.value = '';
                        formulaInput.value = '';
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs py-2 transition-all flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 4: Importação JSON */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">4. Configuração Avançada (JSON)</span>
                <p className="text-xs text-slate-400">Importe as configurações ou catálogos do sistema de regras colando a string JSON abaixo.</p>
                <textarea
                  value={systemJsonImport}
                  onChange={(e) => setSystemJsonImport(e.target.value)}
                  placeholder='Cole o arquivo JSON de regras aqui (ex: {"name": "RPG Customizado", "attributes": {...}})'
                  rows={4}
                  className="w-full bg-slate-800/20 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300 font-mono"
                />
                <button
                  onClick={handleImportSystem}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar Configuração
                </button>
              </div>

            </div>

            {/* Botoes de Controle de Salvamento */}
            <div className="flex gap-4 border-t border-slate-800 pt-4 mt-2">
              <button
                onClick={() => {
                  setIsEditingSystem(false);
                  setEditingSystem(null);
                }}
                className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-350 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSystem}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Salvar Sistema de Regras
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Preferências de Exibição */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentTheme={currentTheme}
        currentAvatarUrl={avatarUrl || profile?.avatar_url}
        currentSectionOrder={sectionOrder}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
