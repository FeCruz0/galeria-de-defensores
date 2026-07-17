'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Table, ChatMessage, Profile, Character } from '@/types/game';
import { executeCustomRoll, getMaxPv, getMaxPm, getModifiedAttributes, getEquippedItemsModifiers } from '@/lib/rules';
import { canLinkCharacterToTable } from '@/lib/validations';
import { 
  ArrowLeft, 
  Loader2, 
  Send, 
  Dice5, 
  Users, 
  Lock, 
  Hash, 
  Shield,
  Trash2,
  MessageSquare,
  BookOpen,
  ShieldAlert,
  ZapOff
} from 'lucide-react';
import { STATUS_CONDITIONS } from '@/lib/status';
import DiceRollOverlay from '@/components/DiceRollOverlay';

type Params = Promise<{ id: string }>;

export default function GameTablePage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState<Table | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // States Multiplayer (Drawer de Personagens / Jogadores)
  const [tablePlayers, setTablePlayers] = useState<any[]>([]);
  const [linkedCharacters, setLinkedCharacters] = useState<Character[]>([]);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selectedCharacterSheet, setSelectedCharacterSheet] = useState<Character | null>(null);

  const [messageText, setMessageText] = useState('');
  const [diceCount, setDiceCount] = useState(1);
  const [diceModifier, setDiceModifier] = useState(0);
  const [inviteUsername, setInviteUsername] = useState('');
  const [virtualRoll, setVirtualRoll] = useState<{ results: number[]; title: string; callback: () => void } | null>(null);
  const [activeTab, setActiveTab] = useState<'mesa' | 'chat' | 'journal'>('mesa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDistributingXp, setIsDistributingXp] = useState(false);
  const [xpAmount, setXpAmount] = useState(1);
  const [selectedXpCharIds, setSelectedXpCharIds] = useState<string[]>([]);

  // States do Diário de Campanha
  const [publicJournal, setPublicJournal] = useState<string>('');
  const [privateJournal, setPrivateJournal] = useState<string>('');
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const [publicJournalId, setPublicJournalId] = useState<string | null>(null);
  const [privateJournalId, setPrivateJournalId] = useState<string | null>(null);

  const lastSavedPublic = useRef('');
  const lastSavedPrivate = useRef('');

  function showToast(msg: string) {
    setToastMessage(msg);
  }

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 1. Carregar Mesa, Usuário e Histórico de Chat
  useEffect(() => {
    async function loadTableData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);

        // Perfil
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (prof) setProfile(prof);

        // Mesa
        const { data: tblData } = await supabase
          .from('tables')
          .select('*, rule_systems(name)')
          .eq('id', id)
          .single();

        if (!tblData) {
          router.push('/dashboard');
          return;
        }
        setTable(tblData);

        // Histórico de Mensagens
        const { data: msgData } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('table_id', id)
          .order('created_at', { ascending: true })
          .limit(100);

        if (msgData) {
          setMessages(msgData);
        }

        // Jogadores da mesa
        const { data: playersData } = await supabase
          .from('table_players')
          .select('player_id, profiles(username)')
          .eq('table_id', id);
        if (playersData) setTablePlayers(playersData);

        // Personagens vinculados a esta mesa
        const { data: linkedChars } = await supabase
          .from('characters')
          .select('*')
          .eq('table_id', id);
        if (linkedChars) setLinkedCharacters(linkedChars as any[]);

        // Meus personagens para vinculação
        const { data: myChars } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', user.id);
        if (myChars) setMyCharacters(myChars as any[]);

        // Carregar Diário Público
        const { data: pubJourn } = await supabase
          .from('campaign_journals')
          .select('*')
          .eq('table_id', id)
          .eq('is_public', true)
          .maybeSingle();

        if (pubJourn) {
          lastSavedPublic.current = pubJourn.content;
          setPublicJournal(pubJourn.content);
          setPublicJournalId(pubJourn.id);
        }

        // Carregar Diário Privado
        const { data: privJourn } = await supabase
          .from('campaign_journals')
          .select('*')
          .eq('table_id', id)
          .eq('user_id', user.id)
          .eq('is_public', false)
          .maybeSingle();

        if (privJourn) {
          lastSavedPrivate.current = privJourn.content;
          setPrivateJournal(privJourn.content);
          setPrivateJournalId(privJourn.id);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da mesa:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTableData();
  }, [id, router, supabase]);

  // 2. Ouvinte de Realtime para Chat e Personagens
  useEffect(() => {
    if (!id || loading) return;

    const channel = supabase
      .channel(`table-realtime-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `table_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Evita mensagens duplicadas caso a query e o realtime coincidam
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `table_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLinkedCharacters((prev) => {
              if (prev.some(c => c.id === payload.new.id)) return prev;
              return [...prev, payload.new as Character];
            });
          } else if (payload.eventType === 'UPDATE') {
            setLinkedCharacters((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Character) : c))
            );
            // Atualiza a ficha de personagem ativa localmente se for a mesma modificada
            setSelectedCharacterSheet((current) => {
              if (current && current.id === payload.new.id) {
                return payload.new as Character;
              }
              return current;
            });
          } else if (payload.eventType === 'DELETE') {
            setLinkedCharacters((prev) => prev.filter((c) => c.id !== payload.old.id));
            setSelectedCharacterSheet((current) => {
              if (current && current.id === payload.old.id) {
                return null;
              }
              return current;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_journals',
          filter: `table_id=eq.${id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_public) {
            if ((payload.new as any).user_id !== currentUser?.id) {
              lastSavedPublic.current = (payload.new as any).content;
              setPublicJournal((payload.new as any).content);
              setPublicJournalId((payload.new as any).id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loading, supabase, currentUser]);

  // 3. Scroll Automático no Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Debounced Save para Diário Público
  useEffect(() => {
    if (!currentUser || !table) return;
    if (table.master_id !== currentUser.id) return; // Apenas o mestre edita o diário público
    if (publicJournal === lastSavedPublic.current) return;

    setSavingPublic(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (publicJournalId) {
          await supabase
            .from('campaign_journals')
            .update({ content: publicJournal, updated_at: new Date().toISOString() })
            .eq('id', publicJournalId);
          lastSavedPublic.current = publicJournal;
        } else {
          const { data, error } = await supabase
            .from('campaign_journals')
            .insert({
              table_id: id,
              user_id: currentUser.id,
              is_public: true,
              content: publicJournal
            })
            .select()
            .single();
          if (data) {
            setPublicJournalId(data.id);
            lastSavedPublic.current = publicJournal;
          }
        }
      } catch (err) {
        console.error('Erro ao salvar diário público:', err);
      } finally {
        setSavingPublic(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [publicJournal, publicJournalId, id, currentUser, table, supabase]);

  // 5. Debounced Save para Diário Privado
  useEffect(() => {
    if (!currentUser || !table) return;
    if (privateJournal === lastSavedPrivate.current) return;

    setSavingPrivate(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (privateJournalId) {
          await supabase
            .from('campaign_journals')
            .update({ content: privateJournal, updated_at: new Date().toISOString() })
            .eq('id', privateJournalId);
          lastSavedPrivate.current = privateJournal;
        } else {
          const { data, error } = await supabase
            .from('campaign_journals')
            .insert({
              table_id: id,
              user_id: currentUser.id,
              is_public: false,
              content: privateJournal
            })
            .select()
            .single();
          if (data) {
            setPrivateJournalId(data.id);
            lastSavedPrivate.current = privateJournal;
          }
        }
      } catch (err) {
        console.error('Erro ao salvar diário privado:', err);
      } finally {
        setSavingPrivate(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [privateJournal, privateJournalId, id, currentUser, table, supabase]);

  // Enviar Mensagem de Texto
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !currentUser) return;

    const content = messageText.trim();
    setMessageText('');

    try {
      await supabase.from('chat_messages').insert({
        table_id: id,
        sender_id: currentUser.id,
        sender_name: profile?.username || 'Jogador',
        content,
        type: 'TEXT',
        is_edited: false
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  }

  // Realizar Rolagem de Dados
  async function handleRollDice() {
    if (!currentUser || !table) return;

    const diceValues: number[] = [];
    let rollSum = 0;
    let isCritical = false;

    for (let i = 0; i < diceCount; i++) {
      const val = Math.floor(Math.random() * 6) + 1; // 1d6
      diceValues.push(val);
      rollSum += val;
      if (val === 6) isCritical = true; // Em 3D&T Alpha 6 é crítico
    }

    const total = rollSum + diceModifier;
    const modifierText = diceModifier !== 0 ? ` ${diceModifier >= 0 ? '+' : '-'} ${Math.abs(diceModifier)}` : '';
    const content = `rolou ${diceCount}d6${modifierText} 🎲`;

    setVirtualRoll({
      results: diceValues,
      title: 'Rolando Dados na Mesa',
      callback: async () => {
        try {
          await supabase.from('chat_messages').insert({
            table_id: id,
            sender_id: currentUser.id,
            sender_name: profile?.username || 'Jogador',
            content,
            type: 'ROLL',
            roll_result: {
              total,
              dices: diceValues,
              modifiers: diceModifier,
              isCrit: isCritical,
              componentsText: `[${diceValues.join(', ')}]`
            },
            is_edited: false
          });
        } catch (err) {
          console.error('Erro ao salvar rolagem:', err);
        }
      }
    });
  }

  // Vincular personagem à mesa
  async function handleLinkCharacter(charId: string) {
    const charToLink = myCharacters.find(c => c.id === charId);
    if (!charToLink) return;

    if (!canLinkCharacterToTable(table?.rule_system_id, charToLink.rule_system_id)) {
      showToast('Inconsistência de regras: Este personagem pertence a um sistema diferente.');
      return;
    }

    try {
      const { error } = await supabase
        .from('characters')
        .update({ table_id: id })
        .eq('id', charId);
      if (error) throw error;

      // Atualizar lista local
      const { data: linkedChars } = await supabase
        .from('characters')
        .select('*')
        .eq('table_id', id);
      if (linkedChars) setLinkedCharacters(linkedChars as any[]);
      showToast('Personagem vinculado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao vincular personagem.');
    }
  }

  // Enviar convite para jogador
  async function handleSendInvite() {
    if (!currentUser || !table || !inviteUsername.trim()) return;

    try {
      const normUsername = inviteUsername.trim();
      
      const { data: targetProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.eq.${normUsername},email.eq.${normUsername}`)
        .maybeSingle();

      if (profileErr || !targetProfile) {
        showToast('Jogador não encontrado. Verifique se o nome de usuário está correto.');
        return;
      }

      if (targetProfile.id === currentUser.id) {
        showToast('Você não pode convidar a si mesmo.');
        return;
      }

      const { error: inviteErr } = await supabase
        .from('notifications')
        .insert({
          user_id: targetProfile.id,
          sender_id: currentUser.id,
          title: 'Convite para Mesa',
          message: `${profile?.username || 'O mestre'} convidou você para jogar na mesa "${table.name}"!`,
          type: 'INVITE',
          table_id: table.id,
          is_read: false
        });

      if (inviteErr) throw inviteErr;

      showToast(`Convite enviado com sucesso para ${targetProfile.username}!`);
      setInviteUsername('');
    } catch (err) {
      console.error('Erro ao enviar convite:', err);
      showToast('Erro ao enviar o convite.');
    }
  }

  // Distribuir XP para os personagens selecionados via RPC
  async function handleDistributeXp() {
    if (!currentUser || !table || selectedXpCharIds.length === 0 || xpAmount <= 0) return;

    try {
      const { error } = await supabase.rpc('distribute_xp_to_characters', {
        p_table_id: table.id,
        p_character_ids: selectedXpCharIds,
        p_xp_amount: xpAmount
      });

      if (error) throw error;

      showToast(`PEs distribuídos com sucesso para ${selectedXpCharIds.length} personagem(ns)!`);
      setIsDistributingXp(false);
      setSelectedXpCharIds([]);
      setXpAmount(1);
    } catch (err) {
      console.error('Erro ao distribuir XP:', err);
      showToast('Erro ao distribuir experiência.');
    }
  }

  // Desvincular personagem da mesa
  async function handleUnlinkCharacter(charId: string) {
    try {
      const { error } = await supabase
        .from('characters')
        .update({ table_id: null })
        .eq('id', charId);
      if (error) throw error;

      setLinkedCharacters(prev => prev.filter(c => c.id !== charId));
    } catch (err) {
      console.error(err);
      showToast('Erro ao desvincular personagem.');
    }
  }

  // Realizar rolagem a partir da Ficha Rápida
  async function handleRollFromQuickSheet(name: string, value: number, isAttribute: boolean, rollObj?: any) {
    if (!currentUser || !profile || !selectedCharacterSheet) return;

    let rollResultPayload: any = null;
    let content = '';
    let diceValuesForAnimation: number[] = [];

    const activeEffects = selectedCharacterSheet.status_effects || [];
    const equippedMods = getEquippedItemsModifiers(selectedCharacterSheet.inventory);

    if (isAttribute) {
      const modifiedAttrs = getModifiedAttributes(selectedCharacterSheet.attributes_values, activeEffects, equippedMods);
      
      // Mapear nome de volta para chave do atributo
      let attrKey = 'F';
      if (name === 'Habilidade') attrKey = 'H';
      else if (name === 'Resistência') attrKey = 'R';
      else if (name === 'Armadura') attrKey = 'A';
      else if (name === 'Poder de Fogo') attrKey = 'PdF';
      else attrKey = name;

      const modifiedValue = modifiedAttrs[attrKey] ?? value;

      const dieVal = Math.floor(Math.random() * 6) + 1;
      const isCrit = dieVal === 6;
      const total = dieVal + modifiedValue;
      
      let statusSuffix = '';
      if (activeEffects.length > 0) {
        const activeNames = STATUS_CONDITIONS
          .filter(c => activeEffects.includes(c.id))
          .map(c => c.name)
          .join(', ');
        if (activeNames) statusSuffix = ` [Status: ${activeNames}]`;
      }

      content = `rolou teste de ${name} [${modifiedValue}]${statusSuffix} 🎲`;
      diceValuesForAnimation = [dieVal];
      
      rollResultPayload = {
        total,
        dices: [dieVal],
        modifiers: modifiedValue,
        isCrit,
        componentsText: `1d6 [${dieVal}${isCrit ? '!' : ''}] + ${name} [${modifiedValue}] = ${total}`
      };
    } else if (rollObj) {
      const result = executeCustomRoll(
        rollObj,
        selectedCharacterSheet.attributes_values,
        undefined,
        activeEffects,
        equippedMods
      );
      content = `realizou rolagem customizada "${rollObj.name}" 🎲`;
      
      let statusSuffix = '';
      if (activeEffects.length > 0) {
        const activeNames = STATUS_CONDITIONS
          .filter(c => activeEffects.includes(c.id))
          .map(c => c.name)
          .join(', ');
        if (activeNames) statusSuffix = ` [Status: ${activeNames}]`;
      }
      content += statusSuffix;
      
      diceValuesForAnimation = result.dices;
      
      if (rollObj.pmCost && rollObj.pmCost > 0) {
        const currentPm = selectedCharacterSheet.resources_current?.['PM'] ?? 0;
        if (currentPm < rollObj.pmCost) {
          showToast(`PM insuficiente para "${rollObj.name}" (Custo: ${rollObj.pmCost} PM, Atual: ${currentPm} PM)`);
          return;
        }
        
        const updatedResources = {
          ...selectedCharacterSheet.resources_current,
          PM: Math.max(0, currentPm - rollObj.pmCost)
        };
        
        selectedCharacterSheet.resources_current = updatedResources;
        
        await supabase
          .from('characters')
          .update({ resources_current: updatedResources })
          .eq('id', selectedCharacterSheet.id);
          
        content += ` [Gastou ${rollObj.pmCost} PM]`;
      }

      rollResultPayload = {
        total: result.total,
        dices: result.dices,
        modifiers: result.modifiers,
        isCrit: result.isCrit,
        componentsText: result.componentsText
      };
    }

    setVirtualRoll({
      results: diceValuesForAnimation.length > 0 ? diceValuesForAnimation : [6],
      title: isAttribute ? `Teste de ${name}` : (rollObj?.name || 'Rolagem'),
      callback: async () => {
        try {
          await supabase.from('chat_messages').insert({
            table_id: id,
            sender_id: currentUser.id,
            sender_name: `${profile.username} (Ficha: ${selectedCharacterSheet?.name})`,
            content,
            type: 'ROLL',
            roll_result: rollResultPayload,
            is_edited: false
          });
        } catch (err) {
          console.error('Erro ao rolar da ficha rápida:', err);
        }
      }
    });
  }

  // Alternar status do personagem
  async function handleToggleStatus(statusId: string) {
    if (!selectedCharacterSheet) return;
    
    const currentStatus = selectedCharacterSheet.status_effects || [];
    let newStatus: string[];
    if (currentStatus.includes(statusId)) {
      newStatus = currentStatus.filter(id => id !== statusId);
    } else {
      newStatus = [...currentStatus, statusId];
    }
    
    // Atualiza o estado local temporariamente (o realtime sincroniza de volta)
    setSelectedCharacterSheet(prev => prev ? { ...prev, status_effects: newStatus } : null);
    
    try {
      const { error } = await supabase
        .from('characters')
        .update({ status_effects: newStatus })
        .eq('id', selectedCharacterSheet.id);
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar status do personagem:', err);
      showToast('Erro ao atualizar status.');
    }
  }

  if (loading || !table) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col h-screen overflow-hidden">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0f172a]/40 backdrop-blur-md h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white leading-tight">{table.name}</h1>
            <p className="text-xs text-slate-400 truncate max-w-md">{table.description || 'Sem descrição'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {table.rule_systems?.name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-350 bg-purple-950/20 border border-purple-800/35 px-3 py-1.5 rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold">{table.rule_systems.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/30 border border-slate-800/80 px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            Mesa ID: {table.id.slice(0, 8)}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Controls & Rolador */}
        <div className={`flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 ${
          activeTab === 'mesa' ? 'grid' : 'hidden lg:grid'
        }`}>
          <div className="space-y-6">
            
            {/* Rolador de Dados Card */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-purple-400" />
                Rolador de Dados (3D&T)
              </h2>

              <div className="space-y-4">
                {/* Qtd Dados */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Quantidade de Dados (d6)
                  </label>
                  <div className="flex items-center gap-3 bg-slate-800/30 border border-slate-800/80 rounded-xl p-2">
                    <button 
                      onClick={() => setDiceCount(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-lg">{diceCount}d6</span>
                    <button 
                      onClick={() => setDiceCount(prev => Math.min(10, prev + 1))}
                      className="w-10 h-10 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Modificadores */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Modificador Geral
                  </label>
                  <div className="flex items-center gap-3 bg-slate-800/30 border border-slate-800/80 rounded-xl p-2">
                    <button 
                      onClick={() => setDiceModifier(prev => prev - 1)}
                      className="w-10 h-10 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-lg">
                      {diceModifier >= 0 ? `+${diceModifier}` : diceModifier}
                    </span>
                    <button 
                      onClick={() => setDiceModifier(prev => prev + 1)}
                      className="w-10 h-10 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Botão Rolar */}
                <button
                  onClick={handleRollDice}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
                >
                  <Dice5 className="w-5 h-5 animate-bounce" />
                  Rolar Dados na Mesa
                </button>
              </div>
            </div>

            {/* Regras e Dicas do Legado */}
            <div className="p-4 bg-slate-800/10 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-2">
              <span className="font-semibold text-slate-300 block">Como funciona a rolagem:</span>
              <p>• Crítico em 3D&T Alpha ocorre quando um dado rola o valor máximo 6.</p>
              <p>• Suas rolagens e resultados são enviados instantaneamente para o chat do grupo à direita.</p>
            </div>
          </div>

          {/* Coluna 2: Painel de Jogadores e Fichas */}
          <div className="space-y-6">
            {/* Convidar Jogador (Apenas para o Mestre) */}
            {table.master_id === currentUser?.id && (
              <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h2 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Convidar Jogador (Mestre)
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Nome de usuário do jogador..."
                    className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                  />
                  <button
                    onClick={handleSendInvite}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors active:scale-95 cursor-pointer"
                  >
                    Convidar
                  </button>
                </div>
              </div>
            )}

            {/* Vincular Personagem */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Vincular Meu Personagem
              </h2>
              
              <div className="flex gap-2">
                <select
                  id="link-char-select"
                  className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300"
                >
                  <option value="">Selecione uma Ficha...</option>
                  {myCharacters
                    .filter(c => c.table_id !== id)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.points_total} pts)</option>
                    ))
                  }
                </select>
                <button
                  onClick={() => {
                    const sel = document.getElementById('link-char-select') as HTMLSelectElement;
                    if (sel && sel.value) {
                      handleLinkCharacter(sel.value);
                    } else {
                      showToast('Selecione um personagem primeiro.');
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 rounded-xl text-xs transition-colors"
                >
                  Vincular
                </button>
              </div>
            </div>

            {/* Fichas Ativas na Mesa */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-355 uppercase tracking-wider">
                  Fichas na Mesa
                </h2>
                {table.master_id === currentUser?.id && linkedCharacters.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedXpCharIds(linkedCharacters.map(c => c.id));
                      setXpAmount(1);
                      setIsDistributingXp(true);
                    }}
                    className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    Distribuir PEs
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {linkedCharacters.map((char) => {
                  const isMine = char.user_id === currentUser?.id;
                  const isMaster = table.master_id === currentUser?.id;
                  
                  return (
                    <div key={char.id} className="flex justify-between items-center bg-[#1e293b]/20 border border-slate-800/60 p-4 rounded-xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">{char.name}</span>
                          {/* Badges de Status Ativos */}
                          <div className="flex gap-1 items-center">
                            {(char.status_effects || []).map((effId) => {
                              const condition = STATUS_CONDITIONS.find(c => c.id === effId);
                              if (!condition) return null;
                              let IconComponent = Shield;
                              if (condition.icon === 'ShieldAlert') IconComponent = ShieldAlert;
                              else if (condition.icon === 'Loader2') IconComponent = Loader2;
                              else if (condition.icon === 'ZapOff') IconComponent = ZapOff;
                              
                              return (
                                <span
                                  key={effId}
                                  title={`${condition.name}: ${condition.description}`}
                                  className={`p-1 rounded-full border text-[9px] flex items-center justify-center ${condition.colorClass}`}
                                >
                                  <IconComponent className={`w-2.5 h-2.5 ${condition.icon === 'Loader2' ? 'animate-spin' : ''}`} />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{char.concept || 'Guerreiro'} • {char.points_total} pts</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedCharacterSheet(char)}
                          className="bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          Abrir Ficha
                        </button>
                        
                        {(isMine || isMaster) && (
                          <button
                            onClick={() => handleUnlinkCharacter(char.id)}
                            className="p-1.5 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="Desvincular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {linkedCharacters.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 italic">
                    Nenhum personagem vinculado a esta mesa ainda.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Chat Sidebar */}
        <div className={`w-full lg:w-96 border-l border-slate-800 bg-[#0c1224]/80 flex flex-col justify-between flex-shrink-0 h-full ${
          activeTab === 'chat' || activeTab === 'journal' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Cabeçalho de Abas da Sidebar */}
          <div className="border-b border-slate-800 bg-[#0c1224] p-3 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab !== 'journal'
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'journal'
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Diário
            </button>
          </div>

          {activeTab === 'journal' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Conteúdo do Diário */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {/* Seção 1: Diário do Mestre (Público) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      Diário do Mestre (Público)
                    </span>
                    {savingPublic && (
                      <span className="text-[10px] text-purple-400 flex items-center gap-1 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Salvando...
                      </span>
                    )}
                    {!savingPublic && publicJournal.trim() !== '' && (
                      <span className="text-[10px] text-slate-500 font-mono">Salvo</span>
                    )}
                  </div>

                  {currentUser?.id === table?.master_id ? (
                    <textarea
                      value={publicJournal}
                      onChange={(e) => setPublicJournal(e.target.value)}
                      placeholder="Escreva as notas públicas da campanha aqui (NPCs, história, rumores)... Todos os jogadores verão em tempo real."
                      className="w-full h-44 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 text-xs focus:outline-none focus:border-purple-500/50 text-slate-200 resize-none font-sans leading-relaxed animate-fade-in"
                    />
                  ) : (
                    <div className="w-full min-h-24 max-h-56 overflow-y-auto bg-slate-900/40 border border-slate-850 rounded-xl p-4 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {publicJournal.trim() !== '' 
                        ? publicJournal 
                        : <span className="text-slate-550 italic">Nenhuma anotação pública registrada pelo Mestre até o momento.</span>
                      }
                    </div>
                  )}
                </div>

                {/* Seção 2: Minhas Notas (Privado) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                      Minhas Notas (Privado)
                    </span>
                    {savingPrivate && (
                      <span className="text-[10px] text-purple-400 flex items-center gap-1 font-mono">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Salvando...
                      </span>
                    )}
                    {!savingPrivate && privateJournal.trim() !== '' && (
                      <span className="text-[10px] text-slate-500 font-mono">Salvo</span>
                    )}
                  </div>
                  <textarea
                    value={privateJournal}
                    onChange={(e) => setPrivateJournal(e.target.value)}
                    placeholder="Escreva suas anotações secretas e lembretes aqui... Apenas você tem acesso a estas notas."
                    className="w-full h-56 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 text-xs focus:outline-none focus:border-purple-500/50 text-slate-200 resize-none font-sans leading-relaxed animate-fade-in"
                  />
                </div>

              </div>
            </div>
          ) : (
            <>
              {/* Feed de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  
                  if (msg.type === 'ROLL') {
                    return (
                      <div key={msg.id} className="p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs text-purple-400">
                          <span className="font-bold">{msg.sender_name}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-slate-300">{msg.content}</p>
                        {msg.roll_result && (
                          <div className="bg-slate-900/60 p-2.5 rounded-lg flex items-center justify-between border border-slate-800">
                            <span className="text-xs font-mono text-slate-400">{msg.roll_result.componentsText}</span>
                            <div className="text-right">
                              <span className={`text-lg font-black ${msg.roll_result.isCrit ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                                {msg.roll_result.total}
                              </span>
                              {msg.roll_result.isCrit && (
                                <span className="text-[10px] text-amber-400 block font-bold">CRÍTICO!</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end ml-auto' : 'mr-auto'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-400 truncate">{msg.sender_name}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`p-3 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-purple-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-800/60'
                      }`}>
                        <p className="leading-relaxed break-words">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-[#0c1224] flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

        </div>

      </div>

      {/* Bottom Tab Bar (Mobile only) */}
      <div className="lg:hidden border-t border-slate-800 bg-[#0c1224]/90 backdrop-blur-md flex items-center justify-around h-16 flex-shrink-0 z-40">
        <button
          onClick={() => setActiveTab('mesa')}
          className={`flex flex-col items-center gap-1 py-1 text-xs font-bold transition-all ${
            activeTab === 'mesa' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-350'
          }`}
        >
          <Dice5 className="w-5 h-5" />
          <span>Painel de Jogo</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 py-1 text-xs font-bold transition-all ${
            activeTab === 'chat' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-350'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Chat da Mesa</span>
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center gap-1 py-1 text-xs font-bold transition-all ${
            activeTab === 'journal' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-350'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Diário</span>
        </button>
      </div>

      {/* Drawer/Modal da Ficha Rápida do Jogador */}
      {selectedCharacterSheet && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#0f172a] border-l border-slate-800 z-50 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white truncate max-w-[200px]">
                  {selectedCharacterSheet.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  {selectedCharacterSheet.concept || 'Guerreiro'} • {selectedCharacterSheet.points_total} Pontos
                </p>
              </div>
              <button
                onClick={() => setSelectedCharacterSheet(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2.5 py-1 rounded-lg"
              >
                Fechar ×
              </button>
            </div>

            {/* Atributos Básicos com clique para Rolar */}
            {(() => {
              const activeEffects = selectedCharacterSheet.status_effects || [];
              const equippedMods = getEquippedItemsModifiers(selectedCharacterSheet.inventory);
              const modifiedAttrs = getModifiedAttributes(selectedCharacterSheet.attributes_values || {}, activeEffects, equippedMods);

              return (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Atributos (Clique para Rolar d6 + Atributo)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {Object.keys(selectedCharacterSheet.attributes_values || {}).map((attrKey) => {
                      const baseVal = selectedCharacterSheet.attributes_values[attrKey] || 0;
                      const modVal = modifiedAttrs[attrKey] ?? baseVal;
                      const diff = modVal - baseVal;
                      
                      const attrLabels: Record<string, string> = {
                        F: 'Força',
                        H: 'Habilidade',
                        R: 'Resistência',
                        A: 'Armadura',
                        PdF: 'Poder de Fogo'
                      };
                      const colors: Record<string, string> = {
                        F: 'border-purple-500/20 text-purple-400 bg-purple-950/10 hover:bg-purple-950/20',
                        H: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/10 hover:bg-cyan-950/20',
                        R: 'border-emerald-500/20 text-emerald-400 bg-emerald-950/10 hover:bg-emerald-950/20',
                        A: 'border-slate-500/20 text-slate-350 bg-slate-800/20 hover:bg-slate-800/30',
                        PdF: 'border-rose-500/20 text-rose-400 bg-rose-950/10 hover:bg-rose-950/20'
                      };

                      return (
                        <button
                          key={attrKey}
                          onClick={() => handleRollFromQuickSheet(attrLabels[attrKey] || attrKey, baseVal, true)}
                          className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all duration-200 active:scale-95 cursor-pointer ${
                            colors[attrKey] || 'border-slate-700 text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {attrLabels[attrKey] || attrKey}
                          </span>
                          <span className="text-lg font-black mt-1 font-mono flex items-center gap-1 justify-center">
                            {baseVal}
                            {diff > 0 && (
                              <span className="text-[11px] text-emerald-400 font-bold font-sans shrink-0">(+{diff})</span>
                            )}
                            {diff < 0 && (
                              <span className="text-[11px] text-rose-500 font-bold font-sans shrink-0">({diff})</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Recursos Secundários */}
            {(() => {
              const equippedMods = getEquippedItemsModifiers(selectedCharacterSheet.inventory);
              const baseR = selectedCharacterSheet.attributes_values?.['R'] ?? 0;
              const charR = baseR + (equippedMods['R'] || 0);
              const maxPv = getMaxPv(charR, selectedCharacterSheet.advantages);
              const maxPm = getMaxPm(charR, selectedCharacterSheet.advantages);
              return (
                <div className="bg-slate-900/50 border border-slate-800/60 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Recursos Atuais</span>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-rose-400 block font-semibold">Pontos de Vida (PV)</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {selectedCharacterSheet.resources_current?.['PV'] ?? maxPv} / {maxPv}
                      </span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-cyan-400 block font-semibold">Pontos de Magia (PM)</span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {selectedCharacterSheet.resources_current?.['PM'] ?? maxPm} / {maxPm}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Status & Condições Temporárias */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Status & Condições
              </span>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_CONDITIONS.map((status) => {
                  const isActive = (selectedCharacterSheet.status_effects || []).includes(status.id);
                  
                  let IconComponent = Shield;
                  if (status.icon === 'ShieldAlert') IconComponent = ShieldAlert;
                  else if (status.icon === 'Loader2') IconComponent = Loader2;
                  else if (status.icon === 'ZapOff') IconComponent = ZapOff;

                  return (
                    <button
                      key={status.id}
                      onClick={() => handleToggleStatus(status.id)}
                      title={status.description}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all duration-200 active:scale-95 cursor-pointer ${
                        isActive
                          ? status.colorClass + ' border-purple-500/50 shadow-md shadow-purple-500/5'
                          : 'border-slate-800 bg-slate-900/20 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 shrink-0 ${isActive && status.icon === 'Loader2' ? 'animate-spin' : ''}`} />
                      <span className="truncate">{status.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rolagens Customizadas */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Ações e Rolagens Customizadas
              </span>
              
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {(selectedCharacterSheet.custom_rolls || []).map((roll: any, index: number) => (
                  <button
                    key={roll.id || index}
                    onClick={() => handleRollFromQuickSheet(roll.name, 0, false, roll)}
                    className="w-full flex justify-between items-center bg-[#1e293b]/30 hover:bg-[#1e293b]/50 border border-slate-800/80 p-3 rounded-xl transition-all duration-200 text-left active:scale-[0.98]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-350">{roll.name}</span>
                        {roll.type && roll.type !== 'OTHER' && (
                          <span className="text-[8px] bg-amber-950/40 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {roll.type === 'ATTACK' ? 'Ataque' : 
                             roll.type === 'DEFENSE' ? 'Defesa' : 
                             roll.type === 'MAGIC' ? 'Magia' : 
                             roll.type === 'TEST' ? 'Teste' : 
                             roll.type === 'INITIATIVE' ? 'Iniciativa' : roll.type}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                          {roll.components?.map((c: any) => `${c.count}d${c.faces}`).join(' + ') || `${roll.diceCount || 1}d6`}
                        </span>
                        {roll.primaryAttribute !== 'none' && roll.primaryAttribute && (
                          <span className="text-[9px] text-purple-400 font-mono">+{roll.primaryAttribute}</span>
                        )}
                        {roll.globalModifier !== 0 && roll.globalModifier && (
                          <span className="text-[9px] text-emerald-400 font-mono">
                            {roll.globalModifier >= 0 ? `+${roll.globalModifier}` : roll.globalModifier}
                          </span>
                        )}
                        {roll.pmCost !== undefined && roll.pmCost > 0 && (
                          <span className="text-[9px] text-blue-400 font-mono font-bold">({roll.pmCost} PM)</span>
                        )}
                      </div>
                    </div>
                    <Dice5 className="w-4 h-4 text-purple-400 flex-shrink-0 ml-2" />
                  </button>
                ))}
                {(!selectedCharacterSheet.custom_rolls || selectedCharacterSheet.custom_rolls.length === 0) && (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    Nenhuma rolagem customizada criada.
                  </div>
                )}
              </div>
            </div>

            {/* Vantagens e Perícias */}
            <div className="space-y-3 border-t border-slate-800/85 pt-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Habilidades & Características
              </span>
              
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto text-xs pr-1">
                {(selectedCharacterSheet.advantages || []).map((adv: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                    <span className="text-slate-300 font-medium">{adv.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Vantagem</span>
                  </div>
                ))}
                {(selectedCharacterSheet.disadvantages || []).map((dis: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                    <span className="text-slate-300 font-medium">{dis.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Desvantagem</span>
                  </div>
                ))}
                {(selectedCharacterSheet.skills || []).map((sk: any, index: number) => (
                  <div key={index} className="flex justify-between items-center bg-slate-800/10 p-2 rounded-lg border border-slate-800/40">
                    <span className="text-slate-300 font-medium">{sk}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Perícia</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Itens & Equipamentos */}
            <div className="space-y-3 border-t border-slate-800/85 pt-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Itens & Equipamentos
              </span>
              
              <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                {(selectedCharacterSheet.inventory || []).map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center bg-[#1e293b]/20 border border-slate-800/60 p-2.5 rounded-xl text-xs gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                        {item.bonus_attribute && item.bonus_value !== undefined && (
                          <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                            {item.bonus_value >= 0 ? `+${item.bonus_value}` : item.bonus_value} {
                              item.bonus_attribute === 'F' ? 'Força' :
                              item.bonus_attribute === 'H' ? 'Habilidade' :
                              item.bonus_attribute === 'R' ? 'Resistência' :
                              item.bonus_attribute === 'A' ? 'Armadura' :
                              item.bonus_attribute === 'PdF' ? 'Poder de Fogo' : item.bonus_attribute
                            }
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">Qtd: {item.quantity}</span>
                    </div>

                    {item.bonus_attribute && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedInventory = selectedCharacterSheet.inventory.map((i: any) => 
                            i.id === item.id ? { ...i, is_equipped: !i.is_equipped } : i
                          );
                          
                          setSelectedCharacterSheet({
                            ...selectedCharacterSheet,
                            inventory: updatedInventory
                          });

                          await supabase
                            .from('characters')
                            .update({ inventory: updatedInventory })
                            .eq('id', selectedCharacterSheet.id);
                        }}
                        className={`text-[9px] px-2 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer font-bold shrink-0 ${
                          item.is_equipped
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {item.is_equipped ? 'Equipado ⚔️' : 'Equipar'}
                      </button>
                    )}
                  </div>
                ))}
                {(!selectedCharacterSheet.inventory || selectedCharacterSheet.inventory.length === 0) && (
                  <div className="text-center py-4 text-xs text-slate-500 italic">
                    Nenhum item no inventário.
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-4 mt-4">
            <button
              onClick={() => setSelectedCharacterSheet(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              Fechar Painel
            </button>
          </div>

        </div>
      )}

      {/* Modal de Distribuição de PE (Mestre) */}
      {isDistributingXp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Distribuir Experiência (PEs)</h3>
                <p className="text-xs text-slate-400 mt-1">Conceda pontos de experiência para os personagens da mesa.</p>
              </div>
              <button
                onClick={() => setIsDistributingXp(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
              >
                Fechar ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Personagens */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Selecionar Personagens
                  </label>
                  <button
                    onClick={() => {
                      if (selectedXpCharIds.length === linkedCharacters.length) {
                        setSelectedXpCharIds([]);
                      } else {
                        setSelectedXpCharIds(linkedCharacters.map(c => c.id));
                      }
                    }}
                    className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                  >
                    {selectedXpCharIds.length === linkedCharacters.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-800 bg-[#070b19]/40 p-3 rounded-xl">
                  {linkedCharacters.map((char) => {
                    const isSelected = selectedXpCharIds.includes(char.id);
                    return (
                      <label
                        key={char.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-800/20 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedXpCharIds(prev => prev.filter(id => id !== char.id));
                            } else {
                              setSelectedXpCharIds(prev => [...prev, char.id]);
                            }
                          }}
                          className="rounded border-slate-700 text-purple-650 focus:ring-purple-500/20 bg-slate-850 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-200 block truncate">{char.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{char.concept || 'Guerreiro'} • XP: {char.experience}/10</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Quantidade de PEs */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Quantidade de PEs (XP)
                </label>
                <input
                  type="number"
                  min="1"
                  value={xpAmount}
                  onChange={(e) => setXpAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Cada 10 PEs concedidos serão automaticamente convertidos em 1 Ponto Guardado na ficha do personagem.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex gap-3">
              <button
                onClick={() => setIsDistributingXp(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-350 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDistributeXp}
                disabled={selectedXpCharIds.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl text-xs font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
              >
                Distribuir
              </button>
            </div>
          </div>
        </div>
      )}

      {virtualRoll && (
        <DiceRollOverlay
          diceResults={virtualRoll.results}
          title={virtualRoll.title}
          onComplete={() => {
            virtualRoll.callback();
            setVirtualRoll(null);
          }}
        />
      )}

      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f172a]/95 border border-purple-500/30 text-slate-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in max-w-sm">
          <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-semibold text-xs leading-relaxed">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
