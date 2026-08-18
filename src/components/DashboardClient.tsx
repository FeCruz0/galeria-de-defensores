'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Character, Profile, Table } from '@/types/game';
import { validateUniqueNameAndKey, validateFormula, validateDamageType } from '@/lib/validations';
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
  Palette,
  Bell,
  MessageSquare,
  Eye,
  Compass,
  Lock
} from 'lucide-react';
import PreferencesModal from '@/components/PreferencesModal';
import PdfImportModal from '@/components/PdfImportModal';
import SystemEditorModal from '@/components/SystemEditorModal';
import LobbyChat from '@/components/LobbyChat';
import FriendsDrawer from '@/components/FriendsDrawer';
import { exportRuleSystemToPdf, ExtractedPayload } from '@/lib/pdfPayload';
import { getTheme, ThemeId, DEFAULT_SECTION_ORDER } from '@/lib/theme';
import SystemModal, { SystemModalOptions } from '@/components/SystemModal';
import { fetchAllPublicTables, joinTable } from '@/services/tableService';
import ProfileEditModal from '@/components/ProfileEditModal';
import { formatDate } from '@/lib/formatters';


export interface DashboardClientProps {
  initialProfile: Profile | null;
  initialCharacters: Character[];
  initialTables: Table[];
  initialPublicTables: any[];
  initialRuleSystems: any[];
  initialNotifications: any[];
}

export default function DashboardClient({
  initialProfile,
  initialCharacters,
  initialTables,
  initialPublicTables,
  initialRuleSystems,
  initialNotifications
}: DashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [publicTables, setPublicTables] = useState<any[]>(initialPublicTables);
  const [tablesSubTab, setTablesSubTab] = useState<'my_tables' | 'explore'>('my_tables');
  const [activeTab, setActiveTab] = useState<'characters' | 'tables' | 'rule_systems'>('characters');
  const [ruleSystems, setRuleSystems] = useState<any[]>(initialRuleSystems);
  const [notifications, setNotifications] = useState<any[]>(initialNotifications);

  // Modal State para Alertas e Confirmações
  const [modalConfig, setModalConfig] = useState<SystemModalOptions>({
    isOpen: false,
    message: '',
  });

  const showSystemModal = (options: Omit<SystemModalOptions, 'isOpen'>) => {
    setModalConfig({ ...options, isOpen: true });
  };

  // States de Preferências e Exibição
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('dark');
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialProfile?.avatar_url || '');
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  // States do Sandbox de Sistemas de Regras
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [systemJsonImport, setSystemJsonImport] = useState('');

  const [tableRoles, setTableRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) return;
    async function loadTableRoles() {
      try {
        const { data, error } = await supabase
          .from('table_players')
          .select('table_id, role')
          .eq('player_id', profileId);
        if (data) {
          const roles: Record<string, string> = {};
          data.forEach((item: any) => {
            roles[item.table_id] = item.role;
          });
          setTableRoles(roles);
        }
      } catch (err) {
        console.error('Erro ao buscar cargos:', err);
      }
    }
    loadTableRoles();
  }, [profile?.id, tables]);



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
  function handleDeleteSystem(systemId: string) {
    showSystemModal({
      type: 'confirm',
      title: 'Excluir Sistema de Regras',
      message: 'Deseja realmente excluir este sistema de regras? Todos os personagens associados perderão as referências dinâmicas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('rule_systems')
            .delete()
            .eq('id', systemId);
          if (error) throw error;
          setRuleSystems(ruleSystems.filter(s => s.id !== systemId));
          showSystemModal({ type: 'success', title: 'Sucesso', message: 'Sistema de regras excluído com sucesso!' });
        } catch (err) {
          showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao excluir sistema de regras.' });
          console.error(err);
        }
      }
    });
  }

  // Excluir personagem
  function handleDeleteCharacter(charId: string) {
    showSystemModal({
      type: 'confirm',
      title: 'Excluir Personagem',
      message: 'Deseja realmente excluir este personagem? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir Personagem',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', charId);
          if (error) throw error;
          setCharacters(prev => prev.filter(c => c.id !== charId));
          showSystemModal({ type: 'success', title: 'Sucesso', message: 'Personagem excluído com sucesso!' });
        } catch (err) {
          showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao excluir personagem.' });
          console.error(err);
        }
      }
    });
  }

  // Excluir mesa (apenas para o mestre)
  function handleDeleteTable(tableId: string) {
    showSystemModal({
      type: 'confirm',
      title: 'Excluir Mesa de Jogo',
      message: 'Deseja realmente excluir esta mesa? Todas as mensagens do chat e dados da mesa serão excluídos permanentemente.',
      confirmText: 'Excluir Mesa',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('tables')
            .delete()
            .eq('id', tableId);
          if (error) throw error;
          setTables(prev => prev.filter(t => t.id !== tableId));
          showSystemModal({ type: 'success', title: 'Sucesso', message: 'Mesa de jogo excluída com sucesso!' });
        } catch (err) {
          showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao excluir mesa.' });
          console.error(err);
        }
      }
    });
  }

  // Sair da mesa (para jogadores)
  function handleLeaveTable(tableId: string) {
    showSystemModal({
      type: 'confirm',
      title: 'Sair da Mesa',
      message: 'Deseja realmente sair desta mesa de jogo?',
      confirmText: 'Sair da Mesa',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('table_players')
            .delete()
            .eq('table_id', tableId)
            .eq('player_id', profile?.id);
          if (error) throw error;
          setTables(prev => prev.filter(t => t.id !== tableId));
          showSystemModal({ type: 'success', title: 'Sucesso', message: 'Você saiu da mesa.' });
        } catch (err) {
          showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao sair da mesa.' });
          console.error(err);
        }
      }
    });
  }

  // 4. Salvar alterações do sistema de regras
  async function handleSaveSystem(updatedSystem?: any) {
    const sys = updatedSystem || editingSystem;
    if (!sys || !sys.name || !sys.name.trim()) {
      showSystemModal({ type: 'alert', title: 'Campo Obrigatório', message: 'Nome do sistema é obrigatório.' });
      return;
    }

    const attributeKeys = Object.keys(sys.attributes || {});
    if (attributeKeys.length === 0) {
      showSystemModal({ type: 'alert', title: 'Atributos Necessários', message: 'O sistema de regras deve possuir ao menos um atributo.' });
      return;
    }

    const resources = sys.resources || {};
    for (const key of Object.keys(resources)) {
      const res = resources[key];
      const formVal = validateFormula(res.formula || `${res.baseAttributeKey} * 5`, attributeKeys);
      if (!formVal.valid) {
        showSystemModal({ type: 'alert', title: 'Fórmula Inválida', message: `Fórmula inválida para o recurso ${res.name}: ${formVal.error}` });
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
        attribute_roll_config: editingSystem.attribute_roll_config,
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
        showSystemModal({ type: 'alert', title: 'Nome Conflitante', message: `Já existe um sistema de regras cadastrado com o nome "${editingSystem.name}"! Por favor, escolha outro nome.` });
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
      showSystemModal({ type: 'success', title: 'Sistema Salvo', message: 'Sistema de regras salvo com sucesso!' });
    } catch (err: any) {
      showSystemModal({ type: 'alert', title: 'Erro ao Salvar', message: 'Erro ao salvar sistema de regras: ' + (err?.message || JSON.stringify(err)) });
      console.error(err);
    }
  }

  // 5. Importar JSON
  function handleImportSystem() {
    try {
      const parsed = JSON.parse(systemJsonImport);
      if (!parsed.name || !parsed.attributes) {
        showSystemModal({ type: 'alert', title: 'JSON Inválido', message: 'Formato de JSON inválido. O arquivo deve conter ao menos os campos "name" e "attributes".' });
        return;
      }
      const merged = {
        ...editingSystem,
        ...parsed,
        id: editingSystem?.id
      };
      setEditingSystem(merged);
      setSystemJsonImport('');
      showSystemModal({ type: 'success', title: 'Importação Concluída', message: 'Sistema importado com sucesso!' });
    } catch (e) {
      showSystemModal({ type: 'alert', title: 'Erro de Análise', message: 'Erro ao analisar JSON. Certifique-se de que é um JSON válido.' });
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
    showSystemModal({ type: 'info', title: 'Copiado', message: 'Configuração do sistema (JSON) copiada para a área de transferência!' });
  }

  // 7. Exportar PDF do Livro de Regras do Sistema
  async function handleExportSystemPdf(system: any) {
    try {
      const pdfBytes = await exportRuleSystemToPdf(system);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${system.name || 'sistema'}_regras.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar PDF do sistema:', err);
      showSystemModal({ type: 'alert', title: 'Erro ao Exportar', message: 'Erro ao gerar o Livro de Regras em PDF.' });
    }
  }

  // 8. Tratar sucesso da importação de PDF
  async function handleImportPdfSuccess(payload: ExtractedPayload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (payload.type === 'character') {
      const charData = { ...payload.data };
      delete charData.id;
      charData.user_id = user.id;
      charData.name = `${charData.name || 'Personagem'} (Importado)`;
      charData.created_at = new Date().toISOString();
      charData.updated_at = new Date().toISOString();

      const { data: inserted, error } = await supabase
        .from('characters')
        .insert([charData])
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        setCharacters(prev => [inserted, ...prev]);
        showSystemModal({ type: 'success', title: 'Ficha Importada', message: `Ficha "${inserted.name}" importada com sucesso via PDF!` });
      }
    } else if (payload.type === 'rule_system') {
      const systemData = { ...payload.data };
      delete systemData.id;
      systemData.user_id = user.id;
      systemData.name = `${systemData.name || 'Sistema'} (Importado)`;
      systemData.is_base_system = false;
      systemData.created_at = new Date().toISOString();

      const { data: inserted, error } = await supabase
        .from('rule_systems')
        .insert([systemData])
        .select()
        .single();

      if (error) throw error;
      if (inserted) {
        setRuleSystems(prev => [...prev, inserted]);
        showSystemModal({ type: 'success', title: 'Sistema Instalado', message: `Sistema de regras "${inserted.name}" instalado com sucesso via PDF!` });
      }
    }
  }

  async function handleSavePreferences(newPrefs: { theme: ThemeId; avatar_url: string }) {
    setCurrentTheme(newPrefs.theme);
    if (newPrefs.avatar_url) setAvatarUrl(newPrefs.avatar_url);

    localStorage.setItem('gdd_theme', newPrefs.theme);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload: any = {
        preferences: {
          theme: newPrefs.theme
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
      showSystemModal({ type: 'success', title: 'Convite Aceito', message: 'Convite aceito com sucesso! A mesa agora está disponível no seu painel.' });
    } catch (err) {
      console.error('Erro ao aceitar convite:', err);
      showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao aceitar o convite.' });
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

  async function handleDismissNotification(notifId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);

      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
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
    <div className={`h-screen flex flex-col ${themeConfig.bgClass} ${themeConfig.textPrimaryClass} transition-colors duration-300 overflow-hidden`}>
      {/* Header / Navbar */}
      <header className={`border-b ${themeConfig.borderClass} ${themeConfig.headerBgClass} sticky top-0 z-50 shrink-0`}>
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
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsProfileEditOpen(true)} title="Configurações de Perfil">
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

      {/* Main Content Area with Right Sidebar */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
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
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setIsFriendsOpen(true)}
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-purple-400" />
                  Amigos & DMs
                </button>
            <button 
              onClick={() => router.push('/characters/new')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg shadow-purple-600/15 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Personagem
            </button>
            <button 
              onClick={() => router.push('/tables/new')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Mesa
            </button>
            <button 
              onClick={() => setIsPdfModalOpen(true)}
              className="bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              title="Importar Backup de Ficha ou Sistema via PDF"
            >
              <Upload className="w-4 h-4 text-purple-400" />
              Importar Backup (PDF)
            </button>
          </div>
        </div>

        {/* Notificações / Convites */}
        {(() => {
          const inviteNotifs = notifications.filter(n => n.type === 'INVITE' || !n.type);
          const systemNotifs = notifications.filter(n => n.type === 'SYSTEM');

          if (notifications.length === 0) return null;

          return (
            <div className="mb-8 space-y-6">
              {/* Convites de Mesa */}
              {inviteNotifs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-400 animate-pulse" />
                    Convites de Mesa Pendentes ({inviteNotifs.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inviteNotifs.map((notif) => (
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

              {/* Avisos do Sistema (ex: PE/XP Recebido) */}
              {systemNotifs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Notificações & Avisos do Sistema ({systemNotifs.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemNotifs.map((notif) => (
                      <div key={notif.id} className="bg-cyan-950/10 border border-cyan-900/35 p-4 rounded-xl flex flex-col justify-between sm:flex-row sm:items-center gap-4 shadow-xl">
                        <div>
                          <span className="text-xs font-bold text-cyan-400 block mb-1">{notif.title}</span>
                          <p className="text-xs text-slate-300">{notif.message}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDismissNotification(notif.id)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors active:scale-95 cursor-pointer"
                          >
                            Entendido
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
            Mesas de Jogo ({tables.length})
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
                    <span>Atualizado: {formatDate(char.updated_at)}</span>
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
          <div className="space-y-6">
            {/* Sub-bar para alternar entre Minhas Mesas e Explorar Mesas */}
            <div className="flex items-center gap-3 bg-[#0f172a]/20 border border-slate-800/40 p-1.5 rounded-xl w-fit">
              <button
                onClick={() => setTablesSubTab('my_tables')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  tablesSubTab === 'my_tables'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Mesas de Jogo ({tables.length})
              </button>
              <button
                onClick={() => setTablesSubTab('explore')}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  tablesSubTab === 'explore'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Explorar Mesas Públicas ({publicTables.length})
              </button>
            </div>

            {tablesSubTab === 'my_tables' ? (
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
                            {table.master_id === profile?.id ? 'Mestre' : 'Jogador'}
                          </span>
                          <div className="flex items-center gap-2">
                            {table.is_private && (
                              <span className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-800/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Privada
                              </span>
                            )}
                            {table.master_id === profile?.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTable(table.id);
                                }}
                                className="p-1 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
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
                                className="p-1 hover:bg-amber-950/40 text-slate-500 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
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

                        <div className="flex flex-wrap gap-2 mt-4 text-[10px] text-slate-400">
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 flex items-center gap-1">
                            <Users className="w-3 h-3 text-cyan-400" />
                            Máx {table.max_players ?? 4} Jogadores
                          </span>
                          <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-purple-400" />
                            {table.allow_spectators ?? true ? 'Espectadores OK' : 'Sem Espectadores'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-500">
                        <span>Mesa ID: {table.id.slice(0, 8)}...</span>
                        <span className="text-cyan-400 font-semibold hover:underline">Entrar na Mesa &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl">
                  <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-300">Nenhuma mesa própria ou vinculada</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
                    Você ainda não criou ou não é jogador ativo em nenhuma mesa.
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
              /* Aba Explorar Mesas Públicas */
              publicTables.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicTables.map((pubTable) => {
                    const isMemberOrMaster = tables.some(t => t.id === pubTable.id);
                    const isMaster = pubTable.master_id === profile?.id;
                    const playerRole = tableRoles[pubTable.id]; // 'player' or 'spectator'
                    const isPlayer = isMaster || playerRole === 'player';
                    const activePlayers = pubTable.player_count ?? 0;
                    const maxLimit = pubTable.max_players ?? 4;
                    const isFull = activePlayers >= maxLimit;

                    return (
                      <div
                        key={pubTable.id}
                        className="bg-[#0f172a]/40 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-md hover:shadow-cyan-500/5 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Compass className="w-3 h-3" />
                              Mesa Pública
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isFull ? 'bg-rose-950/40 border border-rose-800/30 text-rose-400' : 'bg-cyan-950/40 border border-cyan-800/30 text-cyan-400'
                            }`}>
                              {activePlayers}/{maxLimit} Jogadores
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-200 mb-2 truncate">
                            {pubTable.name}
                          </h3>
                          <p className="text-slate-400 text-sm line-clamp-2">
                            {pubTable.description || 'Sem descrição fornecida.'}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-4 text-[10px] text-slate-400">
                            <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-purple-400" />
                              {pubTable.rule_systems?.name || '3D&T Alpha'}
                            </span>
                            <span className="bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-purple-400" />
                              {pubTable.allow_spectators ?? true ? 'Espectadores OK' : 'Sem Espectadores'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-800/60 flex gap-2">
                          {isMemberOrMaster ? (
                            <>
                              {isPlayer ? (
                                <>
                                  <button
                                    onClick={() => router.push(`/tables/${pubTable.id}`)}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    Entrar como Jogador
                                  </button>
                                  <button
                                    disabled
                                    className="flex-1 bg-slate-850 text-slate-500 border border-slate-800 font-semibold py-2 rounded-xl text-[10px] flex items-center justify-center gap-1 cursor-not-allowed opacity-50"
                                    title="Você já é jogador ativo desta mesa."
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Assistir (Já é Jogador)
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!isFull && (
                                    <button
                                      onClick={async () => {
                                        if (!profile) return;
                                        const res = await joinTable(pubTable.id, profile.id, 'player');
                                        if (res.success) {
                                          showSystemModal({ type: 'success', title: 'Sucesso', message: 'Você ingressou na mesa como jogador!' });
                                          setTables(prev => prev.map(t => t.id === pubTable.id ? { ...t } : t));
                                          router.push(`/tables/${pubTable.id}`);
                                        } else {
                                          showSystemModal({ type: 'alert', title: 'Erro', message: res.message || 'Erro ao ingressar.' });
                                        }
                                      }}
                                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      Virar Jogador
                                    </button>
                                  )}
                                  <button
                                    onClick={() => router.push(`/tables/${pubTable.id}`)}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    Assistir Espectador
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              {!isFull && (
                                <button
                                  onClick={async () => {
                                    if (!profile) return;
                                    const res = await joinTable(pubTable.id, profile.id, 'player');
                                    if (res.success) {
                                      showSystemModal({ type: 'success', title: 'Sucesso', message: 'Você ingressou na mesa como jogador!' });
                                      setTables(prev => [...prev, pubTable]);
                                      router.push(`/tables/${pubTable.id}`);
                                    } else {
                                      showSystemModal({ type: 'alert', title: 'Erro', message: res.message || 'Erro ao ingressar.' });
                                    }
                                  }}
                                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  Entrar como Jogador
                                </button>
                              )}
                              {(pubTable.allow_spectators ?? true) && (
                                <button
                                  onClick={async () => {
                                    if (!profile) return;
                                    const res = await joinTable(pubTable.id, profile.id, 'spectator');
                                    if (res.success) {
                                      setTables(prev => [...prev, pubTable]);
                                      router.push(`/tables/${pubTable.id}`);
                                    } else {
                                      showSystemModal({ type: 'alert', title: 'Erro', message: res.message || 'Erro ao ingressar como espectador.' });
                                    }
                                  }}
                                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Assistir Espectador
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-[#0f172a]/20 border border-slate-800/40 rounded-2xl">
                  <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-slate-300">Nenhuma mesa pública encontrada</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                    Não existem mesas públicas ativas no momento. Seja o primeiro a criar uma!
                  </p>
                </div>
              )
            )}
          </div>
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

                    <div className="mt-5 pt-4 border-t border-slate-800/60 flex flex-wrap justify-between gap-2">
                      <button
                        onClick={() => handleExportSystemPdf(system)}
                        className="flex-1 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Exportar Livro de Regras em PDF com dados embutidos"
                      >
                        <Download className="w-3 h-3 text-purple-400" />
                        Livro (PDF)
                      </button>

                      <button
                        onClick={() => handleExportSystem(system)}
                        className="flex-1 bg-slate-850 hover:bg-slate-800 border border-slate-700/65 text-slate-350 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        JSON
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
      
        {/* Modal Editor do Sandbox de Sistemas de Regras */}
        {isEditingSystem && editingSystem && (
          <SystemEditorModal
            isOpen={isEditingSystem}
            systemState={editingSystem}
            onSave={handleSaveSystem}
            onClose={() => {
              setIsEditingSystem(false);
              setEditingSystem(null);
            }}
            showSystemModal={showSystemModal}
          />
        )}

        {/* Modal de Preferências de Exibição */}
        <PreferencesModal
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
          currentTheme={currentTheme}
          currentAvatarUrl={avatarUrl || profile?.avatar_url}
          onSave={handleSavePreferences}
        />

        {/* Modal de Importação de PDF */}
        <PdfImportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onImportSuccess={handleImportPdfSuccess}
        />
          </div>
        </main>

        {profile && isLobbyOpen && (
          <LobbyChat
            isOpen={isLobbyOpen}
            onClose={() => setIsLobbyOpen(false)}
            currentUserId={profile.id}
            currentUsername={profile.username || 'Aventureiro'}
            currentAvatarUrl={profile.avatar_url || avatarUrl}
          />
        )}
      </div>

      {/* Etiqueta Lateral Fixa no Canto Direito (para abrir o Lobby quando estiver offline) */}
      {!isLobbyOpen && profile && (
        <button
          onClick={() => setIsLobbyOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3.5 px-2 rounded-l-2xl shadow-2xl flex flex-col items-center gap-2 transition-all cursor-pointer border-l border-t border-b border-purple-400/40 group hover:pr-3 animate-fade-in"
          title="Entrar no Lobby"
        >
          <MessageSquare className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
          <span className="[writing-mode:vertical-rl] tracking-widest text-[10px] uppercase font-extrabold">Lobby</span>
        </button>
      )}

      {profile && (
        <FriendsDrawer
          isOpen={isFriendsOpen}
          onClose={() => setIsFriendsOpen(false)}
          currentUserId={profile.id}
        />
      )}

      {profile && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profile={profile}
          onSave={(updated) => {
            setProfile(updated);
            if (updated.avatar_url) setAvatarUrl(updated.avatar_url);
          }}
        />
      )}

      <SystemModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
