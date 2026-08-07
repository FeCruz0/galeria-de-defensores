'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Table, ChatMessage, Profile, Character, RollResult } from '@/types/game';
import { executeCustomRoll, getMaxPv, getMaxPm, getModifiedAttributes, getEquippedItemsModifiers, executeAttributeTest } from '@/lib/rules';
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
  ZapOff,
  Flame,
  Skull,
  Sword,
  Sparkles,
  Heart,
  Zap,
  Snowflake,
  Settings,
  Eye,
  Crown,
  UserCheck,
  UserMinus,
  UserX,
  Check
} from 'lucide-react';
import { STATUS_CONDITIONS, StatusCondition } from '@/lib/status';
import DiceRollOverlay from '@/components/DiceRollOverlay';
import { updateMemberRoleAction, kickTableMemberAction, updateTableSettingsAction } from '@/actions/tableActions';

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

  // States Multiplayer (Drawer de Personagens / Jogadores / Espectadores)
  const [tablePlayers, setTablePlayers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'MASTER' | 'PLAYER' | 'SPECTATOR' | 'GUEST'>('GUEST');
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [editTableName, setEditTableName] = useState('');
  const [editTableDesc, setEditTableDesc] = useState('');
  const [editMaxPlayers, setEditMaxPlayers] = useState(4);
  const [editAllowSpectators, setEditAllowSpectators] = useState(true);
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [linkedCharacters, setLinkedCharacters] = useState<Character[]>([]);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selectedCharacterSheet, setSelectedCharacterSheet] = useState<Character | null>(null);

  const [messageText, setMessageText] = useState('');
  const [chatChannel, setChatChannel] = useState<'ON' | 'OFF'>('ON');
  const [selectedSenderIdentity, setSelectedSenderIdentity] = useState<string>('MASTER'); // 'MASTER' ou ID de um personagem
  const [diceCount, setDiceCount] = useState(1);
  const [diceFaces, setDiceFaces] = useState(6);
  const [diceModifier, setDiceModifier] = useState(0);
  const [rollMode, setRollMode] = useState<'QUICK' | 'ADVANCED'>('QUICK');
  const [rollActionName, setRollActionName] = useState('Rolagem de Mesa');
  const [rollCategory, setRollCategory] = useState<'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE' | 'OTHER'>('OTHER');
  const [selectedPrimaryAttr, setSelectedPrimaryAttr] = useState<string>('none');
  const [selectedSecondaryAttr, setSelectedSecondaryAttr] = useState<string>('none');
  const [selectedCharForRoll, setSelectedCharForRoll] = useState<string>('none');
  const [inviteUsername, setInviteUsername] = useState('');
  const [virtualRoll, setVirtualRoll] = useState<{ results: number[]; faces?: number; title: string; callback: () => void } | null>(null);
  const [activeTab, setActiveTab] = useState<'mesa' | 'chat' | 'journal'>('mesa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDistributingXp, setIsDistributingXp] = useState(false);
  const [xpAmount, setXpAmount] = useState(1);
  const [selectedXpCharIds, setSelectedXpCharIds] = useState<string[]>([]);
  const [customConditions, setCustomConditions] = useState<StatusCondition[]>([]);
  const [isManagingStatus, setIsManagingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusDesc, setNewStatusDesc] = useState('');
  const [newStatusIcon, setNewStatusIcon] = useState('Shield');
  const [newStatusColor, setNewStatusColor] = useState('text-red-400 bg-red-500/10 border-red-500/20');

  // States do Diário de Campanha
  const [publicJournal, setPublicJournal] = useState<string>('');
  const [privateJournal, setPrivateJournal] = useState<string>('');
  const [savingPublic, setSavingPublic] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);

  function getIconComponent(iconName: string) {
    switch (iconName) {
      case 'Flame': return Flame;
      case 'Skull': return Skull;
      case 'Sword': return Sword;
      case 'Sparkles': return Sparkles;
      case 'Heart': return Heart;
      case 'Zap': return Zap;
      case 'Snowflake': return Snowflake;
      case 'ShieldAlert': return ShieldAlert;
      case 'Loader2': return Loader2;
      case 'ZapOff': return ZapOff;
      case 'Shield':
      default:
        return Shield;
    }
  }
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
          .select('*, rule_systems(name, attribute_roll_config)')
          .eq('id', id)
          .single();

        if (!tblData) {
          router.push('/dashboard');
          return;
        }
        setTable(tblData);
        setEditTableName(tblData.name || '');
        setEditTableDesc(tblData.description || '');
        setEditMaxPlayers(tblData.max_players ?? 4);
        setEditAllowSpectators(tblData.allow_spectators ?? true);
        setEditIsPrivate(tblData.is_private ?? false);
        setEditPassword(tblData.password || '');

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

        // Jogadores e Espectadores da mesa
        const { data: playersData } = await supabase
          .from('table_players')
          .select('player_id, role, profiles(username, avatar_url)')
          .eq('table_id', id);

        if (playersData) {
          setTablePlayers(playersData);
        }

        // Determinar o cargo do usuário logado
        if (user.id === tblData.master_id) {
          setUserRole('MASTER');
        } else {
          const myMembership = playersData?.find((p: any) => p.player_id === user.id);
          if (myMembership) {
            setUserRole(myMembership.role === 'spectator' ? 'SPECTATOR' : 'PLAYER');
          } else {
            setUserRole('GUEST');
          }
        }

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

        // Carregar condições de status customizadas da mesa
        const { data: customConds } = await supabase
          .from('table_status_conditions')
          .select('*')
          .eq('table_id', id);
        if (customConds) setCustomConditions(customConds as any[]);

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_status_conditions',
          filter: `table_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomConditions((prev) => {
              if (prev.some(c => c.id === payload.new.id)) return prev;
              return [...prev, payload.new as StatusCondition];
            });
          } else if (payload.eventType === 'UPDATE') {
            setCustomConditions((prev) =>
              prev.map(c => c.id === payload.new.id ? (payload.new as StatusCondition) : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setCustomConditions((prev) => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_players',
          filter: `table_id=eq.${id}`,
        },
        async () => {
          // Recarregar lista de membros ao alterar cargos ou novos membros
          const { data: updatedPlayers } = await supabase
            .from('table_players')
            .select('player_id, role, profiles(username, avatar_url)')
            .eq('table_id', id);

          if (updatedPlayers) {
            setTablePlayers(updatedPlayers);
            if (currentUser && table && currentUser.id !== table.master_id) {
              const myMem = updatedPlayers.find((p: any) => p.player_id === currentUser.id);
              if (myMem) {
                setUserRole(myMem.role === 'spectator' ? 'SPECTATOR' : 'PLAYER');
              } else {
                setUserRole('GUEST');
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            setTable(prev => prev ? { ...prev, ...(payload.new as Table) } : (payload.new as Table));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime channel subscription status:', status);
      });

    // Realtime Presence para usuários online na mesa
    const presenceChannel = supabase.channel(`presence-table-${id}`, {
      config: { presence: { key: currentUser?.id || `guest-${Date.now()}` } }
    })
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      const onlineIds = Object.keys(state);
      setOnlineUserIds(onlineIds);
    });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && currentUser) {
        await presenceChannel.track({
          user_id: currentUser.id,
          username: profile?.username || 'Usuário',
          online_at: new Date().toISOString()
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [id, loading, supabase, currentUser, table, profile]);

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

    if (userRole === 'SPECTATOR' || userRole === 'GUEST') {
      showToast('Espectadores estão no modo somente leitura.');
      return;
    }

    const content = messageText.trim();
    setMessageText('');

    let senderName = profile?.username || 'Jogador';
    let senderAvatar = profile?.avatar_url || null;
    let characterId: string | undefined = undefined;

    // Se o chat separado estiver ativo e o canal for ON (Narrativa)
    if (table?.has_separated_chat && chatChannel === 'ON') {
      const isMaster = table.master_id === currentUser.id;

      if (isMaster) {
        if (selectedSenderIdentity === 'MASTER') {
          senderName = 'Mestre';
        } else {
          const chosenChar = linkedCharacters.find(c => c.id === selectedSenderIdentity);
          if (chosenChar) {
            senderName = chosenChar.name;
            senderAvatar = chosenChar.image_url || null;
            characterId = chosenChar.id;
          }
        }
      } else {
        // Para jogador: busca o personagem vinculado dele
        const myLinkedChar = linkedCharacters.find(c => c.user_id === currentUser.id) ||
                             (selectedSenderIdentity !== 'MASTER' ? linkedCharacters.find(c => c.id === selectedSenderIdentity) : null);
        if (myLinkedChar) {
          senderName = myLinkedChar.name;
          senderAvatar = myLinkedChar.image_url || null;
          characterId = myLinkedChar.id;
        } else {
          senderName = `${profile?.username || 'Jogador'} (Sem Ficha)`;
        }
      }
    }

    try {
      const { data, error } = await supabase.from('chat_messages').insert({
        table_id: id,
        sender_id: currentUser.id,
        sender_name: senderName,
        sender_avatar: senderAvatar,
        content,
        type: 'TEXT',
        channel: table?.has_separated_chat ? chatChannel : 'ON',
        character_id: characterId,
        is_edited: false
      }).select().single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
      } else if (data) {
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  }

  // Realizar Rolagem de Dados na Mesa
  async function handleRollDice() {
    if (!currentUser || !table) return;

    if (userRole === 'SPECTATOR' || userRole === 'GUEST') {
      showToast('Espectadores estão em modo somente leitura.');
      return;
    }

    if (rollMode === 'QUICK') {
      const diceValues: number[] = [];
      let rollSum = 0;
      let isCritical = false;

      for (let i = 0; i < diceCount; i++) {
        const val = Math.floor(Math.random() * diceFaces) + 1;
        diceValues.push(val);
        rollSum += val;
        if (val === diceFaces) isCritical = true;
      }

      const total = rollSum + diceModifier;
      const modifierText = diceModifier !== 0 ? ` ${diceModifier >= 0 ? '+' : '-'} ${Math.abs(diceModifier)}` : '';
      const content = `rolou ${diceCount}d${diceFaces}${modifierText} 🎲`;

      const rollPayload: RollResult = {
        total,
        dices: diceValues,
        modifiers: diceModifier,
        isCrit: isCritical,
        componentsText: `${diceCount}d${diceFaces} [${diceValues.join(', ')}]${modifierText} = ${total}`
      };

      setVirtualRoll({
        results: diceValues,
        faces: diceFaces,
        title: `Rolagem de Dados (${diceCount}d${diceFaces})`,
        callback: async () => {
          try {
            const { data, error } = await supabase.from('chat_messages').insert({
              table_id: id,
              sender_id: currentUser.id,
              sender_name: profile?.username || 'Jogador',
              content,
              type: 'ROLL',
              roll_result: rollPayload,
              is_edited: false
            }).select().single();

            if (error) {
              console.error('Erro ao salvar rolagem:', error);
            } else if (data) {
              setMessages((prev) => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data];
              });
            }
          } catch (err) {
            console.error('Erro ao salvar rolagem:', err);
          }
        }
      });
    } else {
      // Modo Avançado (CustomRoll)
      const selectedChar = linkedCharacters.find(c => c.id === selectedCharForRoll);
      const actionTitle = rollActionName.trim() || 'Rolagem Customizada';

      const customRollObj: any = {
        id: crypto.randomUUID(),
        name: actionTitle,
        type: rollCategory,
        components: [
          {
            id: 'c1',
            count: diceCount,
            faces: diceFaces,
            bonus: 0,
            isNegative: false,
            canCrit: true,
            critMultiplier: 2
          }
        ],
        globalModifier: diceModifier,
        primaryAttribute: selectedPrimaryAttr,
        secondaryAttribute: selectedSecondaryAttr,
        accumulateCrit: true
      };

      const equippedMods = getEquippedItemsModifiers(selectedChar?.inventory);
      const testResult = executeCustomRoll(
        customRollObj,
        selectedChar?.attributes_values || {},
        undefined,
        selectedChar?.status_effects || [],
        equippedMods
      );

      const senderDisplayName = selectedChar ? selectedChar.name : (profile?.username || 'Jogador');
      const content = `realizou ${actionTitle} 🎲`;

      setVirtualRoll({
        results: testResult.dices.length > 0 ? testResult.dices : [1],
        faces: diceFaces,
        title: actionTitle,
        callback: async () => {
          try {
            const { data, error } = await supabase.from('chat_messages').insert({
              table_id: id,
              sender_id: currentUser.id,
              sender_name: senderDisplayName,
              character_id: selectedChar?.id || null,
              content,
              type: 'ROLL',
              roll_result: testResult,
              is_edited: false
            }).select().single();

            if (error) {
              console.error('Erro ao salvar rolagem:', error);
            } else if (data) {
              setMessages((prev) => {
                if (prev.some(m => m.id === data.id)) return prev;
                return [...prev, data];
              });
            }
          } catch (err) {
            console.error('Erro ao salvar rolagem:', err);
          }
        }
      });
    }
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
      const rollConfig = (table?.rule_systems as any)?.attribute_roll_config;
      const testResult = executeAttributeTest(attrKey, name, modifiedValue, rollConfig);
      
      let statusSuffix = '';
      if (activeEffects.length > 0) {
        const activeNames = [...STATUS_CONDITIONS, ...customConditions]
          .filter(c => activeEffects.includes(c.id))
          .map(c => c.name)
          .join(', ');
        if (activeNames) statusSuffix = ` [Status: ${activeNames}]`;
      }

      content = `realizou teste de ${name}${statusSuffix} 🎲`;
      diceValuesForAnimation = testResult.dices;
      
      rollResultPayload = {
        total: testResult.total,
        dices: testResult.dices,
        modifiers: 0,
        isCrit: testResult.isCritSuccess,
        componentsText: testResult.descriptionText
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
        const activeNames = [...STATUS_CONDITIONS, ...customConditions]
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
          const { data, error } = await supabase.from('chat_messages').insert({
            table_id: id,
            sender_id: currentUser.id,
            sender_name: `${profile.username} (Ficha: ${selectedCharacterSheet?.name})`,
            content,
            type: 'ROLL',
            roll_result: rollResultPayload,
            is_edited: false
          }).select().single();

          if (error) {
            console.error('Erro ao rolar da ficha rápida:', error);
          } else if (data) {
            setMessages((prev) => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data];
            });
          }
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

  // Criar nova condição de status customizada (Mestre)
  async function handleCreateCustomStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatusName.trim() || !table || !currentUser) return;

    try {
      const { data, error } = await supabase.from('table_status_conditions').insert({
        table_id: id,
        name: newStatusName.trim(),
        description: newStatusDesc.trim() || null,
        color_class: newStatusColor,
        icon: newStatusIcon
      }).select().single();

      if (error) {
        console.error('Erro ao criar status customizado:', error);
      } else if (data) {
        setCustomConditions((prev) => {
          if (prev.some(c => c.id === data.id)) return prev;
          return [...prev, data as StatusCondition];
        });
        setNewStatusName('');
        setNewStatusDesc('');
        setNewStatusIcon('Shield');
        setNewStatusColor('text-red-400 bg-red-500/10 border-red-500/20');
        showToast('Status criado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao criar status customizado:', err);
    }
  }

  // Excluir condição de status customizada (Mestre)
  async function handleDeleteCustomStatus(statusId: string) {
    if (!table || !currentUser) return;

    try {
      const { error } = await supabase
        .from('table_status_conditions')
        .delete()
        .eq('id', statusId);

      if (error) {
        console.error('Erro ao deletar status customizado:', error);
      } else {
        setCustomConditions((prev) => prev.filter(c => c.id !== statusId));
        // Remove status de qualquer personagem que o tenha ativo localmente
        setLinkedCharacters((prev) =>
          prev.map((char) => {
            if (char.status_effects?.includes(statusId)) {
              return {
                ...char,
                status_effects: char.status_effects.filter(id => id !== statusId)
              };
            }
            return char;
          })
        );
        setSelectedCharacterSheet((current) => {
          if (current && current.status_effects?.includes(statusId)) {
            return {
              ...current,
              status_effects: current.status_effects.filter(id => id !== statusId)
            };
          }
          return current;
        });
        showToast('Status excluído com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao deletar status customizado:', err);
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
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white leading-tight">{table.name}</h1>
              {userRole === 'MASTER' && (
                <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> Mestre
                </span>
              )}
              {userRole === 'PLAYER' && (
                <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                  <Sword className="w-3 h-3 text-cyan-400" /> Jogador
                </span>
              )}
              {(userRole === 'SPECTATOR' || userRole === 'GUEST') && (
                <span className="text-[10px] bg-slate-800/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-purple-400" /> Espectador
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-md">{table.description || 'Sem descrição'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {table.rule_systems?.name && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-350 bg-purple-950/20 border border-purple-800/35 px-3 py-1.5 rounded-full">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold">{table.rule_systems.name}</span>
            </div>
          )}

          <button
            onClick={() => setIsMembersOpen(true)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/30 border border-emerald-800/35 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            title="Ver Membros & Status Online"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <Users className="w-3.5 h-3.5" />
            <span className="font-bold">{onlineUserIds.length} Online</span>
          </button>

          {userRole === 'MASTER' && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-purple-950/40 text-slate-400 hover:text-purple-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title="Configurações da Mesa"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Banner de Aviso do Modo Espectador */}
      {(userRole === 'SPECTATOR' || userRole === 'GUEST') && (
        <div className="bg-purple-950/30 border-b border-purple-800/40 px-6 py-2 flex items-center justify-between text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Modo Espectador: Você está assistindo a esta partida em tempo real (Somente Leitura).</span>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Controls & Rolador */}
        <div className={`flex-1 p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 ${
          activeTab === 'mesa' ? 'grid' : 'hidden lg:grid'
        }`}>
          <div className="space-y-6">
            
            {/* Rolador de Dados Card */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Dice5 className="w-5 h-5 text-purple-400" />
                  Rolador de Dados da Mesa
                </h2>

                {/* Alternador de Modo: Rápido vs Avançado */}
                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRollMode('QUICK')}
                    className={`py-1 px-3 rounded-lg transition-all ${
                      rollMode === 'QUICK'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => setRollMode('ADVANCED')}
                    className={`py-1 px-3 rounded-lg transition-all ${
                      rollMode === 'ADVANCED'
                        ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚙️ Customizado
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Seleção de Lados do Dado (Faces) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Lados do Dado (Faces)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[4, 6, 8, 10, 12, 20, 100].map((faces) => (
                      <button
                        key={faces}
                        type="button"
                        onClick={() => setDiceFaces(faces)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer ${
                          diceFaces === faces
                            ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                            : 'bg-slate-800/30 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        d{faces}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantidade e Modificador Geral em Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Qtd Dados */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Quantidade
                    </label>
                    <div className="flex items-center gap-2 bg-slate-800/30 border border-slate-800/80 rounded-xl p-1.5">
                      <button 
                        type="button"
                        onClick={() => setDiceCount(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-sm font-mono">{diceCount}d{diceFaces}</span>
                      <button 
                        type="button"
                        onClick={() => setDiceCount(prev => Math.min(10, prev + 1))}
                        className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Modificador Geral */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                      Modificador Geral
                    </label>
                    <div className="flex items-center gap-2 bg-slate-800/30 border border-slate-800/80 rounded-xl p-1.5">
                      <button 
                        type="button"
                        onClick={() => setDiceModifier(prev => prev - 1)}
                        className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-sm font-mono">
                        {diceModifier >= 0 ? `+${diceModifier}` : diceModifier}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setDiceModifier(prev => prev + 1)}
                        className="w-8 h-8 bg-slate-850 hover:bg-slate-700 rounded-lg text-slate-200 font-bold shrink-0 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parâmetros do Modo Avançado */}
                {rollMode === 'ADVANCED' && (
                  <div className="space-y-4 pt-3 border-t border-slate-800/60 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nome da Ação */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Nome da Ação / Rótulo
                        </label>
                        <input
                          type="text"
                          value={rollActionName}
                          onChange={(e) => setRollActionName(e.target.value)}
                          placeholder="Ex: Ataque com Espada"
                          className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                        />
                      </div>

                      {/* Categoria */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Categoria da Rolagem
                        </label>
                        <select
                          value={rollCategory}
                          onChange={(e) => setRollCategory(e.target.value as any)}
                          className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 cursor-pointer"
                        >
                          <option value="OTHER">Outro</option>
                          <option value="ATTACK">⚔️ Ataque</option>
                          <option value="DEFENSE">🛡️ Defesa</option>
                          <option value="MAGIC">✨ Magia</option>
                          <option value="TEST">🎲 Teste de Atributo</option>
                          <option value="INITIATIVE">⚡ Iniciativa</option>
                        </select>
                      </div>
                    </div>

                    {/* Seleção de Personagem e Atributos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Personagem que Fornece os Atributos */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Personagem
                        </label>
                        <select
                          value={selectedCharForRoll}
                          onChange={(e) => setSelectedCharForRoll(e.target.value)}
                          className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 cursor-pointer"
                        >
                          <option value="none">Nenhum (Sem Ficha)</option>
                          {linkedCharacters.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Atributo Primário */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Atributo Primário
                        </label>
                        <select
                          value={selectedPrimaryAttr}
                          onChange={(e) => setSelectedPrimaryAttr(e.target.value)}
                          className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-purple-300 font-semibold cursor-pointer"
                        >
                          <option value="none">Nenhum</option>
                          <option value="F">Força (F)</option>
                          <option value="H">Habilidade (H)</option>
                          <option value="R">Resistência (R)</option>
                          <option value="A">Armadura (A)</option>
                          <option value="PdF">Poder de Fogo (PdF)</option>
                        </select>
                      </div>

                      {/* Atributo Secundário */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Atributo Secundário
                        </label>
                        <select
                          value={selectedSecondaryAttr}
                          onChange={(e) => setSelectedSecondaryAttr(e.target.value)}
                          className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-cyan-300 font-semibold cursor-pointer"
                        >
                          <option value="none">Nenhum</option>
                          <option value="F">Força (F)</option>
                          <option value="H">Habilidade (H)</option>
                          <option value="R">Resistência (R)</option>
                          <option value="A">Armadura (A)</option>
                          <option value="PdF">Poder de Fogo (PdF)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview da Fórmula */}
                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs text-slate-400 flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[11px]">Fórmula:</span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {diceCount}d{diceFaces}
                    {rollMode === 'ADVANCED' && selectedPrimaryAttr !== 'none' && ` + ${selectedPrimaryAttr}`}
                    {rollMode === 'ADVANCED' && selectedSecondaryAttr !== 'none' && ` + ${selectedSecondaryAttr}`}
                    {diceModifier !== 0 && ` ${diceModifier >= 0 ? '+' : '-'} ${Math.abs(diceModifier)}`}
                  </span>
                </div>

                {/* Botão Rolar */}
                <button
                  type="button"
                  onClick={handleRollDice}
                  className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] cursor-pointer"
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
                          <div className="flex gap-1.5 items-center flex-wrap">
                            {(char.status_effects || []).map((effId) => {
                              const condition = [...STATUS_CONDITIONS, ...customConditions].find(c => c.id === effId);
                              if (!condition) return null;
                              const IconComponent = getIconComponent(condition.icon);
                              
                              return (
                                <span
                                  key={effId}
                                  title={`${condition.name}: ${condition.description}`}
                                  className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold flex items-center gap-1 shrink-0 select-none ${condition.colorClass}`}
                                >
                                  <IconComponent className={`w-2.5 h-2.5 ${condition.icon === 'Loader2' ? 'animate-spin' : ''}`} />
                                  <span className="font-sans leading-none">{condition.name}</span>
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
              {/* Sub-abas de Canal se o Chat Separado estiver Ativo na Mesa */}
              {table?.has_separated_chat && (
                <div className="flex border-b border-slate-800/80 bg-slate-900/40 px-3 py-1.5 gap-2">
                  <button
                    onClick={() => setChatChannel('ON')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      chatChannel === 'ON'
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚔️ Narrativa (ON)
                  </button>
                  <button
                    onClick={() => setChatChannel('OFF')}
                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                      chatChannel === 'OFF'
                        ? 'bg-slate-700/40 text-slate-200 border border-slate-600/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💬 Conversa Livre (OFF)
                  </button>
                </div>
              )}

              {/* Feed de Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages
                  .filter(msg => !table?.has_separated_chat || (msg.channel || 'ON') === chatChannel)
                  .map((msg) => {
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
                        <span className="text-[11px] font-bold text-slate-400 truncate flex items-center gap-1">
                          {msg.sender_avatar && (
                            <img src={msg.sender_avatar} alt="" className="w-3.5 h-3.5 rounded-full object-cover inline-block" />
                          )}
                          {msg.sender_name}
                        </span>
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

              {/* Input Form com Seletor de Identidade */}
              <div className="p-3 border-t border-slate-800 bg-[#0c1224] space-y-2 flex-shrink-0">
                {/* Seletor de Identidades se for Chat ON e a mesa tiver chats separados */}
                {table?.has_separated_chat && chatChannel === 'ON' && (
                  <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                    <span>Falando como:</span>
                    {currentUser?.id === table.master_id ? (
                      <select
                        value={selectedSenderIdentity}
                        onChange={(e) => setSelectedSenderIdentity(e.target.value)}
                        className="bg-slate-900 border border-slate-700/60 rounded px-2 py-0.5 text-[11px] text-amber-300 font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="MASTER">🛡️ Mestre</option>
                        {linkedCharacters.map(c => (
                          <option key={c.id} value={c.id}>👤 {c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-purple-300">
                        👤 {linkedCharacters.find(c => c.user_id === currentUser?.id)?.name || `${profile?.username} (Sem Ficha)`}
                      </span>
                    )}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={table?.has_separated_chat && chatChannel === 'OFF' ? "Mensagem no chat livre (OFF)..." : "Mensagem no chat narrativo (ON)..."}
                    className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
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
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Status & Condições
                </span>
                {table?.master_id === currentUser?.id && (
                  <button
                    onClick={() => setIsManagingStatus(true)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all cursor-pointer"
                    title="Gerenciar Status Personalizados"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...STATUS_CONDITIONS, ...customConditions].map((status) => {
                  const isActive = (selectedCharacterSheet.status_effects || []).includes(status.id);
                  const IconComponent = getIconComponent(status.icon);

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
                    <span className="text-slate-300 font-medium">{typeof sk === 'object' ? sk.name : sk}</span>
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

      {/* Modal de Gerenciamento de Status Customizados (Mestre) */}
      {isManagingStatus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-fade-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Status & Condições Personalizados</h3>
                <p className="text-xs text-slate-400 mt-1">Crie e gerencie tags de status adicionais para esta mesa.</p>
              </div>
              <button
                onClick={() => setIsManagingStatus(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
              >
                Fechar ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 scrollbar-none">
              {/* Formulário de Criação */}
              <form onSubmit={handleCreateCustomStatus} className="space-y-4 bg-[#070b19]/45 border border-slate-850 p-4 rounded-2xl">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Criar Novo Status</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">Nome</label>
                    <input
                      type="text"
                      required
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      placeholder="Ex: Sangrando, Envenenado"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-250"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">Descrição</label>
                    <input
                      type="text"
                      value={newStatusDesc}
                      onChange={(e) => setNewStatusDesc(e.target.value)}
                      placeholder="Ex: Sofre 1 PV de dano por rodada"
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-250"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">Ícone</label>
                    <select
                      value={newStatusIcon}
                      onChange={(e) => setNewStatusIcon(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                    >
                      <option value="Shield">Escudo (🛡️)</option>
                      <option value="Heart">Coração (❤️)</option>
                      <option value="Zap">Raio (⚡)</option>
                      <option value="Flame">Fogo (🔥)</option>
                      <option value="Skull">Caveira (💀)</option>
                      <option value="Sword">Espada (⚔️)</option>
                      <option value="Snowflake">Gelo (❄️)</option>
                      <option value="Sparkles">Magia (✨)</option>
                      <option value="ShieldAlert">Perigo (⚠️)</option>
                      <option value="ZapOff">Desativado (🔌)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block">Cor / Tema</label>
                    <select
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                    >
                      <option value="text-red-400 bg-red-500/10 border-red-500/20">Vermelho (Perigo/Dano)</option>
                      <option value="text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Verde (Cura/Natureza)</option>
                      <option value="text-cyan-400 bg-cyan-500/10 border-cyan-500/20">Azul (Gelo/Magia)</option>
                      <option value="text-purple-400 bg-purple-500/10 border-purple-500/20">Roxo (Trevas/Veneno)</option>
                      <option value="text-orange-400 bg-orange-500/10 border-orange-500/20">Laranja (Fogo/Energia)</option>
                      <option value="text-amber-400 bg-amber-500/10 border-amber-500/20">Amarelo (Luz/Alerta)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  Adicionar à Mesa
                </button>
              </form>

              {/* Listagem de Customizados */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status Existentes</span>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {customConditions.map((status) => {
                    const IconComponent = getIconComponent(status.icon);
                    return (
                      <div key={status.id} className="flex justify-between items-center bg-[#070b19]/30 border border-slate-850 p-3 rounded-xl gap-4 font-sans">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${status.colorClass}`}>
                            <IconComponent className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">{status.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{status.description || 'Sem descrição.'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCustomStatus(status.id)}
                          className="p-2 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title="Excluir Status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {customConditions.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-2">Nenhum status personalizado criado para esta mesa ainda.</p>
                  )}
                </div>
              </div>
            </div>
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

      {/* Modal de Configurações da Mesa (Apenas Mestre) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Configurações da Mesa (Mestre)
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
              >
                Fechar ×
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await updateTableSettingsAction(table.id, {
                  name: editTableName.trim(),
                  description: editTableDesc.trim(),
                  max_players: editMaxPlayers,
                  allow_spectators: editAllowSpectators,
                  is_private: editIsPrivate,
                  password: editIsPrivate && editPassword ? editPassword : null,
                });
                if (res.success) {
                  showToast('Configurações da mesa atualizadas com sucesso!');
                  setIsSettingsOpen(false);
                } else {
                  showToast(res.message || 'Erro ao atualizar mesa.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Nome da Mesa
                </label>
                <input
                  type="text"
                  required
                  value={editTableName}
                  onChange={(e) => setEditTableName(e.target.value)}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Descrição
                </label>
                <textarea
                  value={editTableDesc}
                  onChange={(e) => setEditTableDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Limite de Jogadores
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editMaxPlayers}
                    onChange={(e) => setEditMaxPlayers(parseInt(e.target.value) || 4)}
                    className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm text-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800/20 border border-slate-800/80 rounded-xl">
                  <span className="text-xs font-semibold text-slate-300">Espectadores</span>
                  <input
                    type="checkbox"
                    checked={editAllowSpectators}
                    onChange={(e) => setEditAllowSpectators(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/20 border border-slate-800/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Mesa Privada (Requer Senha)</span>
                  <input
                    type="checkbox"
                    checked={editIsPrivate}
                    onChange={(e) => setEditIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                </div>
                {editIsPrivate && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Senha de Acesso
                    </label>
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Senha para entrar"
                      className="w-full bg-[#1e293b]/50 border border-slate-700/50 rounded-xl py-2 px-3 text-sm text-slate-200"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer de Membros, Presença Realtime & Moderação */}
      {isMembersOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Membros & Presença Realtime
              </h3>
              <button
                onClick={() => setIsMembersOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold uppercase tracking-wider bg-slate-800/40 border border-slate-700/30 px-2 py-1 rounded-lg cursor-pointer"
              >
                Fechar ×
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {/* Seção Mestre */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Mestre da Mesa
                </span>
                <div className="bg-purple-950/20 border border-purple-900/30 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Mestre</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Online
                  </span>
                </div>
              </div>

              {/* Lista de Membros (Jogadores e Espectadores) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> Membros Conectados ({tablePlayers.length})
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Limite: {tablePlayers.filter(p => p.role === 'player').length}/{table?.max_players ?? 4} Jogadores
                  </span>
                </div>

                <div className="space-y-2">
                  {tablePlayers.map((member) => {
                    const isOnline = onlineUserIds.includes(member.player_id);
                    const username = (Array.isArray(member.profiles) ? member.profiles[0]?.username : member.profiles?.username) || 'Usuário';
                    const roleLabel = member.role === 'player' ? 'Jogador' : 'Espectador';

                    return (
                      <div
                        key={member.player_id}
                        className="bg-[#070b19]/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">{username}</span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                              member.role === 'player'
                                ? 'text-cyan-400 border-cyan-800/30 bg-cyan-950/30'
                                : 'text-purple-400 border-purple-800/30 bg-purple-950/30'
                            }`}>
                              {roleLabel}
                            </span>
                          </div>
                        </div>

                        {/* Ações do Mestre */}
                        {userRole === 'MASTER' && (
                          <div className="flex items-center gap-1 shrink-0">
                            {member.role === 'spectator' ? (
                              <button
                                onClick={async () => {
                                  const res = await updateMemberRoleAction({
                                    table_id: table.id,
                                    player_id: member.player_id,
                                    role: 'player'
                                  });
                                  if (res.success) {
                                    showToast(`Promovido ${username} a Jogador!`);
                                  } else {
                                    showToast(res.message || 'Erro ao promover.');
                                  }
                                }}
                                className="p-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-400 border border-cyan-800/40 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Promover a Jogador"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Promover
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  const res = await updateMemberRoleAction({
                                    table_id: table.id,
                                    player_id: member.player_id,
                                    role: 'spectator'
                                  });
                                  if (res.success) {
                                    showToast(`Rebaixado ${username} a Espectador.`);
                                  } else {
                                    showToast(res.message || 'Erro ao rebaixar.');
                                  }
                                }}
                                className="p-1.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-400 border border-purple-800/40 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Rebaixar a Espectador"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Rebaixar
                              </button>
                            )}

                            <button
                              onClick={async () => {
                                const res = await kickTableMemberAction(table.id, member.player_id);
                                if (res.success) {
                                  showToast(`Membro ${username} removido da mesa.`);
                                } else {
                                  showToast('Erro ao remover membro.');
                                }
                              }}
                              className="p-1.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 rounded-lg transition-all cursor-pointer"
                              title="Expulsar da Mesa"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {tablePlayers.length === 0 && (
                    <p className="text-xs text-slate-500 italic py-2">Nenhum jogador ou espectador nesta mesa além do mestre.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {virtualRoll && (
        <DiceRollOverlay
          diceResults={virtualRoll.results}
          diceFaces={virtualRoll.faces || 6}
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
