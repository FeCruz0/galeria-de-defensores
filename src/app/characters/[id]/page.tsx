'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Character, RuleSystem, AdvantageItem, Spell, InventoryItem, ModifierOption } from '@/types/game';
import { calculateScore, getMaxPv, getMaxPm, computedCostPt, executeCustomRoll, convertXpToPoints, getModifiedAttributes, getEquippedItemsModifiers } from '@/lib/rules';
import { canAlterAttribute, canAffordCost } from '@/lib/validations';
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
  Palette
} from 'lucide-react';
import DiceRollOverlay from '@/components/DiceRollOverlay';
import EditAbilityModal from '@/components/EditAbilityModal';
import BaseSystemBlockModal from '@/components/BaseSystemBlockModal';
import PreferencesModal from '@/components/PreferencesModal';
import { getTheme, ThemeId, DEFAULT_SECTION_ORDER } from '@/lib/theme';

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


export default function CharacterSheetPage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<Character | null>(null);
  const [systemDef, setSystemDef] = useState<any>(STANDARD_SYSTEMS);
  const [savingStatus, setSavingStatus] = useState<'salvo' | 'salvando' | 'erro'>('salvo');

  // Catálogos e Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<any>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [activeDescriptionItem, setActiveDescriptionItem] = useState<{
    name: string;
    cost: string;
    description: string;
  } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [expandedItemNameId, setExpandedItemNameId] = useState<string | null>(null);
  const [isAddingAdvantageExpanded, setIsAddingAdvantageExpanded] = useState(false);
  const [editingAbilityItem, setEditingAbilityItem] = useState<{
    item: AdvantageItem;
    type: 'advantages' | 'disadvantages' | 'skills' | 'specializations';
  } | null>(null);
  const [showBaseSystemBlockModal, setShowBaseSystemBlockModal] = useState(false);

  const isGaiden = systemDef.name?.toLowerCase().includes('gaiden') || false;

  const enrichAdvantages = (items: any[], isGai: boolean) => {
    const baseCatalog = isGai ? gaidenAdvantages : alphaAdvantages;
    return items.map(item => {
      const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
      if (baseItem && baseItem.isModular) {
        return {
          ...item,
          isModular: true,
          baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
          modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
        };
      }
      return item;
    });
  };

  const enrichDisadvantages = (items: any[], isGai: boolean) => {
    const baseCatalog = isGai ? gaidenDisadvantages : alphaDisadvantages;
    return items.map(item => {
      const baseItem = baseCatalog.find(b => b.name.toLowerCase() === item.name.toLowerCase());
      if (baseItem && baseItem.isModular) {
        return {
          ...item,
          isModular: true,
          baseCostPt: item.baseCostPt !== undefined ? item.baseCostPt : (baseItem.baseCostPt || 0),
          modifiers: item.modifiers?.length ? item.modifiers : (baseItem.modifiers || [])
        };
      }
      return item;
    });
  };

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

  const currentCatalog = React.useMemo(() => {
    if (systemDef.advantages?.length || systemDef.disadvantages?.length || systemDef.skills?.length) {
      return {
        advantages: enrichAdvantages(systemDef.advantages || [], isGaiden),
        disadvantages: enrichDisadvantages(systemDef.disadvantages || [], isGaiden),
        skills: systemDef.skills || [],
        specializations: systemDef.specializations || alphaSpecializations
      };
    }
    if (isGaiden) {
      return {
        advantages: gaidenAdvantages,
        disadvantages: gaidenDisadvantages,
        skills: gaidenSkills,
        specializations: alphaSpecializations
      };
    }
    return {
      advantages: alphaAdvantages,
      disadvantages: alphaDisadvantages,
      skills: alphaSkills,
      specializations: alphaSpecializations
    };
  }, [systemDef, isGaiden]);

  const allCatalogItems = React.useMemo(() => {
    const list: {
      name: string;
      description: string;
      cost: string;
      type: 'advantages' | 'disadvantages' | 'skills' | 'specializations' | 'unique_advantage';
      originalItem: any;
    }[] = [];

    // Add advantages
    (currentCatalog.advantages || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'advantages',
        originalItem: item
      });
    });

    // Add disadvantages
    (currentCatalog.disadvantages || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'disadvantages',
        originalItem: item
      });
    });

    // Add skills
    (currentCatalog.skills || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'skills',
        originalItem: item
      });
    });

    // Add specializations
    (currentCatalog.specializations || []).forEach((item: any) => {
      list.push({
        name: item.name,
        description: item.description || '',
        cost: typeof item.cost === 'number' ? `${item.cost}pt` : String(item.cost || '0'),
        type: 'specializations',
        originalItem: item
      });
    });
    // Add unique advantages (races)
    const races = (systemDef as any).unique_advantages || (systemDef.name?.includes('Gaiden') ? gaidenRaces : alphaRaces) || [];
    races.forEach((item: any) => {
      list.push({
        name: item.name,
        description: `${item.benefits || ''}${item.drawbacks && item.drawbacks !== 'Não possui penalidades.' ? ' | Restrições: ' + item.drawbacks : ''}`,
        cost: item.cost !== undefined ? `${item.cost}pt` : '0pt',
        type: 'unique_advantage',
        originalItem: item
      });
    });

    return list;
  }, [currentCatalog, systemDef]);

  const typeLabels: Record<string, string> = {
    advantages: 'Vantagem',
    disadvantages: 'Desvantagem',
    skills: 'Perícia',
    specializations: 'Especialização',
    unique_advantage: 'Vantagem Única'
  };

  const typeBadgeColors: Record<string, string> = {
    advantages: 'text-purple-400 bg-purple-950/40 border-purple-800/20',
    disadvantages: 'text-rose-400 bg-rose-950/40 border-rose-800/20',
    skills: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/20',
    specializations: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/20',
    unique_advantage: 'text-amber-400 bg-amber-950/40 border-amber-800/20'
  };

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

  // Input states for adding items
  const [newAdvName, setNewAdvName] = useState('');
  const [newAdvCost, setNewAdvCost] = useState('1');
  const [newAdvDesc, setNewAdvDesc] = useState('');
  const [advType, setAdvType] = useState<'advantages' | 'disadvantages' | 'skills' | 'specializations'>('advantages');

  const [newSpellName, setNewSpellName] = useState('');
  const [newSpellCost, setNewSpellCost] = useState('1 PM');
  const [newSpellDesc, setNewSpellDesc] = useState('');

  const [newInvName, setNewInvName] = useState('');
  const [newInvQty, setNewInvQty] = useState(1);
  const [newInvBonusAttr, setNewInvBonusAttr] = useState(''); // 'F' | 'H' | 'R' | 'A' | 'PdF' | ''
  const [newInvBonusVal, setNewInvBonusVal] = useState(1);

  // States de Rolagem Customizada
  const [isAddingRoll, setIsAddingRoll] = useState(false);
  const [newRollName, setNewRollName] = useState('');
  const [newRollDesc, setNewRollDesc] = useState('');
  const [newRollGlobalMod, setNewRollGlobalMod] = useState(0);
  const [newRollPrimaryAttr, setNewRollPrimaryAttr] = useState('none');
  const [newRollSecondaryAttr, setNewRollSecondaryAttr] = useState('none');
  const [newRollAccumulateCrit, setNewRollAccumulateCrit] = useState(false);
  const [newRollComponents, setNewRollComponents] = useState<any[]>([
    {
      id: crypto.randomUUID(),
      count: 1,
      faces: 6,
      bonus: 0,
      isNegative: false,
      canCrit: true,
      critMultiplier: 2
    }
  ]);
  const [newRollType, setNewRollType] = useState<'ATTACK' | 'DEFENSE' | 'MAGIC' | 'TEST' | 'INITIATIVE' | 'OTHER'>('OTHER');
  const [newRollPmCost, setNewRollPmCost] = useState(0);
  const [activeRollResult, setActiveRollResult] = useState<any>(null);
  const [isSelectingRace, setIsSelectingRace] = useState(false);
  const [showRaceDetails, setShowRaceDetails] = useState(false);

  // States de Preferências e Exibição
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('dark');
  const [sectionOrder, setSectionOrder] = useState<string[]>(DEFAULT_SECTION_ORDER);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [virtualRoll, setVirtualRoll] = useState<{ results: number[]; title: string; callback: () => void } | null>(null);

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

  // 1. Carregar Personagem e Sistema de Regras
  useEffect(() => {
    async function loadCharacter() {
      try {
        const { data: charData, error } = await supabase
          .from('characters')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !charData) {
          router.push('/dashboard');
          return;
        }

        setCharacter(charData);

        // Carregar preferências do usuário
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', charData.user_id)
          .maybeSingle();

        if (profileData) {
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
          const prefs = profileData.preferences || {};
          const themeFromDb = prefs.theme || (localStorage.getItem('gdd_theme') as ThemeId) || 'dark';
          const orderFromDb = prefs.section_order || JSON.parse(localStorage.getItem('gdd_section_order') || 'null') || DEFAULT_SECTION_ORDER;
          setCurrentTheme(themeFromDb);
          setSectionOrder(orderFromDb);
          localStorage.setItem('gdd_theme', themeFromDb);
          localStorage.setItem('gdd_section_order', JSON.stringify(orderFromDb));
        }

        // Carregar sistema de regras (utiliza Alpha como padrão se rule_system_id for nulo)
        const systemId = charData.rule_system_id || '33333333-3333-3333-3333-333333333333';
        const { data: systemData } = await supabase
          .from('rule_systems')
          .select('*')
          .eq('id', systemId)
          .single();

        if (systemData) {
          setSystemDef({
            id: systemData.id,
            name: systemData.name,
            attributes: systemData.attributes,
            resources: systemData.resources,
            advantages: systemData.advantages,
            disadvantages: systemData.disadvantages,
            skills: systemData.skills,
            is_base_system: systemData.is_base_system,
            damage_types: systemData.damage_types || []
          });
        }
      } catch (err) {
        console.error('Erro ao carregar personagem:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCharacter();
  }, [id, router, supabase]);

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
          alert(`Conflito: Você já possui outro personagem com o nome "${character.name}"! Escolha um nome diferente para salvar.`);
          return;
        }

        // Calcular pontos gastos no momento de salvar
        const currentScore = calculateScore(character);

        const { error } = await supabase
          .from('characters')
          .update({
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
          })
          .eq('id', character.id);

        if (error) throw error;
        setSavingStatus('salvo');
      } catch (err) {
        console.error('Erro no autosave:', err);
        setSavingStatus('erro');
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [character, loading, supabase]);

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

  // Selecionar item do catálogo de vantagens/desvantagens/perícias/vantagens únicas
  function handleSelectCatalogItem(item: any) {
    if (!character) return;
    setSearchQuery('');
    
    if (item.type === 'unique_advantage') {
      const oldCost = character.unique_advantage?.cost || 0;
      const newCost = parseInt(item.cost) || 0;
      const diff = newCost - oldCost;
      if (!canAffordCost(diff, character.saved_points || 0)) {
        showToast("Saldo de Pontos Guardados insuficiente para esta Vantagem Única.");
        return;
      }
      setCharacter({
        ...character,
        saved_points: (character.saved_points || 0) - diff,
        unique_advantage: {
          id: crypto.randomUUID(),
          name: item.name,
          description: item.description,
          cost: newCost
        }
      });
      return;
    }

    if (item.originalItem.isModular) {
      setSelectedCatalogItem(item.originalItem);
      setSelectedModifiers([]);
      setAdvType('advantages');
    } else {
      setNewAdvName(item.name);
      setNewAdvCost(item.cost.replace('pt', ''));
      setNewAdvDesc(item.description);
      setAdvType(item.type);
    }
  }

  // Adicionar Vantagem Modular configurada na ficha
  function handleAddModularItem() {
    if (!character || !selectedCatalogItem) return;

    const newItem: AdvantageItem = {
      id: crypto.randomUUID(),
      name: selectedCatalogItem.name,
      description: selectedCatalogItem.description,
      cost: 'Modular',
      isModular: true,
      baseCostPt: selectedCatalogItem.baseCostPt || 0,
      modifiers: selectedCatalogItem.modifiers || [],
      selectedModifiers: selectedModifiers
    };

    const costPt = computedCostPt(newItem);
    if (!canAffordCost(costPt, character.saved_points || 0)) {
      showToast("Saldo de Pontos Guardados insuficiente.");
      return;
    }

    newItem.cost = `${costPt} ponto${Math.abs(costPt) !== 1 ? 's' : ''}`;

    const targetList = character[advType] || [];
    setCharacter({
      ...character,
      saved_points: (character.saved_points || 0) - costPt,
      [advType]: [...targetList, newItem]
    });

    setSelectedCatalogItem(null);
    setSelectedModifiers([]);
  }

  // Criar e adicionar uma nova rolagem customizada rápida
  function handleCreateCustomRoll() {
    if (!character || !newRollName.trim()) return;

    const newRoll = {
      id: crypto.randomUUID(),
      name: newRollName.trim(),
      description: newRollDesc.trim(),
      components: newRollComponents,
      globalModifier: newRollGlobalMod,
      primaryAttribute: newRollPrimaryAttr,
      secondaryAttribute: newRollSecondaryAttr,
      accumulateCrit: newRollAccumulateCrit,
      pmCost: newRollPmCost,
      type: newRollType
    };

    setCharacter({
      ...character,
      custom_rolls: [...(character.custom_rolls || []), newRoll as any]
    });

    // Resetar formulário
    setNewRollName('');
    setNewRollDesc('');
    setNewRollGlobalMod(0);
    setNewRollPrimaryAttr('none');
    setNewRollSecondaryAttr('none');
    setNewRollAccumulateCrit(false);
    setNewRollComponents([
      {
        id: crypto.randomUUID(),
        count: 1,
        faces: 6,
        bonus: 0,
        isNegative: false,
        canCrit: true,
        critMultiplier: 2
      }
    ]);
    setNewRollType('OTHER');
    setNewRollPmCost(0);
    setIsAddingRoll(false);
  }

  // Acionar rolagem customizada da ficha localmente
  function handleTriggerCustomRoll(roll: any) {
    if (!character) return;

    if (roll.pmCost && roll.pmCost > 0) {
      const currentPm = character.resources_current?.['PM'] ?? 0;
      if (currentPm < roll.pmCost) {
        if (!confirm(`Você não tem PM suficiente (Custo: ${roll.pmCost} PM, Atual: ${currentPm} PM). Deseja realizar a rolagem mesmo assim?`)) {
          return;
        }
      }
      setCharacter({
        ...character,
        resources_current: {
          ...character.resources_current,
          PM: Math.max(0, currentPm - roll.pmCost)
        }
      });
    }

    const result = executeCustomRoll(roll, character.attributes_values);

    setVirtualRoll({
      results: result.dices.length > 0 ? result.dices : [6],
      title: roll.name,
      callback: () => {
        setActiveRollResult(result);
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

  // Adicionar Vantagem/Desvantagem/Perícia
  function handleAddAdvantage() {
    if (!character || !newAdvName.trim()) return;

    const newItem: AdvantageItem = {
      id: crypto.randomUUID(),
      name: newAdvName.trim(),
      cost: newAdvCost,
      description: newAdvDesc.trim()
    };

    const costPt = computedCostPt(newItem);
    if (!canAffordCost(costPt, character.saved_points || 0)) {
      showToast("Saldo de Pontos Guardados insuficiente.");
      return;
    }

    const targetList = character[advType] || [];

    setCharacter({
      ...character,
      saved_points: (character.saved_points || 0) - costPt,
      [advType]: [...targetList, newItem]
    });

    setNewAdvName('');
    setNewAdvDesc('');
  }

  // Deletar item
  function handleDeleteAdvantage(type: 'advantages' | 'disadvantages' | 'skills' | 'specializations', itemId: string) {
    if (!character) return;
    const targetList = character[type] || [];
    const itemToDelete = targetList.find(item => item.id === itemId);
    if (!itemToDelete) return;

    const costPt = computedCostPt(itemToDelete);
    if (costPt < 0 && (character.saved_points || 0) + costPt < 0) {
      showToast("Saldo de Pontos Guardados insuficiente para remover esta desvantagem.");
      return;
    }

    setCharacter({
      ...character,
      saved_points: (character.saved_points || 0) + costPt,
      [type]: targetList.filter(item => item.id !== itemId)
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

  // Salvar edição de habilidade/vantagem local do personagem
  function handleSaveAbilityEdit(updatedItem: AdvantageItem) {
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

    const updatedList = list.map(item => item.id === updatedItem.id ? updatedItem : item);
    setCharacter({
      ...character,
      saved_points: (character.saved_points || 0) - diff,
      [type]: updatedList
    });
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

  // Adicionar Magia
  function handleAddSpell() {
    if (!character || !newSpellName.trim()) return;

    const newSpell: Spell = {
      id: crypto.randomUUID(),
      name: newSpellName.trim(),
      cost: newSpellCost,
      school: '',
      requirements: '',
      range: '',
      duration: '',
      description: newSpellDesc.trim()
    };

    setCharacter({
      ...character,
      spells: [...(character.spells || []), newSpell]
    });

    setNewSpellName('');
    setNewSpellDesc('');
  }

  // Deletar Magia
  function handleDeleteSpell(spellId: string) {
    if (!character) return;
    setCharacter({
      ...character,
      spells: character.spells.filter(s => s.id !== spellId)
    });
  }

  // Adicionar Item ao Inventário
  function handleAddInventory() {
    if (!character || !newInvName.trim()) return;

    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      name: newInvName.trim(),
      description: '',
      quantity: newInvQty,
      is_equipped: false,
      bonus_attribute: newInvBonusAttr || undefined,
      bonus_value: newInvBonusAttr ? newInvBonusVal : undefined
    };

    setCharacter({
      ...character,
      inventory: [...(character.inventory || []), newItem]
    });

    setNewInvName('');
    setNewInvQty(1);
    setNewInvBonusAttr('');
    setNewInvBonusVal(1);
  }

  // Equipar / Desequipar Item no Inventário
  function handleToggleEquipInventory(itemId: string) {
    if (!character) return;
    setCharacter({
      ...character,
      inventory: character.inventory.map(item => 
        item.id === itemId 
          ? { ...item, is_equipped: !item.is_equipped } 
          : item
      )
    });
  }

  // Deletar Item do Inventário
  function handleDeleteInventory(itemId: string) {
    if (!character) return;
    setCharacter({
      ...character,
      inventory: character.inventory.filter(i => i.id !== itemId)
    });
  }

  // Atualizar Quantidade de Item no Inventário
  function handleUpdateInventoryQty(itemId: string, newQty: number) {
    if (!character || newQty < 0) return;
    setCharacter({
      ...character,
      inventory: character.inventory.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
    });
  }

  const equippedModifiers = getEquippedItemsModifiers(character.inventory);
  const modifiedAttrs = getModifiedAttributes(character.attributes_values, [], equippedModifiers);

  const attributesSum = Object.values(character.attributes_values).reduce((sum, val) => sum + (val || 0), 0);
  const advantagesSum = character.advantages.reduce((sum, item) => sum + computedCostPt(item), 0);
  const disadvantagesSum = (character.disadvantages || []).reduce((sum, item) => sum + computedCostPt(item), 0);
  const skillsSum = (character.skills || []).reduce((sum, item) => sum + computedCostPt(item), 0);
  const specializationsSum = Math.floor((character.specializations?.length || 0) / 3);
  const uniqueAdvantageCost = character.unique_advantage?.cost || 0;

  const pointsSpent = attributesSum + advantagesSum + disadvantagesSum + skillsSum + specializationsSum + uniqueAdvantageCost;
  const pointsAvailable = character.saved_points || 0;
  const pointsTotal = pointsSpent + pointsAvailable; // Dinamicamente igual a calculateScore(character)
  const scoreSpent = pointsTotal; // Para manter compatibilidade com outras partes do código
  const isOverflow = pointsAvailable < 0;

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
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Imprimir Ficha / Exportar PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF / Imprimir</span>
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
      <main className="max-w-7xl mx-auto px-4 mt-8 flex flex-col gap-6">
        
        {/* Section: Recursos (PV / PM) */}
        <div style={{ order: sectionOrder.indexOf('resources') !== -1 ? sectionOrder.indexOf('resources') : 1 }}>
          <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl p-6 shadow-xl space-y-6 transition-colors duration-300`}>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Recursos</h2>
            
            {Object.keys(systemDef.resources || {})
              .sort((a, b) => {
                if (a === 'PV' && b === 'PM') return -1;
                if (a === 'PM' && b === 'PV') return 1;
                return a.localeCompare(b);
              })
              .map((key) => {
              const res = systemDef.resources[key];
              const maxVal = evaluateResourceFormula(res.formula, res.baseAttributeKey, modifiedAttrs, key, character.advantages);
              const currentVal = character.resources_current[key] ?? maxVal;

              let colorClass = "from-rose-600 to-rose-500";
              let textColorClass = "text-rose-400";
              let Icon = Heart;

              if (key === 'PM' || res.name.toLowerCase().includes('magia') || res.name.toLowerCase().includes('mana')) {
                colorClass = "from-cyan-600 to-cyan-500";
                textColorClass = "text-cyan-400";
                Icon = Zap;
              } else if (key !== 'PV') {
                colorClass = "from-emerald-600 to-emerald-500";
                textColorClass = "text-emerald-400";
                Icon = Shield;
              }

              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className={`flex items-center gap-1.5 ${textColorClass} font-semibold`}>
                      <Icon className="w-4 h-4" />
                      {res.name}
                    </span>
                    <span className="font-bold text-slate-200">
                      {currentVal} / {maxVal}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-300`}
                      style={{ width: `${Math.min(100, maxVal > 0 ? (currentVal / maxVal) * 100 : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button 
                      onClick={() => handleResourceChange(key, -5, maxVal)}
                      className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold"
                    >
                      -5
                    </button>
                    <button 
                      onClick={() => handleResourceChange(key, -1, maxVal)}
                      className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold"
                    >
                      -1
                    </button>
                    <button 
                      onClick={() => handleResourceChange(key, 1, maxVal)}
                      className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold"
                    >
                      +1
                    </button>
                    <button 
                      onClick={() => handleResourceChange(key, 5, maxVal)}
                      className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700 text-xs font-bold"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Atributos & Estatísticas */}
        <div style={{ order: sectionOrder.indexOf('attributes') !== -1 ? sectionOrder.indexOf('attributes') : 0 }}>
          <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl p-6 shadow-xl space-y-5 transition-colors duration-300`}>
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Atributos</h2>
            
            <div className="space-y-4">
              {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map((key) => {
                const attr = systemDef.attributes[key];
                const value = character.attributes_values[key] ?? 0;
                const modValue = modifiedAttrs[key] ?? value;
                const bonus = modValue - value;
                return (
                  <div key={key} className="flex justify-between items-center bg-slate-800/20 border border-slate-800/60 rounded-xl p-3">
                    <span className="font-medium text-slate-300">{attr.name}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAttributeChange(key, -1)}
                        className="w-7 h-7 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="w-16 text-center font-bold text-slate-200 text-base flex justify-center items-center gap-1 font-mono">
                        {value}
                        {bonus > 0 && (
                          <span className="text-[10px] text-emerald-400 font-bold font-sans shrink-0">(+{bonus})</span>
                        )}
                        {bonus < 0 && (
                          <span className="text-[10px] text-rose-500 font-bold font-sans shrink-0">({bonus})</span>
                        )}
                      </span>
                      <button
                        onClick={() => {
                          if (pointsAvailable < 1) {
                            showToast("Saldo de Pontos Guardados insuficiente.");
                          } else {
                            handleAttributeChange(key, 1);
                          }
                        }}
                        className={`w-7 h-7 border text-slate-300 font-bold rounded-lg flex items-center justify-center text-sm transition-all ${
                          pointsAvailable < 1
                            ? 'opacity-40 bg-slate-800/20 border-slate-850 cursor-not-allowed'
                            : 'bg-slate-850 hover:bg-slate-700 border-slate-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card de Tipos de Dano */}
          <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Tipos de Dano</h2>
            
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

        {/* Section: Qualidades (Vantagens, Desvantagens, Perícias) */}
        <div style={{ order: sectionOrder.indexOf('qualities') !== -1 ? sectionOrder.indexOf('qualities') : 2 }} className="space-y-6">
          
          {/* Adicionar Vantagem / Perícia */}
          <div className={`${themeConfig.cardBgClass} border ${themeConfig.borderClass} rounded-2xl shadow-xl transition-all`}>
            <button
              onClick={() => setIsAddingAdvantageExpanded(!isAddingAdvantageExpanded)}
              className="w-full flex justify-between items-center p-6 text-left focus:outline-none cursor-pointer"
            >
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Plus className={`w-4 h-4 text-purple-400 transition-transform duration-300 ${isAddingAdvantageExpanded ? 'rotate-45' : ''}`} />
                Adicionar Habilidade / Vantagem
              </h2>
              <span className="text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/20 px-2.5 py-1 rounded-lg hover:bg-purple-900/20 transition-all">
                {isAddingAdvantageExpanded ? 'Minimizar' : 'Mostrar Opções'}
              </span>
            </button>
            
            {isAddingAdvantageExpanded && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-800/40 space-y-4 animate-fade-in">
                {/* Campo de Busca no Catálogo */}
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Buscar no Catálogo do Sistema
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: Ataque Especial, Código de Honra..."
                    className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-purple-500 text-slate-200"
                  />
                  {searchQuery && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                      {allCatalogItems
                        .filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((item: any) => {
                          let isCatalogItemTooExpensive = false;
                          if (item.type === 'unique_advantage') {
                            const oldCost = character.unique_advantage?.cost || 0;
                            const newCost = parseInt(item.cost) || 0;
                            const diff = newCost - oldCost;
                            isCatalogItemTooExpensive = diff > 0 && pointsAvailable < diff;
                          } else {
                            const costVal = parseInt(item.cost) || 0;
                            isCatalogItemTooExpensive = costVal > 0 && pointsAvailable < costVal;
                          }
                          return (
                            <button
                              key={`${item.type}-${item.name}`}
                              onClick={() => {
                                if (isCatalogItemTooExpensive) {
                                  showToast("Saldo de Pontos Guardados insuficiente.");
                                } else {
                                  handleSelectCatalogItem(item);
                                }
                              }}
                              className={`w-full text-left px-4 py-2.5 border-b border-slate-900/60 last:border-b-0 transition-colors ${
                                isCatalogItemTooExpensive
                                  ? 'opacity-40 hover:bg-rose-950/5'
                                  : 'hover:bg-purple-950/20'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold text-sm ${isCatalogItemTooExpensive ? 'text-slate-500' : 'text-slate-200'}`}>{item.name}</span>
                                  <span className={`text-[9px] border px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${typeBadgeColors[item.type]}`}>
                                    {typeLabels[item.type]}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                                  isCatalogItemTooExpensive
                                    ? 'text-rose-400 bg-rose-950/30 border-rose-900/20'
                                    : 'text-purple-400 bg-purple-950/40 border-purple-800/20'
                                }`}>
                                  {item.cost}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>
                            </button>
                          );
                        })}
                      {allCatalogItems.filter((item: any) => item.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="p-4 text-xs text-slate-500 italic text-center">Nenhum resultado encontrado no catálogo.</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border-t border-slate-800/60 my-4 pt-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                    Ou criar manualmente:
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    value={newAdvName}
                    onChange={(e) => setNewAdvName(e.target.value)}
                    placeholder="Nome da habilidade"
                    className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={newAdvCost}
                    onChange={(e) => setNewAdvCost(e.target.value)}
                    placeholder="Custo (ex: 1, -1, 2)"
                    className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={advType}
                    onChange={(e: any) => setAdvType(e.target.value)}
                    className="bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 text-slate-300"
                  >
                    <option value="advantages">Vantagem</option>
                    <option value="disadvantages">Desvantagem</option>
                    <option value="skills">Perícia</option>
                    <option value="specializations">Especialização</option>
                  </select>
                </div>

                <textarea
                  value={newAdvDesc}
                  onChange={(e) => setNewAdvDesc(e.target.value)}
                  placeholder="Descrição curta do efeito..."
                  rows={2}
                  className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 mb-4"
                />

                <button
                  onClick={() => {
                    const parsedCost = parseInt(newAdvCost, 10) || 0;
                    if (parsedCost > 0 && pointsAvailable < parsedCost) {
                      showToast("Saldo de Pontos Guardados insuficiente.");
                    } else {
                      handleAddAdvantage();
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 transition-all border ${
                    (parseInt(newAdvCost, 10) || 0) > 0 && pointsAvailable < (parseInt(newAdvCost, 10) || 0)
                      ? 'opacity-40 bg-slate-800/20 border-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-500/20 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar ao Personagem
                </button>
              </div>
            )}
          </div>

          {/* Listagem de Habilidades */}
          <div className="space-y-6">
            
            {/* Vantagens & Desvantagens */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Vantagens & Desvantagens
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...(character.advantages || []), ...(character.disadvantages || [])].map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm">
                        {item.name}
                        {item.isModular && item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <span className="text-xs text-slate-400 font-normal">
                            : {item.modifiers
                              ?.filter((m: any) => item.selectedModifiers?.includes(m.id))
                              .map((m: any) => m.name)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-purple-400 bg-purple-950/40 border border-purple-800/30 px-1.5 py-0.5 rounded-full font-bold">
                        {item.cost}
                      </span>
                      {item.description && (
                        <button
                          type="button"
                          onClick={() => setActiveDescriptionItem({
                            name: item.name,
                            cost: item.cost,
                            description: item.description
                          })}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-400 rounded transition-all"
                          title="Ver descrição completa"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingAbilityItem({
                          item,
                          type: character.advantages.some(a => a.id === item.id) ? 'advantages' : 'disadvantages'
                        })}
                        className="p-1 hover:bg-purple-950/20 text-slate-500 hover:text-purple-400 rounded transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdvantage(
                          character.advantages.some(a => a.id === item.id) ? 'advantages' : 'disadvantages',
                          item.id
                        )}
                        className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!character.advantages?.length && !character.disadvantages?.length) && (
                  <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma vantagem ou desvantagem adicionada.</p>
                )}
              </div>
            </div>

            {/* Perícias */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Perícias
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {character.skills?.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm">{item.name}</span>
                      <span className="text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-1.5 py-0.5 rounded-full font-bold">
                        {item.cost}
                      </span>
                      {item.description && (
                        <button
                          type="button"
                          onClick={() => setActiveDescriptionItem({
                            name: item.name,
                            cost: item.cost,
                            description: item.description
                          })}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all"
                          title="Ver descrição completa"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingAbilityItem({
                          item,
                          type: 'skills'
                        })}
                        className="p-1 hover:bg-cyan-950/20 text-slate-500 hover:text-cyan-400 rounded transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdvantage('skills', item.id)}
                        className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!character.skills?.length && (
                  <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma perícia adicionada.</p>
                )}
              </div>
            </div>

            {/* Especializações */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Especializações
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {character.specializations?.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-200 text-sm">{item.name}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-full font-bold">
                        {item.cost}
                      </span>
                      {item.description && (
                        <button
                          type="button"
                          onClick={() => setActiveDescriptionItem({
                            name: item.name,
                            cost: item.cost,
                            description: item.description
                          })}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition-all"
                          title="Ver descrição completa"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingAbilityItem({
                          item,
                          type: 'specializations'
                        })}
                        className="p-1 hover:bg-emerald-950/20 text-slate-500 hover:text-emerald-400 rounded transition-all"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdvantage('specializations', item.id)}
                        className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {!character.specializations?.length && (
                  <p className="text-xs text-slate-500 italic py-2 col-span-full">Nenhuma especialização adicionada.</p>
                )}
              </div>
            </div>

          </div>

          {/* Nova Linha: Rolagens Customizadas & Magias / Inventário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            
            {/* Card de Rolagens Customizadas */}
            <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Rolagens Customizadas
                </h3>
                <button
                  onClick={() => setIsAddingRoll(true)}
                  className="text-xs text-amber-400 bg-amber-950/20 border border-amber-800/35 px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-950/40 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Rolagem
                </button>
              </div>

              {/* Formulário para Nova Rolagem */}
              {isAddingRoll && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                  <span className="text-xs font-bold text-slate-350 block">Nova Rolagem Avançada</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newRollName}
                      onChange={(e) => setNewRollName(e.target.value)}
                      placeholder="Nome do ataque/ação (ex: Espada Flamejante)"
                      className="col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                    />
                    
                    <input
                      type="text"
                      value={newRollDesc}
                      onChange={(e) => setNewRollDesc(e.target.value)}
                      placeholder="Descrição do efeito"
                      className="col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                    />

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Tipo de Ação</label>
                      <select
                        value={newRollType}
                        onChange={(e: any) => setNewRollType(e.target.value)}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300"
                      >
                        <option value="ATTACK">Ataque</option>
                        <option value="DEFENSE">Defesa</option>
                        <option value="MAGIC">Magia</option>
                        <option value="TEST">Teste</option>
                        <option value="INITIATIVE">Iniciativa</option>
                        <option value="OTHER">Outros</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Custo de PM</label>
                      <input
                        type="number"
                        min="0"
                        value={newRollPmCost}
                        onChange={(e) => setNewRollPmCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Atributo 1</label>
                      <select
                        value={newRollPrimaryAttr}
                        onChange={(e) => setNewRollPrimaryAttr(e.target.value)}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                      >
                        <option value="none">Nenhum</option>
                        {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map(k => (
                          <option key={k} value={k}>{systemDef.attributes[k].name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Atributo 2</label>
                      <select
                        value={newRollSecondaryAttr}
                        onChange={(e) => setNewRollSecondaryAttr(e.target.value)}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                      >
                        <option value="none">Nenhum</option>
                        {sortAttributeKeys(Object.keys(systemDef.attributes), systemDef.attributes).map(k => (
                          <option key={k} value={k}>{systemDef.attributes[k].name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block">Mod. Global</label>
                      <input
                        type="number"
                        value={newRollGlobalMod}
                        onChange={(e) => setNewRollGlobalMod(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-sm focus:outline-none text-slate-200"
                      />
                    </div>

                    <div className="space-y-1 flex items-center justify-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newRollAccumulateCrit}
                          onChange={(e) => setNewRollAccumulateCrit(e.target.checked)}
                          className="accent-amber-500"
                        />
                        <span className="text-xs text-slate-300">Acumular Críticos</span>
                      </label>
                    </div>
                  </div>

                  {/* Componentes de Dados */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Componentes de Dados</span>
                      <button
                        onClick={() => setNewRollComponents([...newRollComponents, {
                          id: crypto.randomUUID(),
                          count: 1,
                          faces: 6,
                          bonus: 0,
                          isNegative: false,
                          canCrit: true,
                          critMultiplier: 2
                        }])}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                      >
                        + Add Dados
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newRollComponents.map((comp, idx) => (
                        <div key={comp.id} className="p-3 bg-slate-850/40 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">Grupo #{idx + 1}</span>
                            {newRollComponents.length > 1 && (
                              <button
                                onClick={() => setNewRollComponents(newRollComponents.filter(c => c.id !== comp.id))}
                                className="text-[10px] text-rose-500 hover:text-rose-450 ml-auto font-bold"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-550 block">Qtd</label>
                              <input
                                type="number"
                                min="1"
                                value={comp.count}
                                onChange={(e) => {
                                  const updated = [...newRollComponents];
                                  updated[idx].count = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setNewRollComponents(updated);
                                }}
                                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg py-1 px-2 text-xs text-slate-250"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-550 block">Lados</label>
                              <input
                                type="number"
                                min="2"
                                value={comp.faces}
                                onChange={(e) => {
                                  const updated = [...newRollComponents];
                                  updated[idx].faces = Math.max(2, parseInt(e.target.value, 10) || 6);
                                  setNewRollComponents(updated);
                                }}
                                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg py-1 px-2 text-xs text-slate-250"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-550 block">Bônus</label>
                              <input
                                type="number"
                                value={comp.bonus}
                                onChange={(e) => {
                                  const updated = [...newRollComponents];
                                  updated[idx].bonus = parseInt(e.target.value, 10) || 0;
                                  setNewRollComponents(updated);
                                }}
                                className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg py-1 px-2 text-xs text-slate-250"
                              />
                            </div>
                          </div>
                          <div className="flex gap-4 pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                              <input
                                type="checkbox"
                                checked={comp.isNegative}
                                onChange={(e) => {
                                  const updated = [...newRollComponents];
                                  updated[idx].isNegative = e.target.checked;
                                  setNewRollComponents(updated);
                                }}
                                className="accent-rose-500"
                              />
                              Subtrair
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                              <input
                                type="checkbox"
                                checked={comp.canCrit}
                                onChange={(e) => {
                                  const updated = [...newRollComponents];
                                  updated[idx].canCrit = e.target.checked;
                                  setNewRollComponents(updated);
                                }}
                                className="accent-amber-500"
                              />
                              Pode Crítico
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddingRoll(false)}
                      className="flex-1 bg-slate-850 hover:bg-slate-800 text-xs py-2 rounded-lg font-semibold transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateCustomRoll}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded-lg font-semibold transition-all"
                    >
                      Criar Rolagem
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Rolagens */}
              <div className="space-y-3">
                {(character.custom_rolls || []).map((roll) => (
                  <div key={roll.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center hover:border-amber-500/20 transition-all">
                    <button
                      onClick={() => handleTriggerCustomRoll(roll)}
                      className="flex-1 text-left"
                    >
                      <span className="font-semibold text-slate-200 text-sm block">{roll.name}</span>
                      {roll.description && (
                        <p className="text-xs text-slate-400">{roll.description}</p>
                      )}
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                          {roll.components?.map(c => `${c.count}d${c.faces}`).join(' + ')}
                        </span>
                        {roll.primaryAttribute !== 'none' && (
                          <span className="text-[9px] bg-purple-950/30 text-purple-400 px-2 py-0.5 rounded border border-purple-800/20 uppercase font-mono">
                            +{roll.primaryAttribute}
                          </span>
                        )}
                        {roll.secondaryAttribute !== 'none' && (
                          <span className="text-[9px] bg-cyan-950/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/20 uppercase font-mono">
                            +{roll.secondaryAttribute}
                          </span>
                        )}
                        {roll.globalModifier !== 0 && (
                          <span className="text-[9px] bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/20 font-mono">
                            {roll.globalModifier >= 0 ? `+${roll.globalModifier}` : roll.globalModifier}
                          </span>
                        )}
                        {roll.pmCost !== undefined && roll.pmCost > 0 && (
                          <span className="text-[9px] bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded border border-blue-800/20 font-bold font-mono">
                            {roll.pmCost} PM
                          </span>
                        )}
                        {roll.type && roll.type !== 'OTHER' && (
                          <span className="text-[9px] bg-amber-950/40 text-amber-400 px-2 py-0.5 rounded border border-amber-800/20 font-bold uppercase tracking-wider">
                            {roll.type === 'ATTACK' ? 'Ataque' : 
                             roll.type === 'DEFENSE' ? 'Defesa' : 
                             roll.type === 'MAGIC' ? 'Magia' : 
                             roll.type === 'TEST' ? 'Teste' : 
                             roll.type === 'INITIATIVE' ? 'Iniciativa' : roll.type}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomRoll(roll.id)}
                      className="p-1.5 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {!character.custom_rolls?.length && (
                  <p className="text-xs text-slate-500 italic py-2">Nenhuma rolagem customizada criada.</p>
                )}
              </div>
            </div>

            {/* Card de Magias & Inventário */}
            <div className="space-y-6">
              
              {/* Magias */}
              <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wider block">Magias & Rituais</span>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpellName}
                    onChange={(e) => setNewSpellName(e.target.value)}
                    placeholder="Nome da magia"
                    className="flex-1 min-w-0 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                  />
                  <input
                    type="text"
                    value={newSpellCost}
                    onChange={(e) => setNewSpellCost(e.target.value)}
                    placeholder="Custo (ex: 2 PM)"
                    className="w-20 sm:w-24 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
                  />
                  <button
                    onClick={handleAddSpell}
                    className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-xl shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {(character.spells || []).map((spell) => (
                    <div key={spell.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 text-sm">{spell.name}</span>
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded-full font-bold">
                          {spell.cost}
                        </span>
                        {spell.description && (
                          <button
                            type="button"
                            onClick={() => setActiveDescriptionItem({
                              name: spell.name,
                              cost: spell.cost,
                              description: spell.description
                            })}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-all"
                            title="Ver descrição completa"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSpell(spell.id)}
                        className="p-1 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded transition-all shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {!character.spells?.length && (
                    <p className="text-xs text-slate-500 italic py-1">Nenhuma magia aprendida.</p>
                  )}
                </div>
              </div>

              {/* Inventário */}
              <div className="bg-[#0f172a]/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wider block">Itens & Equipamentos</span>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      placeholder="Nome do item"
                      className="flex-1 min-w-0 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <input
                      type="number"
                      value={newInvQty}
                      onChange={(e) => setNewInvQty(parseInt(e.target.value, 10) || 1)}
                      className="w-16 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newInvBonusAttr}
                      onChange={(e) => setNewInvBonusAttr(e.target.value)}
                      className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-350"
                    >
                      <option value="">Sem bônus de atributo</option>
                      <option value="F">Força (C/C)</option>
                      <option value="H">Habilidade</option>
                      <option value="R">Resistência</option>
                      <option value="A">Armadura</option>
                      <option value="PdF">Poder de Fogo</option>
                    </select>
                    {newInvBonusAttr && (
                      <input
                        type="number"
                        value={newInvBonusVal}
                        onChange={(e) => setNewInvBonusVal(parseInt(e.target.value, 10) || 0)}
                        placeholder="Bônus"
                        className="w-20 bg-slate-800/40 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 shrink-0"
                      />
                    )}
                    <button
                      onClick={handleAddInventory}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 rounded-xl shrink-0 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(character.inventory || []).map((item) => {
                    const isConfirmingDelete = itemToDelete === item.id;
                    return (
                      <div key={item.id} className="p-3 bg-slate-800/20 border border-slate-800/50 rounded-xl flex justify-between items-center gap-4 min-h-[46px]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span 
                              onClick={() => setExpandedItemNameId(expandedItemNameId === item.id ? null : item.id)}
                              className={`font-semibold text-slate-200 text-sm block cursor-pointer transition-all hover:text-white ${
                                expandedItemNameId === item.id ? 'break-words whitespace-normal' : 'truncate'
                              }`}
                              title="Clique para ver o nome completo"
                            >
                              {item.name}
                            </span>
                            
                            {item.bonus_attribute && item.bonus_value !== undefined && (
                              <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                                {item.bonus_value >= 0 ? `+${item.bonus_value}` : item.bonus_value} {
                                  item.bonus_attribute === 'F' ? 'Força' :
                                  item.bonus_attribute === 'H' ? 'Habilidade' :
                                  item.bonus_attribute === 'R' ? 'Resistência' :
                                  item.bonus_attribute === 'A' ? 'Armadura' :
                                  item.bonus_attribute === 'PdF' ? 'Poder de Fogo' : item.bonus_attribute
                                }
                              </span>
                            )}

                            {item.bonus_attribute && (
                              <button
                                type="button"
                                onClick={() => handleToggleEquipInventory(item.id)}
                                className={`text-[9px] px-2 py-0.5 rounded-full border transition-all active:scale-95 cursor-pointer font-bold ${
                                  item.is_equipped
                                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30'
                                    : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                              >
                                {item.is_equipped ? 'Equipado ⚔️' : 'Equipar'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                            <span className="text-[10px] text-rose-400 font-semibold mr-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteInventory(item.id);
                                setItemToDelete(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 rounded-md text-white text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(null)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/60 border border-slate-800 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity === 0) {
                                  setItemToDelete(item.id);
                                } else {
                                  handleUpdateInventoryQty(item.id, item.quantity - 1);
                                }
                              }}
                              className="w-5 h-5 flex items-center justify-center text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-355 hover:text-white transition-all font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-bold font-mono text-slate-200 min-w-[18px] text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateInventoryQty(item.id, item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-355 hover:text-white transition-all font-bold cursor-pointer"
                            >
                              +
                        </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!character.inventory?.length && (
                    <p className="text-xs text-slate-500 italic py-1">Inventário vazio.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

      </main>

      {/* Modal para configurar Vantagem Modular */}
      {selectedCatalogItem && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">{selectedCatalogItem.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{selectedCatalogItem.description}</p>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Selecione os Modificadores:
              </label>
              {(selectedCatalogItem.modifiers || []).map((mod: ModifierOption) => {
                const isChecked = selectedModifiers.includes(mod.id);
                return (
                  <label 
                    key={mod.id} 
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      isChecked 
                        ? 'bg-purple-950/20 border-purple-500/30' 
                        : 'bg-slate-800/20 border-slate-800/40 hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setSelectedModifiers(prev => prev.filter(id => id !== mod.id));
                        } else {
                          setSelectedModifiers(prev => [...prev, mod.id]);
                        }
                      }}
                      className="mt-1 accent-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-200">{mod.name}</span>
                        <span className="text-xs font-mono font-bold text-purple-400">
                          {mod.costPt >= 0 ? `+${mod.costPt}` : mod.costPt} Ponto(s)
                        </span>
                      </div>
                      {mod.description && (
                        <p className="text-xs text-slate-400 mt-1">{mod.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Totalizador */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">Custo Final Estimado:</span>
              <span className="text-base font-black text-purple-400">
                {(() => {
                  const dummyItem: AdvantageItem = {
                    id: 'dummy',
                    name: selectedCatalogItem.name,
                    description: '',
                    cost: 'Modular',
                    isModular: true,
                    baseCostPt: selectedCatalogItem.baseCostPt || 0,
                    modifiers: selectedCatalogItem.modifiers || [],
                    selectedModifiers: selectedModifiers
                  };
                  const cost = computedCostPt(dummyItem);
                  return `${cost} ponto${Math.abs(cost) !== 1 ? 's' : ''}`;
                })()}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedCatalogItem(null);
                  setSelectedModifiers([]);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              {(() => {
                const dummyItem: AdvantageItem = {
                  id: 'dummy',
                  name: selectedCatalogItem.name,
                  description: '',
                  cost: 'Modular',
                  isModular: true,
                  baseCostPt: selectedCatalogItem.baseCostPt || 0,
                  modifiers: selectedCatalogItem.modifiers || [],
                  selectedModifiers: selectedModifiers
                };
                const computedCost = computedCostPt(dummyItem);
                const isModularTooExpensive = computedCost > 0 && pointsAvailable < computedCost;

                return (
                  <button
                    onClick={() => {
                      if (isModularTooExpensive) {
                        showToast("Saldo de Pontos Guardados insuficiente.");
                      } else {
                        handleAddModularItem();
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors border ${
                      isModularTooExpensive
                        ? 'opacity-40 bg-slate-800/20 border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    Confirmar & Adicionar
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
          isBaseSystem={false}
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

      {/* Modal de Preferências de Exibição */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentTheme={currentTheme}
        currentAvatarUrl={avatarUrl}
        currentSectionOrder={sectionOrder}
        onSave={handleSavePreferences}
      />
      </div>

      {/* Printable Sheet Version (A4 High Contrast) */}
      <div className="hidden print:block bg-white text-black p-8 font-sans min-h-screen text-xs leading-relaxed">
        {/* Print Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{character.name}</h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">
              {character.concept || 'Sem Classe'} • {systemDef.name}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl font-mono font-black">{scoreSpent} / {character.points_total} PTs</span>
            <p className="text-[9px] uppercase font-bold text-slate-500 mt-1">Escala: {
              character.scale === 1 ? 'Sugoi (x10)' :
              character.scale === 2 ? 'Kiodai (x100)' :
              character.scale === 3 ? 'Kami (x1000)' : 'Ningen (x1)'
            }</p>
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
