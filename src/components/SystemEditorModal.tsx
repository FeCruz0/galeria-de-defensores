'use client';

import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Search, Upload, X, Check, Layers } from 'lucide-react';
import { validateUniqueNameAndKey, validateFormula, validateDamageType } from '@/lib/validations';

interface SystemEditorModalProps {
  isOpen: boolean;
  systemState: any;
  onSave: (updatedSystem: any) => Promise<void> | void;
  onClose: () => void;
  showSystemModal: (options: { type: 'alert' | 'confirm' | 'info'; title: string; message: string }) => void;
}

export default function SystemEditorModal({
  isOpen,
  systemState,
  onSave,
  onClose,
  showSystemModal
}: SystemEditorModalProps) {
  const [editingSystem, setEditingSystem] = useState<any>(systemState || {});
  const [activeCatalogTab, setActiveCatalogTab] = useState<'advantages' | 'disadvantages' | 'skills'>('advantages');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [jsonImport, setJsonImport] = useState('');

  // Estado para formulário de adição/edição de item do catálogo
  const [catalogItemForm, setCatalogItemForm] = useState<{
    id?: string;
    name: string;
    cost: string;
    description: string;
    isModular: boolean;
    modifiers: Array<{ id: string; name: string; costPt: number; description: string }>;
  }>({
    name: '',
    cost: '1 ponto',
    description: '',
    isModular: false,
    modifiers: []
  });

  const [newModName, setNewModName] = useState('');
  const [newModCostPt, setNewModCostPt] = useState(1);
  const [isEditingCatalogItem, setIsEditingCatalogItem] = useState(false);

  if (!isOpen || !editingSystem) return null;

  // Handlers para Atributos
  const handleAddAttribute = () => {
    const keyInput = document.getElementById('editor-attr-key') as HTMLInputElement;
    const nameInput = document.getElementById('editor-attr-name') as HTMLInputElement;
    const colorSelect = document.getElementById('editor-attr-color') as HTMLSelectElement;

    const key = keyInput?.value?.trim();
    const name = nameInput?.value?.trim();
    const color = colorSelect?.value || 'purple';

    if (!key || !name) {
      showSystemModal({ type: 'alert', title: 'Campos Incompletos', message: 'Preencha chave e nome do atributo.' });
      return;
    }

    const currentList = Object.keys(editingSystem.attributes || {}).map(k => ({
      id: k, key: k, name: editingSystem.attributes[k].name
    }));
    const val = validateUniqueNameAndKey(currentList, key, name);
    if (!val.valid) {
      showSystemModal({ type: 'alert', title: 'Validação', message: val.error || 'Nome ou chave já existe.' });
      return;
    }

    setEditingSystem({
      ...editingSystem,
      attributes: {
        ...(editingSystem.attributes || {}),
        [key]: { name, key, color }
      }
    });

    keyInput.value = '';
    nameInput.value = '';
  };

  const handleRemoveAttribute = (key: string) => {
    const newAttrs = { ...editingSystem.attributes };
    delete newAttrs[key];
    setEditingSystem({ ...editingSystem, attributes: newAttrs });
  };

  // Handlers para Recursos
  const handleAddResource = () => {
    const keyInput = document.getElementById('editor-res-key') as HTMLInputElement;
    const nameInput = document.getElementById('editor-res-name') as HTMLInputElement;
    const formulaInput = document.getElementById('editor-res-formula') as HTMLInputElement;
    const colorSelect = document.getElementById('editor-res-color') as HTMLSelectElement;

    const key = keyInput?.value?.trim();
    const name = nameInput?.value?.trim();
    const formula = formulaInput?.value?.trim() || 'R * 5';
    const color = colorSelect?.value || 'rose';

    if (!key || !name) {
      showSystemModal({ type: 'alert', title: 'Campos Incompletos', message: 'Preencha chave e nome do recurso.' });
      return;
    }

    const attributeKeys = Object.keys(editingSystem.attributes || {});
    const fVal = validateFormula(formula, attributeKeys);
    if (!fVal.valid) {
      showSystemModal({ type: 'alert', title: 'Fórmula Inválida', message: fVal.error || 'Fórmula incorreta.' });
      return;
    }

    const currentList = [
      ...Object.keys(editingSystem.attributes || {}).map(k => ({ id: k, key: k, name: editingSystem.attributes[k].name })),
      ...Object.keys(editingSystem.resources || {}).map(k => ({ id: k, key: k, name: editingSystem.resources[k].name }))
    ];
    const val = validateUniqueNameAndKey(currentList, key, name);
    if (!val.valid) {
      showSystemModal({ type: 'alert', title: 'Validação', message: val.error || 'Nome ou chave já existe.' });
      return;
    }

    setEditingSystem({
      ...editingSystem,
      resources: {
        ...(editingSystem.resources || {}),
        [key]: { name, key, color, formula, baseAttributeKey: attributeKeys[0] || 'R' }
      }
    });

    keyInput.value = '';
    nameInput.value = '';
    formulaInput.value = '';
  };

  const handleRemoveResource = (key: string) => {
    const newRes = { ...editingSystem.resources };
    delete newRes[key];
    setEditingSystem({ ...editingSystem, resources: newRes });
  };

  // Handlers para Tipos de Dano
  const handleAddDamageType = () => {
    const input = document.getElementById('editor-damage-type-input') as HTMLInputElement;
    const val = input?.value || '';
    const check = validateDamageType(editingSystem.damage_types || [], val);
    if (!check.valid) {
      showSystemModal({ type: 'alert', title: 'Validação', message: check.error || 'Tipo de dano inválido.' });
      return;
    }
    setEditingSystem({
      ...editingSystem,
      damage_types: [...(editingSystem.damage_types || []), val.trim()]
    });
    input.value = '';
  };

  const handleRemoveDamageType = (index: number) => {
    const updated = (editingSystem.damage_types || []).filter((_: any, i: number) => i !== index);
    setEditingSystem({ ...editingSystem, damage_types: updated });
  };

  // Handlers para Catálogo (Vantagens, Desvantagens, Perícias)
  const resetCatalogForm = () => {
    setCatalogItemForm({
      name: '',
      cost: activeCatalogTab === 'disadvantages' ? '-1 ponto' : '1 ponto',
      description: '',
      isModular: false,
      modifiers: []
    });
    setIsEditingCatalogItem(false);
    setNewModName('');
    setNewModCostPt(1);
  };

  const handleAddModifierToItem = () => {
    if (!newModName.trim()) return;
    setCatalogItemForm(prev => ({
      ...prev,
      modifiers: [
        ...prev.modifiers,
        { id: `mod-${Date.now()}-${Math.random()}`, name: newModName.trim(), costPt: newModCostPt, description: '' }
      ]
    }));
    setNewModName('');
    setNewModCostPt(1);
  };

  const handleRemoveModifierFromItem = (modId: string) => {
    setCatalogItemForm(prev => ({
      ...prev,
      modifiers: prev.modifiers.filter(m => m.id !== modId)
    }));
  };

  const handleSaveCatalogItem = () => {
    if (!catalogItemForm.name.trim()) {
      showSystemModal({ type: 'alert', title: 'Campo Obrigatório', message: 'O nome do item é obrigatório.' });
      return;
    }

    const currentList: any[] = editingSystem[activeCatalogTab] || [];
    let updatedList: any[];

    if (isEditingCatalogItem && catalogItemForm.id) {
      updatedList = currentList.map(item => item.id === catalogItemForm.id ? {
        ...item,
        name: catalogItemForm.name.trim(),
        cost: catalogItemForm.cost.trim(),
        description: catalogItemForm.description.trim(),
        isModular: catalogItemForm.isModular,
        modifiers: catalogItemForm.isModular ? catalogItemForm.modifiers : undefined
      } : item);
    } else {
      const newItem = {
        id: `sys-${activeCatalogTab}-${Date.now()}`,
        name: catalogItemForm.name.trim(),
        cost: catalogItemForm.cost.trim(),
        description: catalogItemForm.description.trim(),
        isModular: catalogItemForm.isModular,
        modifiers: catalogItemForm.isModular ? catalogItemForm.modifiers : undefined
      };
      updatedList = [...currentList, newItem];
    }

    setEditingSystem({ ...editingSystem, [activeCatalogTab]: updatedList });
    resetCatalogForm();
  };

  const handleEditCatalogItemClick = (item: any) => {
    setCatalogItemForm({
      id: item.id,
      name: item.name,
      cost: item.cost || '1 ponto',
      description: item.description || '',
      isModular: Boolean(item.isModular),
      modifiers: item.modifiers || []
    });
    setIsEditingCatalogItem(true);
  };

  const handleRemoveCatalogItem = (itemId: string) => {
    const currentList: any[] = editingSystem[activeCatalogTab] || [];
    const updatedList = currentList.filter(item => item.id !== itemId);
    setEditingSystem({ ...editingSystem, [activeCatalogTab]: updatedList });
  };

  // Importar JSON
  const handleImportJson = () => {
    if (!jsonImport.trim()) {
      showSystemModal({ type: 'alert', title: 'JSON Vazio', message: 'Cole o conteúdo JSON do sistema.' });
      return;
    }
    try {
      const parsed = JSON.parse(jsonImport);
      if (!parsed.name || !parsed.attributes || !parsed.resources) {
        showSystemModal({ type: 'alert', title: 'JSON Inválido', message: 'O JSON deve conter ao menos "name", "attributes" e "resources".' });
        return;
      }
      setEditingSystem({
        ...editingSystem,
        name: parsed.name,
        description: parsed.description || '',
        attributes: parsed.attributes,
        resources: parsed.resources,
        damage_types: parsed.damage_types || editingSystem.damage_types || [],
        advantages: parsed.advantages || editingSystem.advantages || [],
        disadvantages: parsed.disadvantages || editingSystem.disadvantages || [],
        skills: parsed.skills || editingSystem.skills || []
      });
      setJsonImport('');
      showSystemModal({ type: 'info', title: 'Sucesso', message: 'Configurações importadas para o editor de sistemas!' });
    } catch (err) {
      showSystemModal({ type: 'alert', title: 'Erro de Sintaxe', message: 'O JSON fornecido contém erros de sintaxe.' });
    }
  };

  // Filtragem da lista do catálogo
  const catalogItemsList: any[] = editingSystem[activeCatalogTab] || [];
  const filteredCatalogItems = catalogItemsList.filter(item =>
    item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.description?.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Editar Sistema de Regras Customizado
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              As alterações salvas atualizarão as regras deste sistema no banco de dados para todas as fichas associadas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
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
                  placeholder="Ex: Meu RPG Customizado..."
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
                      onClick={() => handleRemoveAttribute(key)}
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

            <div className="border-t border-slate-800/60 pt-4 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Novo Atributo</span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  id="editor-attr-key"
                  type="text"
                  placeholder="Chave (ex: F, H)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <input
                  id="editor-attr-name"
                  type="text"
                  placeholder="Nome (ex: Força)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <select
                  id="editor-attr-color"
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
                  onClick={handleAddAttribute}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs py-2 transition-all flex items-center justify-center gap-1 cursor-pointer"
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
                      onClick={() => handleRemoveResource(key)}
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

            <div className="border-t border-slate-800/60 pt-4 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Novo Recurso</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input
                  id="editor-res-key"
                  type="text"
                  placeholder="Chave (ex: PV, PM)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <input
                  id="editor-res-name"
                  type="text"
                  placeholder="Nome (ex: Vida)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <input
                  id="editor-res-formula"
                  type="text"
                  placeholder="Fórmula (ex: R * 5)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200 font-mono"
                />
                <select
                  id="editor-res-color"
                  className="bg-slate-850 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300"
                >
                  <option value="rose">Rosa/Vermelho</option>
                  <option value="cyan">Ciano/Azul</option>
                  <option value="emerald">Verde</option>
                  <option value="purple">Roxo</option>
                  <option value="amber">Âmbar</option>
                </select>
                <button
                  onClick={handleAddResource}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs py-2 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Seção 4: Tipos de Dano */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">4. Tipos de Dano</span>
            <div className="flex flex-wrap gap-2">
              {(editingSystem.damage_types || []).map((dtype: string, idx: number) => (
                <span 
                  key={idx} 
                  className="bg-slate-800/60 border border-slate-700/60 text-slate-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                >
                  {dtype}
                  <button
                    type="button"
                    onClick={() => handleRemoveDamageType(idx)}
                    className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(editingSystem.damage_types || []).length === 0 && (
                <span className="text-xs text-slate-500 italic">Nenhum tipo de dano cadastrado.</span>
              )}
            </div>

            <div className="border-t border-slate-800/60 pt-3 flex gap-2">
              <input
                id="editor-damage-type-input"
                type="text"
                placeholder="Novo tipo de dano..."
                className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDamageType();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddDamageType}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs px-4 py-2 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Seção 5: Catálogo de Habilidades (Vantagens, Desvantagens, Perícias) */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-3">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                  5. Catálogo de Habilidades do Sistema
                </span>
                <p className="text-[11px] text-slate-400">
                  Gerencie o modelo global de vantagens, desvantagens e perícias oferecidas neste sistema.
                </p>
              </div>

              {/* Abas */}
              <div className="flex bg-slate-850 border border-slate-700/50 p-1 rounded-xl gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveCatalogTab('advantages'); resetCatalogForm(); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeCatalogTab === 'advantages'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Vantagens ({editingSystem.advantages?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCatalogTab('disadvantages'); resetCatalogForm(); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeCatalogTab === 'disadvantages'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Desvantagens ({editingSystem.disadvantages?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCatalogTab('skills'); resetCatalogForm(); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeCatalogTab === 'skills'
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Perícias ({editingSystem.skills?.length || 0})
                </button>
              </div>
            </div>

            {/* Barra de Busca Rápida */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={`Buscar em ${activeCatalogTab === 'advantages' ? 'Vantagens' : activeCatalogTab === 'disadvantages' ? 'Desvantagens' : 'Perícias'}...`}
                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none text-slate-200"
              />
            </div>

            {/* Lista dos Itens do Catálogo */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredCatalogItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start bg-slate-800/20 border border-slate-800/50 p-3 rounded-xl">
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-200">{item.name}</span>
                      <span className="text-[10px] font-mono font-semibold bg-slate-900/60 border border-slate-700/40 text-purple-300 px-2 py-0.5 rounded-md">
                        {item.cost || 'Grátis'}
                      </span>
                      {item.isModular && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-950/50 border border-purple-800/40 text-purple-400 px-1.5 py-0.5 rounded">
                          Modular
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                    {item.isModular && (item.modifiers || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.modifiers.map((m: any) => (
                          <span key={m.id} className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {m.name} ({m.costPt > 0 ? `+${m.costPt}` : m.costPt}pt)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditCatalogItemClick(item)}
                      className="p-1 text-slate-400 hover:text-purple-400 rounded-md hover:bg-slate-800 transition-colors"
                      title="Editar Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemoveCatalogItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded-md hover:bg-rose-950/10 transition-colors"
                      title="Excluir do Catálogo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredCatalogItems.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 italic bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
                  {catalogSearch ? 'Nenhum item encontrado com o termo buscado.' : 'Nenhum item cadastrado nesta categoria.'}
                </div>
              )}
            </div>

            {/* Formulário Inline para Adicionar / Editar Item no Catálogo */}
            <div className="border-t border-slate-800/60 pt-4 mt-2 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-350 uppercase tracking-wide">
                  {isEditingCatalogItem 
                    ? `Editar Item em ${activeCatalogTab === 'advantages' ? 'Vantagens' : activeCatalogTab === 'disadvantages' ? 'Desvantagens' : 'Perícias'}` 
                    : `Novo Item em ${activeCatalogTab === 'advantages' ? 'Vantagens' : activeCatalogTab === 'disadvantages' ? 'Desvantagens' : 'Perícias'}`}
                </span>
                {isEditingCatalogItem && (
                  <button
                    onClick={resetCatalogForm}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    Cancelar Edição ×
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={catalogItemForm.name}
                  onChange={(e) => setCatalogItemForm({ ...catalogItemForm, name: e.target.value })}
                  placeholder="Nome (ex: Voo, Ataque Especial)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <input
                  type="text"
                  value={catalogItemForm.cost}
                  onChange={(e) => setCatalogItemForm({ ...catalogItemForm, cost: e.target.value })}
                  placeholder="Custo (ex: 1 a 3 pontos, Modular)"
                  className="bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catalogItemForm.isModular}
                      onChange={(e) => setCatalogItemForm({ ...catalogItemForm, isModular: e.target.checked })}
                      className="accent-purple-500"
                    />
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    Item Modular
                  </label>
                </div>
              </div>

              <textarea
                value={catalogItemForm.description}
                onChange={(e) => setCatalogItemForm({ ...catalogItemForm, description: e.target.value })}
                placeholder="Descrição detalhada do efeito da habilidade no sistema..."
                rows={2}
                className="w-full bg-slate-800/30 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-200"
              />

              {/* Construtor de Modificadores (Se for Modular) */}
              {catalogItemForm.isModular && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-3">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                    Modificadores / Opções do Item Modular
                  </span>
                  
                  <div className="flex flex-wrap gap-2">
                    {catalogItemForm.modifiers.map((mod) => (
                      <span key={mod.id} className="bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-2">
                        <span>{mod.name}</span>
                        <span className="font-mono text-purple-400">{mod.costPt > 0 ? `+${mod.costPt}` : mod.costPt}pt</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModifierFromItem(mod.id)}
                          className="text-slate-400 hover:text-rose-400 p-0.5 rounded"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {catalogItemForm.modifiers.length === 0 && (
                      <span className="text-xs text-slate-500 italic">Nenhum modificador adicionado.</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newModName}
                      onChange={(e) => setNewModName(e.target.value)}
                      placeholder="Nome do Modificador (ex: Perigoso)"
                      className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl py-1.5 px-3 text-xs focus:outline-none text-slate-200"
                    />
                    <input
                      type="number"
                      value={newModCostPt}
                      onChange={(e) => setNewModCostPt(parseInt(e.target.value, 10) || 0)}
                      placeholder="Custo pt"
                      className="w-20 bg-slate-800/30 border border-slate-700/50 rounded-xl py-1.5 px-2 text-xs focus:outline-none text-slate-200 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddModifierToItem}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Mod
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveCatalogItem}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs py-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {isEditingCatalogItem ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {isEditingCatalogItem ? 'Atualizar Item no Catálogo' : 'Adicionar Item ao Catálogo'}
              </button>
            </div>
          </div>

          {/* Seção 6: Importação JSON */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <span className="text-xs font-bold text-slate-350 uppercase tracking-wider block">6. Configuração Avançada (JSON)</span>
            <p className="text-xs text-slate-400">Importe a especificação completa em JSON para este sistema de regras.</p>
            <textarea
              value={jsonImport}
              onChange={(e) => setJsonImport(e.target.value)}
              placeholder='Cole o JSON aqui (ex: {"name": "RPG Customizado", "attributes": {...}})'
              rows={4}
              className="w-full bg-slate-800/20 border border-slate-700/50 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-300 font-mono"
            />
            <button
              onClick={handleImportJson}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar Configuração
            </button>
          </div>

        </div>

        {/* Botões de Controle de Salvamento */}
        <div className="flex gap-4 border-t border-slate-800 pt-4 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-350 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(editingSystem)}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Salvar Sistema de Regras
          </button>
        </div>

      </div>
    </div>
  );
}
