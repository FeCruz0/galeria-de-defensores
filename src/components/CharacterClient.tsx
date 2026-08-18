'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Character, Profile, RuleSystem, AdvantageItem, Spell, InventoryItem, ModifierOption } from '@/types/game';
import { calculateScore, getMaxPv, getMaxPm, computedCostPt, executeCustomRoll, convertXpToPoints, getModifiedAttributes, getEquippedItemsModifiers, executeAttributeTest } from '@/lib/rules';
import { canAlterAttribute, canAffordCost, validateDamageType, validateUniqueNameAndKey, validateFormula } from '@/lib/validations';
import { alphaAdvantages, alphaDisadvantages, alphaSkills, alphaRaces, alphaSpecializations } from '@/lib/catalogs/alpha-catalog';
import { gaidenAdvantages, gaidenDisadvantages, gaidenSkills, gaidenRaces } from '@/lib/catalogs/gaiden-catalog';
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Sparkles, 
  User as UserIcon,
  Shield, 
  Heart, 
  Zap, 
  BookOpen, 
  Trash2, 
  Plus,
  Info,
  Pencil,
  Printer,
  Palette,
  Download,
  Upload,
  Dices,
  Wifi,
  WifiOff
} from 'lucide-react';
import DiceRollOverlay from '@/components/DiceRollOverlay';
import EditAbilityModal from '@/components/EditAbilityModal';
import BaseSystemBlockModal from '@/components/BaseSystemBlockModal';
import PreferencesModal from '@/components/PreferencesModal';
import SystemEditorModal from '@/components/SystemEditorModal';
import { exportCharacterToPdf } from '@/lib/pdfPayload';
import { getTheme, ThemeId, DEFAULT_SECTION_ORDER } from '@/lib/theme';
import { saveLocalCharacter, getLocalCharacter, queuePendingSync, getPendingSyncs, clearPendingSync } from '@/lib/offlineDb';

import AttributesSection from '@/components/character-sheet/AttributesSection';
import AdvantagesSection from '@/components/character-sheet/AdvantagesSection';
import InventorySection from '@/components/character-sheet/InventorySection';
import SpellsSection from '@/components/character-sheet/SpellsSection';
import CustomRollsSection from '@/components/character-sheet/CustomRollsSection';
import { useCharacterPoints } from '@/hooks/useCharacterPoints';

type Params = Promise<{ id: string }>;

const STANDARD_SYSTEMS = {
  name: '3D&T Alpha',
  attributes: {
    F: { key: 'F', name: 'Força' },
    H: { key: 'H', name: 'Habilidade' },
    R: { key: 'R', name: 'Resistência' },
    A: { key: 'A', name: 'Armadura' },
    PdF: { key: 'PdF', name: 'Poder de Fogo' },
  },
  resources: {
    PV: { key: 'PV', name: 'Pontos de Vida', baseAttributeKey: 'R' },
    PM: { key: 'PM', name: 'Pontos de Magia', baseAttributeKey: 'R' },
  },
  damage_types: ['Corte', 'Perfuração', 'Esmagamento', 'Fogo', 'Frio', 'Elétrico', 'Químico', 'Sônico']
};

function evaluateResourceFormula(
  formula: string | undefined,
  baseAttributeKey: string,
  attributesValues: Record<string, number>,
  resourceKey: string,
  advantages: AdvantageItem[]
): number {
  const defaultFormula = `${baseAttributeKey} * 5`;
  const clean = (formula || defaultFormula).replace(/\s+/g, '');
  if (!clean) return 1;

  let extraR = 0;
  if (resourceKey === 'PV') {
    const extraPvPoints = (advantages || [])
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de vida extra') || n.includes('pv extra') || n.includes('vida extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPvPoints * 2;
  } else if (resourceKey === 'PM') {
    const extraPmPoints = (advantages || [])
      .filter(adv => {
        const n = adv.name.toLowerCase();
        return n.includes('pontos de magia extra') || n.includes('pm extra') || n.includes('magia extra');
      })
      .reduce((sum, adv) => sum + Math.abs(computedCostPt(adv)), 0);
    extraR = extraPmPoints * 2;
  }

  const adjustedAttributes = { ...attributesValues };
  const rKeys = Array.from(new Set(['R', 'Resistência', 'Resistencia', baseAttributeKey].filter(Boolean)));
  rKeys.forEach(k => {
    if (adjustedAttributes[k] !== undefined) {
      adjustedAttributes[k] = adjustedAttributes[k] + extraR;
    }
  });

  let evalStr = clean;
  Object.keys(adjustedAttributes).forEach(k => {
    const regex = new RegExp(`\\b${k}\\b`, 'g');
    evalStr = evalStr.replace(regex, String(adjustedAttributes[k] || 0));
  });

  try {
    // eslint-disable-next-line no-new-func
    const evaluator = new Function(`return (${evalStr})`);
    const result = evaluator();
    if (typeof result === 'number' && !isNaN(result)) {
      return Math.max(1, Math.floor(result));
    }
  } catch (err) {
    console.error('Erro ao avaliar formula do recurso:', err);
  }

  const rVal = adjustedAttributes[baseAttributeKey] || adjustedAttributes['R'] || adjustedAttributes['Resistência'] || 0;
  return rVal === 0 ? 1 : rVal * 5;
}

// Ordenar chaves dos atributos de forma determinística
function sortAttributeKeys(keys: string[], attributes: Record<string, any>): string[] {
  const defaultOrder = ['F', 'H', 'R', 'A', 'PdF'];
  return [...keys].sort((a, b) => {
    const orderA = attributes[a]?.displayOrder;
    const orderB = attributes[b]?.displayOrder;
    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    const indexA = defaultOrder.indexOf(a);
    const indexB = defaultOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
}


import SystemModal, { SystemModalOptions } from '@/components/SystemModal';

export interface CharacterClientProps {
  characterId: string;
  initialCurrentUser: any;
  initialCharacter: Character | null;
  initialProfile: Profile | null;
  initialSystemDef: any;
}

export default function CharacterClient({
  characterId,
  initialCurrentUser,
  initialCharacter,
  initialProfile,
  initialSystemDef
}: CharacterClientProps) {
  const id = characterId;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [character, setCharacter] = useState<Character | null>(initialCharacter);
  const [currentUser, setCurrentUser] = useState<any>(initialCurrentUser);
  const [systemDef, setSystemDef] = useState<any>(initialSystemDef || STANDARD_SYSTEMS);
  const [savingStatus, setSavingStatus] = useState<'salvo' | 'salvando' | 'erro' | 'offline'>('salvo');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Modal State para Alertas e Confirmações
  const [modalConfig, setModalConfig] = useState<SystemModalOptions>({
    isOpen: false,
    message: '',
  });
  const [isManagingDamageTypes, setIsManagingDamageTypes] = useState(false);
  const [isEditingSystemModalOpen, setIsEditingSystemModalOpen] = useState(false);
  const [editingSystemState, setEditingSystemState] = useState<any>(null);
  const [systemJsonImportSheet, setSystemJsonImportSheet] = useState('');

  const showSystemModal = (options: Omit<SystemModalOptions, 'isOpen'>) => {
    setModalConfig({ ...options, isOpen: true });
  };

  // Catálogos e Busca
  const [activeDescriptionItem, setActiveDescriptionItem] = useState<{
    name: string;
    cost: string;
    description: string;
  } | null>(null);
  const [editingAbilityItem, setEditingAbilityItem] = useState<{
    item: AdvantageItem;
    type: 'advantages' | 'disadvantages' | 'skills' | 'specializations';
  } | null>(null);
  const [showBaseSystemBlockModal, setShowBaseSystemBlockModal] = useState(false);



  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Exibir um toast estético temporário
  function showToast(msg: string) {
    setToastMessage(msg);
  }

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);


  const [activeRollResult, setActiveRollResult] = useState<any>(null);
  const [isSelectingRace, setIsSelectingRace] = useState(false);
  const [showRaceDetails, setShowRaceDetails] = useState(false);

  // States de Preferências e Exibição
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('dark');
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [avatarUrl, setAvatarUrl] = useState<string>(initialProfile?.avatar_url || '');
  const [virtualRoll, setVirtualRoll] = useState<{ results: number[]; faces?: number; title: string; callback: () => void } | null>(null);

  // Fechar detalhes da Vantagem Única ao clicar fora
  useEffect(() => {
    if (!showRaceDetails) return;

    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.race-container')) {
        setShowRaceDetails(false);
      }
    }

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showRaceDetails]);

  const isGaiden = systemDef.name?.toLowerCase().includes('gaiden') || false;

  const getEnrichedItem = (item: any, type: string) => {
    if (type === 'advantages') {
      const baseCatalog = isGaiden ? gaidenAdvantages : alphaAdvantages;
      const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
      if (baseItem && baseItem.isModular) {
        return {
          ...item,
          isModular: true,
          baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
          modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
        };
      }
    } else if (type === 'disadvantages') {
      const baseCatalog = isGaiden ? gaidenDisadvantages : alphaDisadvantages;
      const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
      if (baseItem && baseItem.isModular) {
        return {
          ...item,
          isModular: true,
          baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
          modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
        };
      }
    }
    return item;
  };



  // 2. Efeito de Autosave (Debounced)
  useEffect(() => {
    if (!character || loading) return;

    setSavingStatus('salvando');

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Verificar se já existe outro personagem com o mesmo nome para este usuário
        const { data: duplicate } = await supabase
          .from('characters')
          .select('id')
          .eq('user_id', character.user_id)
          .eq('name', character.name.trim())
          .neq('id', character.id)
          .maybeSingle();

        if (duplicate) {
          setSavingStatus('erro');
          showSystemModal({
            type: 'alert',
            title: 'Conflito de Nome',
            message: `Você já possui outro personagem com o nome "${character.name}"! Escolha um nome diferente para salvar.`
          });
          return;
        }

        // Calcular pontos gastos no momento de salvar
        const currentScore = calculateScore(character);

        const updatesPayload = {
          name: character.name.trim(),
          concept: character.concept,
          scale: character.scale || 0,
          attributes_values: character.attributes_values,
          resources_current: character.resources_current,
          advantages: character.advantages,
          disadvantages: character.disadvantages,
          skills: character.skills,
          specializations: character.specializations,
          spells: character.spells,
          inventory: character.inventory,
          damage_type_forca: character.damage_type_forca,
          damage_type_pdf: character.damage_type_pdf,
          points_spent: currentScore,
          saved_points: character.saved_points,
          experience: character.experience,
          annotations: character.annotations,
          updated_at: new Date().toISOString(),
        };

        // Salvar sempre localmente no IndexedDB
        await saveLocalCharacter({ ...character, ...updatesPayload });

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await queuePendingSync(character.id, updatesPayload);
          setSavingStatus('offline');
          return;
        }

        const { error } = await supabase
          .from('characters')
          .update(updatesPayload)
          .eq('id', character.id);

        if (error) {
          await queuePendingSync(character.id, updatesPayload);
          setSavingStatus('offline');
        } else {
          setSavingStatus('salvo');
        }
      } catch (err) {
        console.error('Erro no autosave:', err);
        setSavingStatus('erro');
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [character, loading, supabase]);

  // Efeito de escuta da rede para auto-sincronização offline -> online
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const syncPendingOfflineData = async () => {
      setIsOnline(true);
      const pendingList = await getPendingSyncs();
      for (const item of pendingList) {
        try {
          const { error } = await supabase
            .from('characters')
            .update(item.updates)
            .eq('id', item.charId);

          if (!error) {
            await clearPendingSync(item.charId);
          }
        } catch (err) {
          console.warn('Erro ao sincronizar dados offline:', err);
        }
      }
      setSavingStatus('salvo');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSavingStatus('offline');
    };

    window.addEventListener('online', syncPendingOfflineData);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', syncPendingOfflineData);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabase]);

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
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
    }
  }

  if (loading || !character) {
    return (
      <div className="min-h-screen bg-[#070b19] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Atributo de resistência para fins de cálculos legados
  const rValue = character.attributes_values['R'] || character.attributes_values['Resistência'] || 0;

  // Alterar atributos de forma reativa
  function handleAttributeChange(key: string, delta: number) {
    if (!character) return;
    const currentValue = character.attributes_values[key] || 0;

    if (!canAlterAttribute(currentValue, delta, character.saved_points || 0)) {
      if (delta > 0) {
        showToast("Saldo de Pontos Guardados insuficiente.");
      }
      return;
    }

    const newValue = Math.max(currentValue + delta, 0);
    const newSavedPoints = (character.saved_points || 0) - delta;

    setCharacter({
      ...character,
      saved_points: newSavedPoints,
      attributes_values: {
        ...character.attributes_values,
        [key]: newValue
      }
    });
  }

  // Alterar recursos de forma reativa
  function handleResourceChange(key: string, delta: number, maxLimit: number) {
    if (!character) return;
    const currentValue = character.resources_current[key] || 0;
    const newValue = Math.max(Math.min(currentValue + delta, maxLimit), 0);

    setCharacter({
      ...character,
      resources_current: {
        ...character.resources_current,
        [key]: newValue
      }
    });
  }

  // Alterar experiência de forma reativa com conversão (10 XP = 1 Ponto Guardado)
  function handleExperienceChange(delta: number) {
    if (!character) return;
    const result = convertXpToPoints(character.experience || 0, delta, character.saved_points || 0);
    const addedPoints = result.saved_points - (character.saved_points || 0);
    setCharacter({
      ...character,
      experience: result.experience,
      saved_points: result.saved_points,
      points_total: (character.points_total || 0) + addedPoints
    });
  }

  // Alterar pontos totais de forma reativa, ajustando proporcionalmente os pontos guardados
  function handlePointsTotalChange(delta: number) {
    if (!character) return;
    const currentTotal = character.points_total || 0;
    const currentSaved = character.saved_points || 0;
    if (delta < 0 && currentSaved + delta < 0) {
      showToast("Saldo de Pontos Guardados insuficiente para reduzir o total.");
      return;
    }
    setCharacter({
      ...character,
      points_total: Math.max(currentTotal + delta, 0),
      saved_points: Math.max(currentSaved + delta, 0)
    });
  }

  // Alterar pontos guardados de forma reativa
  function handleSavedPointsChange(delta: number) {
    if (!character) return;
    setCharacter({
      ...character,
      saved_points: Math.max((character.saved_points || 0) + delta, 0)
    });
  }



  // Acionar rolagem customizada da ficha localmente
  function handleTriggerCustomRoll(roll: any) {
    if (!character) return;

    if (roll.pmCost && roll.pmCost > 0) {
      const currentPm = character.resources_current?.['PM'] ?? 0;
      if (currentPm < roll.pmCost) {
        showSystemModal({
          type: 'confirm',
          title: 'PM Insuficiente',
          message: `Você não tem PM suficiente (Custo: ${roll.pmCost} PM, Atual: ${currentPm} PM). Deseja realizar a rolagem mesmo assim?`,
          confirmText: 'Rolar Mesmo Assim',
          cancelText: 'Cancelar',
          onConfirm: () => executeRoll(roll, currentPm)
        });
        return;
      }
    }

    executeRoll(roll, character.resources_current?.['PM'] ?? 0);
  }

  function executeRoll(roll: any, currentPm: number) {
    if (!character) return;
    if (roll.pmCost && roll.pmCost > 0) {
      setCharacter({
        ...character,
        resources_current: {
          ...character.resources_current,
          PM: Math.max(0, currentPm - roll.pmCost)
        }
      });
    }

    const result = executeCustomRoll(roll, character.attributes_values);
    const rollFaces = roll.components?.[0]?.faces || 6;

    setVirtualRoll({
      results: result.dices.length > 0 ? result.dices : [6],
      faces: rollFaces,
      title: roll.name,
      callback: () => {
        setActiveRollResult(result);
      }
    });
  }

  // Acionar rolagem de teste de atributo base da ficha
  function handleTriggerAttributeRoll(key: string, name: string, value: number) {
    if (!character) return;
    const testResult = executeAttributeTest(key, name, value, systemDef.attribute_roll_config);
    const attrFaces = systemDef.attribute_roll_config?.diceFaces || 6;

    setVirtualRoll({
      results: testResult.dices.length > 0 ? testResult.dices : [6],
      faces: attrFaces,
      title: `Teste de ${name}`,
      callback: () => {
        setActiveRollResult({
          total: testResult.total,
          dices: testResult.dices,
          modifiers: 0,
          isCrit: testResult.isCritSuccess,
          componentsText: testResult.descriptionText
        });
      }
    });
  }

  // Excluir rolagem customizada
  function handleDeleteCustomRoll(rollId: string) {
    if (!character) return;
    setCharacter({
      ...character,
      custom_rolls: character.custom_rolls.filter(r => r.id !== rollId)
    });
  }



  // Alterar tipo de dano do personagem
  function handleDamageTypeChange(field: 'damage_type_forca' | 'damage_type_pdf', value: string) {
    if (!character) return;
    setCharacter({
      ...character,
      [field]: value
    });
  }

  // Atualizar lista de tipos de dano do sistema de regras customizado no banco
  async function handleUpdateSystemDamageTypes(newTypes: string[]) {
    if (!systemDef || !systemDef.id || systemDef.is_base_system || !systemDef.user_id) return;
    setSystemDef({
      ...systemDef,
      damage_types: newTypes
    });
    try {
      await supabase
        .from('rule_systems')
        .update({ damage_types: newTypes })
        .eq('id', systemDef.id);
      showToast("Tipos de dano do sistema atualizados!");
    } catch (err) {
      console.error("Erro ao atualizar tipos de dano do sistema:", err);
      showToast("Erro ao salvar tipos de dano.");
    }
  }

  // Salvar alterações do sistema de regras customizado diretamente a partir da ficha
  async function handleSaveCustomSystemFromSheet() {
    if (!editingSystemState || !editingSystemState.id) return;

    if (!editingSystemState.name.trim()) {
      showSystemModal({ type: 'alert', title: 'Validação', message: 'O nome do sistema de regras não pode ser vazio.' });
      return;
    }

    try {
      const { error } = await supabase
        .from('rule_systems')
        .update({
          name: editingSystemState.name.trim(),
          description: editingSystemState.description,
          attributes: editingSystemState.attributes,
          resources: editingSystemState.resources,
          damage_types: editingSystemState.damage_types || [],
          advantages: editingSystemState.advantages || [],
          disadvantages: editingSystemState.disadvantages || [],
          skills: editingSystemState.skills || [],
          attribute_roll_config: editingSystemState.attribute_roll_config,
          dice_config: editingSystemState.dice_config || { count: 1, faces: 6 }
        })
        .eq('id', editingSystemState.id);

      if (error) throw error;

      setSystemDef(editingSystemState);
      setIsEditingSystemModalOpen(false);
      showToast("Sistema de Regras customizado atualizado no banco de dados!");
    } catch (err) {
      console.error("Erro ao atualizar sistema de regras:", err);
      showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao salvar o sistema de regras no banco de dados.' });
    }
  }

  // Importar especificação JSON para o editor de sistema na ficha
  function handleImportSystemInSheet() {
    if (!systemJsonImportSheet.trim()) {
      showSystemModal({ type: 'alert', title: 'JSON Vazio', message: 'Cole o conteúdo JSON do sistema.' });
      return;
    }
    try {
      const parsed = JSON.parse(systemJsonImportSheet);
      if (!parsed.name || !parsed.attributes || !parsed.resources) {
        showSystemModal({ type: 'alert', title: 'JSON Inválido', message: 'O JSON deve conter ao menos "name", "attributes" e "resources".' });
        return;
      }
      setEditingSystemState({
        ...editingSystemState,
        name: parsed.name,
        description: parsed.description || '',
        attributes: parsed.attributes,
        resources: parsed.resources,
        damage_types: parsed.damage_types || editingSystemState.damage_types || [],
        advantages: parsed.advantages || editingSystemState.advantages || [],
        disadvantages: parsed.disadvantages || editingSystemState.disadvantages || [],
        skills: parsed.skills || editingSystemState.skills || []
      });
      setSystemJsonImportSheet('');
      showToast("Configurações do sistema importadas para o editor!");
    } catch (err) {
      showSystemModal({ type: 'alert', title: 'Erro ao Processar JSON', message: 'Certifique-se de que a sintaxe do JSON está correta.' });
    }
  }

  // Salvar edição de habilidade/vantagem local do personagem (e opcionalmente no sistema customizado)
  async function handleSaveAbilityEdit(updatedItem: AdvantageItem & { saveGlobal?: boolean }) {
    if (!character || !editingAbilityItem) return;
    const type = editingAbilityItem.type;
    const list = character[type] || [];
    const oldItem = list.find(item => item.id === updatedItem.id);
    if (!oldItem) return;

    const oldCostPt = computedCostPt(oldItem);
    const newCostPt = computedCostPt(updatedItem);
    const diff = newCostPt - oldCostPt;

    if (!canAffordCost(diff, character.saved_points || 0)) {
      showToast("Saldo de Pontos Guardados insuficiente para esta alteração.");
      return;
    }

    const { saveGlobal, ...itemToSave } = updatedItem;

    const updatedList = list.map(item => item.id === itemToSave.id ? itemToSave : item);
    setCharacter({
      ...character,
      saved_points: (character.saved_points || 0) - diff,
      [type]: updatedList
    });

    // Se o usuário solicitou salvar globalmente no sistema e for o proprietário
    if (saveGlobal && systemDef && systemDef.id && !systemDef.is_base_system && systemDef.user_id && currentUser && systemDef.user_id === currentUser.id) {
      const systemList: AdvantageItem[] = systemDef[type] || [];
      const updatedSystemList = systemList.map(item => (item.id === itemToSave.id || item.name.toLowerCase() === itemToSave.name.toLowerCase()) ? itemToSave : item);
      const newSystemDef = { ...systemDef, [type]: updatedSystemList };
      setSystemDef(newSystemDef);
      try {
        await supabase
          .from('rule_systems')
          .update({ [type]: updatedSystemList })
          .eq('id', systemDef.id);
        showToast("Definição do item atualizada globalmente no Sistema de Regras!");
      } catch (err) {
        console.error("Erro ao atualizar item globalmente:", err);
      }
    }

    setEditingAbilityItem(null);
  }

  // Clonar sistema de regras base em cópia personalizada
  async function handleCloneBaseSystem() {
    if (!character || !systemDef) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado.');

      const systemId = character.rule_system_id || '33333333-3333-3333-3333-333333333333';
      const { data: original, error: fetchErr } = await supabase
        .from('rule_systems')
        .select('*')
        .eq('id', systemId)
        .single();
      if (fetchErr || !original) throw fetchErr || new Error('Sistema original não encontrado.');

      const originalName = original.name;
      const dateSuffix = new Date().toLocaleDateString('pt-BR');
      const timeSuffix = new Date().toTimeString().split(' ')[0];
      const clonedName = `${originalName} (Personalizado ${dateSuffix} ${timeSuffix})`;

      const { data: cloned, error: insertErr } = await supabase
        .from('rule_systems')
        .insert({
          name: clonedName,
          description: `Cópia personalizada de ${originalName} criada para o personagem ${character.name}.`,
          attributes: original.attributes,
          resources: original.resources,
          advantages: original.advantages,
          disadvantages: original.disadvantages,
          skills: original.skills,
          damage_types: original.damage_types,
          dice_config: original.dice_config,
          is_base_system: false,
          user_id: user.id,
          is_active: true
        })
        .select()
        .single();

      if (insertErr || !cloned) throw insertErr || new Error('Erro ao salvar cópia do sistema.');

      const { error: updateErr } = await supabase
        .from('characters')
        .update({
          rule_system_id: cloned.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', character.id);

      if (updateErr) throw updateErr;

      setCharacter({
        ...character,
        rule_system_id: cloned.id
      });
      setSystemDef({
        id: cloned.id,
        name: cloned.name,
        attributes: cloned.attributes,
        resources: cloned.resources,
        advantages: cloned.advantages,
        disadvantages: cloned.disadvantages,
        skills: cloned.skills,
        is_base_system: false,
        damage_types: cloned.damage_types || []
      });

      setShowBaseSystemBlockModal(false);
    } catch (err) {
      console.error('Erro ao duplicar sistema:', err);
      throw err;
    }
  }

  // Exportar Ficha em PDF com Payload Embutido
  async function handleExportCharacterPdf() {
    if (!character) return;
    try {
      const pdfBytes = await exportCharacterToPdf(character);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${character.name || 'ficha'}_backup.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF com backup embutido exportado!");
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
      showToast("Erro ao gerar PDF.");
    }
  }

  const {
    equippedModifiers,
    modifiedAttrs,
    pointsSpent,
    pointsAvailable,
    pointsTotal,
    scoreSpent,
    isOverflow
  } = useCharacterPoints(character);

  const themeConfig = getTheme(currentTheme);

  return (
    <>
      <div className={`min-h-screen ${themeConfig.bgClass} ${themeConfig.textPrimaryClass} pb-16 print:hidden transition-colors duration-300`}>
      {/* Header */}
      <header className={`border-b ${themeConfig.borderClass} ${themeConfig.headerBgClass} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 py-3 lg:py-0 lg:h-16 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Top Line: Back Button, Name & Mobile-only Indicators */}
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-bold text-base lg:text-lg text-white leading-tight truncate max-w-[150px] sm:max-w-xs">{character.name}</h1>
                <p className="text-[10px] lg:text-xs text-slate-400 truncate max-w-[120px] sm:max-w-xs">{character.concept || 'Sem Classe'}</p>
              </div>
            </div>

            {/* Mobile-only Saving & Points */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
                title="Preferências de Exibição"
              >
                <Palette className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleExportCharacterPdf}
                className="p-2 hover:bg-slate-800 rounded-lg text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Baixar Backup em PDF"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Imprimir Ficha"
              >
                <Printer className="w-4 h-4" />
              </button>
              
              {/* Autosave Status */}
              <span className="text-[10px] sm:text-xs flex items-center gap-1">
                {savingStatus === 'salvando' && (
                  <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
                )}
                {savingStatus === 'salvo' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                {savingStatus === 'offline' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Salvo Localmente (Offline)" />
                )}
                {savingStatus === 'erro' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </span>

              {/* Points counter */}
              <div className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 ${
                isOverflow 
                  ? 'bg-rose-950/30 border-rose-800/30 text-rose-400' 
                  : 'bg-purple-950/30 border-purple-800/30 text-purple-400'
              }`}>
                <Sparkles className="w-3 h-3" />
                {scoreSpent}/{character.points_total}
              </div>
            </div>
          </div>

          {/* Bottom Line / Desktop Indicators: System, Scale, Race */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            
            {/* Indicador de Sistema de Regras */}
            <div className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-350 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[9px] uppercase text-slate-500">Sis:</span>
              <span className="text-slate-200">{systemDef.name || 'Padrão'}</span>
              <button
                type="button"
                onClick={() => {
                  if (systemDef.is_base_system || !systemDef.user_id) {
                    showSystemModal({
                      type: 'info',
                      title: 'Sistema Base Nativo (3D&T Alpha)',
                      message: 'Sistemas base nativos são protegidos contra alteração.\n\nPara personalizar as regras, vá ao Sandbox no Dashboard e crie ou clone um novo Sistema de Regras Customizado!'
                    });
                  } else if (currentUser && systemDef.user_id !== currentUser.id) {
                    showSystemModal({
                      type: 'info',
                      title: 'Sistema de Regras de Outro Autor',
                      message: 'Este sistema de regras customizado pertence a outro usuário.\n\nApenas o criador original pode editar o sistema de regras.'
                    });
                  } else {
                    setEditingSystemState({ ...systemDef });
                    setIsEditingSystemModalOpen(true);
                  }
                }}
                className="p-0.5 hover:bg-slate-700/50 text-slate-400 hover:text-purple-400 rounded transition-colors ml-0.5 cursor-pointer"
                title="Editar Sistema de Regras Customizado"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            {/* Indicador de Escala */}
            <div className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-350 shrink-0">
              <span className="text-[9px] uppercase text-slate-500">Escala:</span>
              <select
                value={character.scale || 0}
                onChange={(e) => setCharacter({ ...character, scale: parseInt(e.target.value, 10) })}
                className="bg-transparent border-none text-slate-250 focus:outline-none cursor-pointer text-xs"
              >
                <option value={0} className="bg-slate-900">Ningen (x1)</option>
                <option value={1} className="bg-slate-900">Sugoi (x10)</option>
                <option value={2} className="bg-slate-900">Kiodai (x100)</option>
                <option value={3} className="bg-slate-900">Kami (x1000)</option>
              </select>
            </div>

            {/* Indicador de Vantagem Única */}
            <div className="relative race-container flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/50 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-350 shrink-0">
              <span className="text-[9px] uppercase text-slate-500">Vantagem Única:</span>
              <button
                onClick={() => setIsSelectingRace(true)}
                className="text-slate-200 hover:text-white transition-all underline decoration-dotted text-xs"
              >
                {character.unique_advantage?.name || 'Nenhuma'}
              </button>
              {character.unique_advantage && (
                <>
                  <button
                    onClick={() => setShowRaceDetails(!showRaceDetails)}
                    className="p-0.5 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded transition-all ml-0.5"
                    title="Ver detalhes da Vantagem Única"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      const cost = character.unique_advantage?.cost || 0;
                      if (cost < 0 && (character.saved_points || 0) + cost < 0) {
                        showToast("Saldo de Pontos Guardados insuficiente para remover esta Vantagem Única.");
                        return;
                      }
                      setCharacter({
                        ...character,
                        saved_points: (character.saved_points || 0) + cost,
                        unique_advantage: undefined
                      });
                      setShowRaceDetails(false);
                    }}
                    className="text-rose-500 hover:text-rose-400 ml-0.5 font-bold text-sm"
                    title="Remover Vantagem Única"
                  >
                    ×
                  </button>
                </>
              )}

              {/* Popover flutuante para detalhes da Raça */}
              {showRaceDetails && character.unique_advantage && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-950 border border-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-left">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-slate-200 text-xs">{character.unique_advantage.name}</span>
                    <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-800/20 whitespace-nowrap">
                      {character.unique_advantage.cost} pt{Math.abs(character.unique_advantage.cost) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <p className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap">
                      {character.unique_advantage.description || 'Nenhuma descrição fornecida.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRaceDetails(false)}
                    className="w-full mt-3 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 rounded-lg transition-colors font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>

            {/* Desktop-only Saving & Points */}
            <div className="hidden lg:flex items-center gap-4 ml-2 shrink-0">
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="flex items-center gap-1.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-purple-400 transition-all cursor-pointer"
                title="Preferências de Exibição"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Personalizar</span>
              </button>

              <button
                onClick={handleExportCharacterPdf}
                className="flex items-center gap-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/40 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-300 hover:text-purple-200 transition-all cursor-pointer"
                title="Exportar PDF com Backup de Dados Embutido"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                <span>Baixar PDF</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Imprimir Ficha A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>

              <span className="text-xs flex items-center gap-1.5">
                {savingStatus === 'salvando' && (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    <span className="text-amber-500/90 font-medium">Salvando...</span>
                  </>
                )}
                {savingStatus === 'salvo' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-400 font-medium">Alterações salvas</span>
                  </>
                )}
                {savingStatus === 'offline' && (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-400 font-medium">Salvo Localmente (Offline)</span>
                  </>
                )}
                {savingStatus === 'erro' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-rose-400 font-medium">Erro ao salvar</span>
                  </>
                )}
              </span>

              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                isOverflow 
                  ? 'bg-rose-950/30 border-rose-800/30 text-rose-400' 
                  : 'bg-purple-950/30 border-purple-800/30 text-purple-400'
              }`}>
                <Sparkles className="w-3.5 h-3.5" />
                Pontos: {scoreSpent} / {character.points_total}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container com Reordenação Flex e Temas */}
      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna Esquerda: Estatísticas, Atributos & Recursos */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <AttributesSection
            systemDef={systemDef}
            character={character}
            modifiedAttrs={modifiedAttrs}
            pointsAvailable={pointsAvailable}
            handleTriggerAttributeRoll={handleTriggerAttributeRoll}
            handleAttributeChange={handleAttributeChange}
            handleResourceChange={handleResourceChange}
            showToast={showToast}
            themeConfig={themeConfig}
          />

          {/* Card de Tipos de Dano */}
          <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tipos de Dano</h2>
              <button
                type="button"
                onClick={() => {
                  if (systemDef.is_base_system || !systemDef.user_id) {
                    showSystemModal({
                      type: 'info',
                      title: 'Sistema Base Nativo (3D&T Alpha)',
                      message: 'Os tipos de dano dos sistemas base nativos são protegidos contra alteração.\n\nPara personalizar os tipos de dano da sua campanha, acesse o Sandbox no Dashboard e crie ou clone um novo Sistema de Regras Customizado!'
                    });
                  } else if (currentUser && systemDef.user_id !== currentUser.id) {
                    showSystemModal({
                      type: 'info',
                      title: 'Sistema de Regras de Outro Autor',
                      message: 'Este sistema de regras customizado pertence a outro usuário.\n\nApenas o criador original pode alterar os tipos de dano do sistema.'
                    });
                  } else {
                    setIsManagingDamageTypes(!isManagingDamageTypes);
                  }
                }}
                className="text-slate-400 hover:text-purple-400 text-xs transition-colors p-1 flex items-center gap-1 cursor-pointer"
                title="Gerenciar Tipos de Dano do Sistema"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold">{isManagingDamageTypes ? 'Concluir' : 'Editar'}</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-semibold block">Força (Ataque C/C)</label>
                <select
                  value={(systemDef.damage_types || []).includes(character.damage_type_forca) ? character.damage_type_forca : (systemDef.damage_types?.[0] || 'Corte')}
                  onChange={(e) => handleDamageTypeChange('damage_type_forca', e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                >
                  {(systemDef.damage_types || []).map((type: string) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-semibold block">PdF (Ataque à Distância)</label>
                <select
                  value={(systemDef.damage_types || []).includes(character.damage_type_pdf) ? character.damage_type_pdf : (systemDef.damage_types?.[0] || 'Corte')}
                  onChange={(e) => handleDamageTypeChange('damage_type_pdf', e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                >
                  {(systemDef.damage_types || []).map((type: string) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Painel Inline de Gerenciamento para Sistemas Customizados */}
            {isManagingDamageTypes && !systemDef.is_base_system && systemDef.user_id && (!currentUser || systemDef.user_id === currentUser.id) && (
              <div className="pt-3 border-t border-slate-800/60 space-y-3 animate-fade-in">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                  Gerenciar Tipos de Dano do Sistema Customizado
                </span>
                
                <div className="flex flex-wrap gap-1.5">
                  {(systemDef.damage_types || []).map((dtype: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      {dtype}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (systemDef.damage_types || []).filter((_: any, i: number) => i !== idx);
                          handleUpdateSystemDamageTypes(updated);
                        }}
                        className="text-slate-400 hover:text-rose-400 font-bold ml-0.5 cursor-pointer"
                        title="Excluir tipo de dano"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    id="char-page-damage-type-input"
                    type="text"
                    placeholder="Novo tipo de dano..."
                    className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl py-1.5 px-3 text-xs focus:outline-none text-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = document.getElementById('char-page-damage-type-input') as HTMLInputElement;
                        const val = input?.value || '';
                        const check = validateDamageType(systemDef.damage_types || [], val);
                        if (!check.valid) {
                          showToast(check.error || "Tipo de dano inválido.");
                          return;
                        }
                        handleUpdateSystemDamageTypes([...(systemDef.damage_types || []), val.trim()]);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('char-page-damage-type-input') as HTMLInputElement;
                      const val = input?.value || '';
                      const check = validateDamageType(systemDef.damage_types || [], val);
                      if (!check.valid) {
                        showToast(check.error || "Tipo de dano inválido.");
                        return;
                      }
                      handleUpdateSystemDamageTypes([...(systemDef.damage_types || []), val.trim()]);
                      input.value = '';
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs px-3 py-1.5 transition-all cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card de Desenvolvimento & Orçamento */}
          <div className={`bg-[#0f172a]/70 border rounded-2xl p-6 shadow-xl space-y-5 transition-all duration-300 ${
            isOverflow 
              ? 'border-rose-500/30 bg-rose-950/5 shadow-rose-500/5 animate-pulse' 
              : 'border-slate-800'
          }`}>
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${isOverflow ? 'text-rose-400' : 'text-purple-400'}`} />
                Desenvolvimento & Orçamento
              </h2>
              {isOverflow && (
                <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-bounce">
                  Estouro!
                </span>
              )}
            </div>

            {/* Seção 1: Experiência (XP) */}
            <div className="space-y-2 border-b border-slate-800/60 pb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 font-medium">Experiência (XP)</span>
                <span className="font-bold text-slate-200">{(character as any).experience || 0} / 10</span>
              </div>
              <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((((character as any).experience || 0) / 10) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-[9px] text-slate-500">10 XP = 1 Ponto Guardado</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => handleExperienceChange(-5)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
                  >
                    -5
                  </button>
                  <button 
                    onClick={() => handleExperienceChange(-1)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
                  >
                    -1
                  </button>
                  <button 
                    onClick={() => handleExperienceChange(1)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
                  >
                    +1
                  </button>
                  <button 
                    onClick={() => handleExperienceChange(5)}
                    className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer transition-colors"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* Seção 2: Progresso de Pontos */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Distribuição de Pontos</span>
                <span className="font-bold text-slate-400 font-mono text-[11px]">{pointsSpent} / {character.points_total} pt</span>
              </div>
              <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    isOverflow 
                      ? 'bg-gradient-to-r from-rose-600 to-red-500' 
                      : 'bg-gradient-to-r from-purple-600 to-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (pointsSpent / (character.points_total || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Seção 3: Controles e Equação */}
            <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3.5 space-y-3">
              {/* Equação visual */}
              <div className="flex items-center justify-between font-mono text-sm border-b border-slate-800/50 pb-3">
                <div className="text-center">
                  <span className={`text-base font-black ${isOverflow ? 'text-rose-400' : 'text-purple-400'}`}>
                    {pointsAvailable}
                  </span>
                  <span className="text-[9px] text-slate-500 block uppercase">Disponíveis</span>
                </div>
                <span className="text-slate-600 font-bold">=</span>
                <div className="text-center">
                  <span className="text-slate-350 font-bold">
                    {character.points_total}
                  </span>
                  <span className="text-[9px] text-slate-500 block uppercase">Totais</span>
                </div>
                <span className="text-slate-600 font-bold">-</span>
                <div className="text-center">
                  <span className="text-slate-350 font-bold">
                    {pointsSpent}
                  </span>
                  <span className="text-[9px] text-slate-500 block uppercase">Gastos</span>
                </div>
              </div>

              {/* Ajustar Pontos Totais */}
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-semibold text-slate-300 block">Pontos Totais</span>
                  <span className="text-[10px] text-slate-500">Base da pontuação do defensor</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePointsTotalChange(-1)}
                    className="w-7 h-7 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-bold text-slate-200 text-base font-mono">{character.points_total || 0}</span>
                  <button
                    onClick={() => handlePointsTotalChange(1)}
                    className="w-7 h-7 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Habilidades, Vantagens, Perícias, Magias, Inventário & Rolagens */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AdvantagesSection
            character={character}
            setCharacter={setCharacter}
            pointsAvailable={pointsAvailable}
            systemDef={systemDef}
            showToast={showToast}
            setEditingAbilityItem={setEditingAbilityItem}
            setActiveDescriptionItem={setActiveDescriptionItem}
            themeConfig={themeConfig}
          />

          {/* Nova Linha: Rolagens Customizadas & Magias / Inventário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            
            <CustomRollsSection
              character={character}
              setCharacter={setCharacter}
              systemDef={systemDef}
              handleTriggerCustomRoll={handleTriggerCustomRoll}
            />

            {/* Card de Magias & Inventário */}
            <div className="flex flex-col gap-6">
              <SpellsSection
                character={character}
                setCharacter={setCharacter}
                setActiveDescriptionItem={setActiveDescriptionItem}
                themeConfig={themeConfig}
              />

              <InventorySection
                character={character}
                setCharacter={setCharacter}
                themeConfig={themeConfig}
              />

              {/* Card de Background e Anotações */}
              <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wider block">Background e Anotações</span>
                <textarea
                  value={character.annotations || ''}
                  onChange={(e) => setCharacter({ ...character, annotations: e.target.value })}
                  placeholder="Escreva a história do personagem, notas de sessão, contatos, segredos..."
                  rows={6}
                  maxLength={2000}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 resize-y leading-relaxed font-sans"
                />
              </div>

            </div>
          </div>
        </div>

      </main>



      {/* Modal para exibir o Resultado da Rolagem Customizada */}
      {activeRollResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-6 text-center">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Resultado da Ação</span>
              <h3 className="text-lg font-bold text-white mt-1">Rolagem de Dados 🎲</h3>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/85 p-5 rounded-2xl space-y-3">
              <div className="text-xs font-mono text-slate-400 leading-relaxed break-words">
                {activeRollResult.componentsText}
              </div>
              <div className="border-t border-slate-800/60 my-2 pt-2">
                <span className={`text-4xl font-black ${activeRollResult.isCrit ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                  {activeRollResult.total}
                </span>
                {activeRollResult.isCrit && (
                  <span className="text-xs text-amber-400 font-bold block mt-1 uppercase tracking-widest animate-bounce">
                    🔥 CRÍTICO! 🔥
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveRollResult(null)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-98 text-sm"
            >
              Fechar Resultado
            </button>
          </div>
        </div>
      )}

      {/* Modal para selecionar Vantagem Única */}
      {isSelectingRace && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 flex flex-col max-h-[85vh]">
            <div>
              <h3 className="text-lg font-bold text-white">Selecionar Vantagem Única</h3>
              <p className="text-xs text-slate-400 mt-1">Selecione uma vantagem única para o seu personagem.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {((systemDef.unique_advantages || (systemDef.name?.includes('Gaiden') ? gaidenRaces : alphaRaces) || []) as any[]).map((race) => {
                const oldCost = character.unique_advantage?.cost || 0;
                const diff = race.cost - oldCost;
                const isRaceTooExpensive = diff > 0 && pointsAvailable < diff;

                return (
                  <button
                    key={race.name}
                    disabled={isRaceTooExpensive}
                    onClick={() => {
                      if (isRaceTooExpensive) {
                        showToast("Saldo de Pontos Guardados insuficiente.");
                        return;
                      }
                      setCharacter({
                        ...character,
                        saved_points: (character.saved_points || 0) - diff,
                        unique_advantage: {
                          id: crypto.randomUUID(),
                          name: race.name,
                          description: `${race.benefits} | Restrições: ${race.drawbacks}`,
                          cost: race.cost
                        }
                      });
                      setIsSelectingRace(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-start ${
                      isRaceTooExpensive
                        ? 'opacity-40 bg-slate-800/20 border-slate-850 cursor-not-allowed'
                        : 'bg-slate-800/20 border-slate-800 hover:bg-slate-800/40 hover:border-purple-500/30 cursor-pointer'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isRaceTooExpensive ? 'text-slate-500' : 'text-slate-200'}`}>{race.name}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full font-bold">
                          {race.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{race.benefits}</p>
                      {race.drawbacks && race.drawbacks !== 'Não possui penalidades.' && (
                        <p className="text-[10px] text-rose-400 italic">Desvantagens: {race.drawbacks}</p>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-800/20 whitespace-nowrap">
                      {race.cost} pt{Math.abs(race.cost) !== 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsSelectingRace(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDescriptionItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setActiveDescriptionItem(null)}>
          <div 
            className="bg-[#0f172a]/95 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {activeDescriptionItem.name}
                  {activeDescriptionItem.cost && (
                    <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-800/30 px-2 py-0.5 rounded-full font-bold">
                      {activeDescriptionItem.cost}
                    </span>
                  )}
                </h3>
              </div>
              <button 
                onClick={() => setActiveDescriptionItem(null)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto pr-1 flex-1">
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activeDescriptionItem.description}
              </p>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveDescriptionItem(null)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-xl transition-all"
              >
                Fechar
              </button>
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

      {editingAbilityItem && (
        <EditAbilityModal
          item={getEnrichedItem(editingAbilityItem.item, editingAbilityItem.type)}
          itemType={editingAbilityItem.type}
          isBaseSystem={systemDef.is_base_system || !systemDef.user_id}
          isSystemOwner={!systemDef.is_base_system && Boolean(systemDef.user_id) && Boolean(currentUser) && systemDef.user_id === currentUser.id}
          onSave={handleSaveAbilityEdit}
          onClose={() => setEditingAbilityItem(null)}
          onTriggerClone={() => {
            setEditingAbilityItem(null);
            setShowBaseSystemBlockModal(true);
          }}
        />
      )}

      {showBaseSystemBlockModal && (
        <BaseSystemBlockModal
          systemName={systemDef.name || 'Sistema Padrão'}
          onConfirmClone={handleCloneBaseSystem}
          onClose={() => setShowBaseSystemBlockModal(false)}
        />
      )}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a]/95 border border-purple-500/30 text-slate-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in max-w-sm">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-semibold text-xs leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Modal Editor do Sistema de Regras Customizado na Ficha */}
      {isEditingSystemModalOpen && editingSystemState && (
        <SystemEditorModal
          isOpen={isEditingSystemModalOpen}
          systemState={editingSystemState}
          onSave={async (updatedSystem) => {
            try {
              const { error } = await supabase
                .from('rule_systems')
                .update({
                  name: updatedSystem.name.trim(),
                  description: updatedSystem.description,
                  attributes: updatedSystem.attributes,
                  resources: updatedSystem.resources,
                  damage_types: updatedSystem.damage_types || [],
                  advantages: updatedSystem.advantages || [],
                  disadvantages: updatedSystem.disadvantages || [],
                  skills: updatedSystem.skills || [],
                  dice_config: updatedSystem.dice_config || { count: 1, faces: 6 }
                })
                .eq('id', updatedSystem.id);

              if (error) throw error;

              setSystemDef(updatedSystem);
              setIsEditingSystemModalOpen(false);
              setEditingSystemState(null);
              showToast("Sistema de Regras customizado atualizado no banco de dados!");
            } catch (err) {
              console.error("Erro ao atualizar sistema de regras:", err);
              showSystemModal({ type: 'alert', title: 'Erro', message: 'Erro ao salvar o sistema de regras no banco de dados.' });
            }
          }}
          onClose={() => {
            setIsEditingSystemModalOpen(false);
            setEditingSystemState(null);
          }}
          showSystemModal={showSystemModal}
        />
      )}

      {/* Modal de Preferências de Exibição */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentTheme={currentTheme}
        currentAvatarUrl={avatarUrl}
        onSave={handleSavePreferences}
      />

      <SystemModal
        {...modalConfig}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
      </div>

      {/* Printable Sheet Version (A4 High Contrast) */}
      <div className="hidden print:block bg-white text-black p-4 font-sans text-xs leading-relaxed">
        {/* Print Header */}
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-1.5 rounded mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Galeria de Defensores — Ficha de Personagem</span>
            <span className="text-[9px] font-mono text-slate-300">{systemDef.name}</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{character.name}</h1>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {character.concept || 'Sem Conceito'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-black text-slate-900">{scoreSpent} / {character.points_total} PTs</span>
              <p className="text-[9px] uppercase font-bold text-slate-600 mt-0.5">Escala: {
                character.scale === 1 ? 'Sugoi (x10)' :
                character.scale === 2 ? 'Kiodai (x100)' :
                character.scale === 3 ? 'Kami (x1000)' : 'Ningen (x1)'
              }</p>
            </div>
          </div>
        </div>

        {/* Print Body: Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1: Attributes & Resources */}
          <div className="col-span-1 space-y-6 border-r border-slate-300 pr-6">
            {/* Attributes Box */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Atributos</h2>
              <div className="space-y-2 font-mono">
                {Object.keys(systemDef.attributes).map((attrKey) => {
                  const baseVal = character.attributes_values?.[attrKey] ?? 0;
                  const bonusVal = equippedModifiers[attrKey] || 0;
                  const finalVal = modifiedAttrs[attrKey] ?? baseVal;
                  return (
                    <div key={attrKey} className="flex justify-between items-center border-b border-slate-200 pb-1">
                      <span className="font-bold text-slate-700">{systemDef.attributes[attrKey].name} ({attrKey})</span>
                      <span className="font-bold text-sm">
                        {finalVal}
                        {bonusVal !== 0 && (
                          <span className="text-slate-500 text-xs font-normal"> ({baseVal}{bonusVal >= 0 ? '+' : ''}{bonusVal})</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resources Box */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Recursos</h2>
              <div className="space-y-2 font-mono">
                {Object.keys(systemDef.resources || {}).map((key) => {
                  const res = systemDef.resources[key];
                  const maxVal = evaluateResourceFormula(res.formula, res.baseAttributeKey, modifiedAttrs, key, character.advantages);
                  const currentVal = character.resources_current[key] ?? maxVal;
                  return (
                    <div key={key} className="flex justify-between items-center border-b border-slate-200 pb-1">
                      <span className="font-bold text-slate-700">{res.name} ({key})</span>
                      <span className="font-bold text-sm">{currentVal} / {maxVal}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Damage Types */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Tipos de Dano</h2>
              <div className="text-[10px] space-y-1 font-mono">
                <div>
                  <span className="font-bold text-slate-700">Força (F):</span>{' '}
                  <span className="font-medium">{character.damage_type_forca || 'Corte'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">Poder de Fogo (PdF):</span>{' '}
                  <span className="font-medium">{character.damage_type_pdf || 'Corte'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Advantages & Disadvantages */}
          <div className="col-span-1 space-y-6 border-r border-slate-300 pr-6">
            {/* Vantagem Única */}
            {character.unique_advantage && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Vantagem Única</h2>
                <div className="p-2 border border-slate-200 bg-slate-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{character.unique_advantage.name}</span>
                    <span className="font-mono text-[10px] font-bold">{character.unique_advantage.cost} pt{Number(character.unique_advantage.cost) !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{character.unique_advantage.description}</p>
                </div>
              </div>
            )}

            {/* Advantages */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Vantagens</h2>
              <div className="space-y-2">
                {character.advantages.map((adv) => (
                  <div key={adv.id || adv.name} className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{adv.name}</span>
                      <span className="font-mono text-[10px] font-bold">{adv.cost} pt{Number(adv.cost) !== 1 ? 's' : ''}</span>
                    </div>
                    {adv.isModular && adv.selectedModifiers && adv.selectedModifiers.length > 0 && (
                      <p className="text-[9px] text-purple-600 font-bold mt-0.5">
                        Modificadores: {adv.modifiers
                          ?.filter((m: any) => adv.selectedModifiers?.includes(m.id))
                          .map((m: any) => m.name)
                          .join(', ')}
                      </p>
                    )}
                    {adv.description && (
                      <p className="text-[9px] text-slate-600 mt-0.5 leading-normal whitespace-pre-wrap">{adv.description}</p>
                    )}
                  </div>
                ))}
                {character.advantages.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">Nenhuma vantagem adquirida.</p>
                )}
              </div>
            </div>

            {/* Disadvantages */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Desvantagens</h2>
              <div className="space-y-2">
                {character.disadvantages.map((dis) => (
                  <div key={dis.id || dis.name} className="p-2 border border-slate-200 bg-slate-50 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{dis.name}</span>
                      <span className="font-mono text-[10px] font-bold">{dis.cost} pt{Number(dis.cost) !== 1 ? 's' : ''}</span>
                    </div>
                    {dis.isModular && dis.selectedModifiers && dis.selectedModifiers.length > 0 && (
                      <p className="text-[9px] text-purple-600 font-bold mt-0.5">
                        Modificadores: {dis.modifiers
                          ?.filter((m: any) => dis.selectedModifiers?.includes(m.id))
                          .map((m: any) => m.name)
                          .join(', ')}
                      </p>
                    )}
                    {dis.description && (
                      <p className="text-[9px] text-slate-600 mt-0.5 leading-normal whitespace-pre-wrap">{dis.description}</p>
                    )}
                  </div>
                ))}
                {character.disadvantages.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">Nenhuma desvantagem adquirida.</p>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Skills, Spells, Inventory */}
          <div className="col-span-1 space-y-6">
            {/* Perícias & Especializações */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Perícias & Especialidades</h2>
              <div className="space-y-1">
                {character.skills.map((skill) => (
                  <div key={skill.name} className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-0.5">
                    <span className="font-bold">{skill.name}</span>
                    <span className="font-mono text-[9px] font-bold">{skill.cost} pt</span>
                  </div>
                ))}
                {character.specializations.map((spec) => (
                  <div key={spec.name} className="flex justify-between items-center text-[10px] border-b border-slate-100 pb-0.5 text-slate-600 font-sans pl-2">
                    <span>• {spec.name}</span>
                    <span className="font-mono text-[9px] font-bold">{spec.cost} pt</span>
                  </div>
                ))}
                {character.skills.length === 0 && character.specializations.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">Nenhuma perícia adquirida.</p>
                )}
              </div>
            </div>

            {/* Spells */}
            {character.spells.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Magias</h2>
                <div className="space-y-2">
                  {character.spells.map((spell) => (
                    <div key={spell.name} className="p-2 border border-slate-200 bg-slate-50 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{spell.name}</span>
                        <span className="font-mono text-[9px] font-bold">{spell.cost}</span>
                      </div>
                      <p className="text-[9px] text-slate-600 mt-0.5">{spell.description || 'Sem descrição.'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory / Equipment */}
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1">Equipamentos & Itens</h2>
              <div className="space-y-2">
                {character.inventory.map((item) => (
                  <div key={item.name} className="p-2 border border-slate-200 bg-slate-50 rounded flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-[10px]">{item.name} {item.is_equipped ? '⚔️' : ''}</span>
                      {item.description && (
                        <p className="text-[9px] text-slate-550 leading-normal truncate">{item.description}</p>
                      )}
                    </div>
                    {item.bonus_attribute && item.bonus_value && (
                      <span className="text-[9px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                        +{item.bonus_value} {item.bonus_attribute}
                      </span>
                    )}
                  </div>
                ))}
                {character.inventory.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">Inventário vazio.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
