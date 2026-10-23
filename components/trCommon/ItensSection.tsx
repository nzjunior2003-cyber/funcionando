import React, { useState, useMemo } from 'react';
import { TrBensItem } from '../../types';
import { AiAssistant } from '../AiAssistant';
import { parseCurrency, formatCurrencyInput, Field, SectionWithHelp as Section, inputClasses } from '../formCommon';
import { TrFormProps } from './common';

// Seções 1 e 2 dos TRs: itens, agrupamento em grupos/lotes, cota ME/EPP e a
// justificativa do agrupamento. `objeto` só muda o texto de apoio ("bem comum" / "serviço comum").
export const ItensSection: React.FC<TrFormProps & { objeto: string }> = ({ data, setData, h, objeto }) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loteInputValue, setLoteInputValue] = useState('');
  const [editingPrice, setEditingPrice] = useState<{[key: string]: string}>({});

  const handleItemChange = (id: string, field: keyof TrBensItem, value: string | number | boolean) => {
    setData((prev: any) => ({
        ...prev,
        itens: prev.itens.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  // Liga/desliga a reserva de cota ME/EPP de UM item avulso (sem grupo).
  // Antes de desmarcar num item de até R$ 80.000,00 — onde a Lei manda ser
  // exclusivo pra ME/EPP — pede uma confirmação, porque isso é uma exceção
  // que precisa estar justificada no processo administrativo (fora desta
  // ferramenta, num despacho do demandante, por exemplo).
  const handleCotaToggle = (item: TrBensItem, checked: boolean) => {
    const valorItem = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
    if (!checked && valorItem <= 80000 && valorItem > 0) {
        const confirmJustificativa = window.confirm("ATENÇÃO: A Lei prevê exclusividade ME/EPP para itens até R$ 80.000,00.\n\nHá justificativa no processo para não atendimento desta previsão legal?");
        if (!confirmJustificativa) return;
    }
    handleItemChange(item.id, 'aplicarCotaMeEpp', checked);
  };

  // Mesma ideia acima, mas pra um GRUPO inteiro de itens: como a regra é
  // calculada em cima do valor total do grupo, ligar/desligar precisa
  // aplicar o mesmo valor a TODOS os itens daquele loteId de uma vez —
  // não faria sentido um item do grupo aplicar a regra e outro não.
  const handleLoteCotaToggle = (loteId: string, checked: boolean, valorLote: number) => {
    if (!checked && valorLote <= 80000 && valorLote > 0) {
        const confirmJustificativa = window.confirm("ATENÇÃO: A Lei prevê exclusividade ME/EPP para Grupos até R$ 80.000,00.\n\nHá justificativa no processo para não atendimento desta previsão legal?");
        if (!confirmJustificativa) return;
    }
    setData((prev: any) => ({
        ...prev,
        itens: prev.itens.map(item => item.loteId === loteId ? { ...item, aplicarCotaMeEpp: checked } : item)
    }));
  };

  const handlePriceInputChange = (id: string, value: string) => {
    let clean = value.replace(/[^\d,]/g, '');
    const parts = clean.split(',');
    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('');
    setEditingPrice(prev => ({ ...prev, [id]: clean }));
  };

  const handlePriceBlur = (id: string, value: string) => {
    const numericValue = parseCurrency(value);
    handleItemChange(id, 'valorUnitario', numericValue);
    setEditingPrice(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
    });
  };

  const addItem = () => {
    const newItem: TrBensItem = { id: Date.now().toString(), grupo: '', item: (data.itens.length + 1).toString(), descricao: '', codigoSimas: '', unidade: '', quantidade: 0, valorUnitario: 0, concorrencia: '', aplicarCotaMeEpp: true };
    setData((prev: any) => ({ ...prev, itens: [...prev.itens, newItem] }));
  };

  const removeItem = (id: string) => {
    setData((prev: any) => ({ ...prev, itens: prev.itens.filter(item => item.id !== id) }));
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        return newSelection;
    });
  };

  const handleAgrupar = () => {
    if (selectedItems.size === 0) {
        alert("Selecione itens para agrupar.");
        return;
    }
    if (!loteInputValue.trim()) {
        alert("Digite o nome ou número do grupo.");
        return;
    }
    setData((prev: any) => ({
        ...prev,
        itens: prev.itens.map(item =>
            selectedItems.has(item.id) ? { ...item, loteId: loteInputValue.trim(), grupo: loteInputValue.trim() } : item
        )
    }));
    setSelectedItems(new Set());
    setLoteInputValue('');
  };

  const handleDesagrupar = () => {
      if (selectedItems.size === 0) {
          alert("Selecione itens para desagrupar.");
          return;
      }
      setData((prev: any) => ({
          ...prev,
          itens: prev.itens.map(item =>
              selectedItems.has(item.id) ? { ...item, loteId: undefined, grupo: '' } : item
          )
      }));
      setSelectedItems(new Set());
  };

  const groupedItens = useMemo(() => {
    const lotes: {[key: string]: TrBensItem[]} = {};
    const ungrouped: TrBensItem[] = [];
    data.itens.forEach(item => {
        if (item.loteId) {
            if (!lotes[item.loteId]) lotes[item.loteId] = [];
            lotes[item.loteId].push(item);
        } else {
            ungrouped.push(item);
        }
    });
    return { lotes, ungrouped };
  }, [data.itens]);

  // --- NOVA INTERFACE EM CARDS PARA OS ITENS ---
  const renderItemCard = (item: TrBensItem) => {
    const isSelected = selectedItems.has(item.id);
    return (
        <div key={item.id} className={`relative flex flex-col p-4 rounded-xl border ${isSelected ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700'} shadow-sm transition-all`}>
            
            {/* Top Bar: Checkbox, Ícone e Grupo */}
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700 dark:text-gray-200">Item</span>
                        <input
                            type="text"
                            value={item.item}
                            onChange={e => handleItemChange(item.id, 'item', e.target.value)}
                            className="w-12 text-center font-bold bg-transparent border-b border-gray-300 focus:border-cbmpa-red outline-none dark:text-white"
                        />
                        {item.loteId && (
                            <span className="ml-2 text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md dark:bg-blue-900 dark:text-blue-200">
                                Grupo {item.loteId}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Remover Item"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Grid Interno do Card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Descrição Full Width */}
                <div className="md:col-span-12">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descrição Detalhada</label>
                    <textarea
                        value={item.descricao}
                        onChange={e => handleItemChange(item.id, 'descricao', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[80px] focus:ring-1 focus:ring-cbmpa-red outline-none resize-y"
                        placeholder="Descreva o objeto..."
                    />
                </div>
                
                {/* Campos Menores */}
                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cód. SIMAS</label>
                    <input
                        type="text"
                        value={item.codigoSimas}
                        onChange={e => handleItemChange(item.id, 'codigoSimas', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-cbmpa-red outline-none text-center"
                        placeholder="Ex: 12345"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Unidade</label>
                    <input
                        type="text"
                        value={item.unidade}
                        onChange={e => handleItemChange(item.id, 'unidade', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-cbmpa-red outline-none text-center"
                        placeholder="Ex: UND"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Quantidade</label>
                    <input
                        type="number"
                        min="0"
                        value={item.quantidade}
                        onChange={e => handleItemChange(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-cbmpa-red outline-none text-center"
                    />
                </div>

                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">V. Unitário (Opcional)</label>
                    <div className="relative flex items-center">
                        <span className="absolute left-3 text-gray-500">R$</span>
                        <input
                            type="text"
                            value={editingPrice[item.id] ?? formatCurrencyInput(item.valorUnitario)}
                            onChange={e => handlePriceInputChange(item.id, e.target.value)}
                            onBlur={e => handlePriceBlur(item.id, e.target.value)}
                            className="w-full py-2 pl-9 pr-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-cbmpa-red outline-none text-right"
                        />
                    </div>
                </div>

                {/* Checkbox de cota ME/EPP — só aparece pra item AVULSO (sem grupo).
                    Itens dentro de um grupo usam o checkbox único do cabeçalho do
                    grupo, porque a regra é calculada em cima do valor do grupo todo. */}
                {!item.loteId && (() => {
                    const valorItem = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
                    const isAboveTeto = valorItem > 4800000;
                    const isExclusivoME = valorItem <= 80000 && valorItem > 0;
                    let cotaMessage = "Aplicar regra de divisão de Cota ME/EPP (25%) neste item";
                    if (isAboveTeto) cotaMessage = "Valor acima do limite (R$ 4,8M). 100% Ampla Concorrência.";
                    else if (isExclusivoME) cotaMessage = "Aplicar exclusividade ME/EPP (Até R$ 80.000,00)";

                    return (
                        <div className={`md:col-span-12 p-2 rounded border ${isAboveTeto ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={item.aplicarCotaMeEpp !== false && !isAboveTeto}
                                    onChange={e => handleCotaToggle(item, e.target.checked)}
                                    disabled={isAboveTeto}
                                    className="h-4 w-4 rounded border-gray-300 text-cbmpa-red focus:ring-cbmpa-red cursor-pointer disabled:opacity-50"
                                />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cotaMessage}</span>
                            </label>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
  };

  return (
    <>
      <Section title="1. O QUE SERÁ CONTRATADO?" instruction={`Indicar o objeto da contratação (${objeto}) e os quantitativos estimados.`}>
        
        {/* Painel de Agrupamento */}
        {selectedItems.size > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm">
                <span className="font-semibold dark:text-blue-200">{selectedItems.size} item(s) selecionado(s)</span>
                <input
                    type="text"
                    value={loteInputValue}
                    onChange={e => setLoteInputValue(e.target.value)}
                    placeholder="Nome/Nº do Grupo"
                    className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button onClick={handleAgrupar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">Agrupar em Grupo</button>
                <button onClick={handleDesagrupar} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">Desagrupar</button>
            </div>
        )}

        {/* Lista de Cards (Substituindo a Tabela) */}
        <div className="space-y-6 mb-6">
            {/* Renderizar Grupos */}
            {Object.keys(groupedItens.lotes).sort().map(loteId => {
                const itensLote = groupedItens.lotes[loteId];
                const valorTotalLote = itensLote.reduce((acc, it) => acc + ((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)), 0);
                const isAboveTeto = valorTotalLote > 4800000;
                const isExclusivoME = valorTotalLote <= 80000 && valorTotalLote > 0;
                const aplicarCota = itensLote[0]?.aplicarCotaMeEpp !== false;

                let cotaMessage = "Aplicar regra de divisão de Cota ME/EPP (25%) neste GRUPO";
                if (isAboveTeto) cotaMessage = "Valor do Grupo acima do limite (R$ 4,8M). 100% Ampla Concorrência.";
                else if (isExclusivoME) cotaMessage = "Aplicar exclusividade ME/EPP (Grupo até R$ 80.000,00)";

                return (
                    <div key={`lote-group-${loteId}`} className="bg-gray-50 dark:bg-gray-800/40 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-lg text-cbmpa-red uppercase tracking-wide mb-4 border-b pb-2 dark:border-gray-600">
                            Grupo: {loteId}
                        </h3>

                        {/* Checkbox único pro grupo inteiro: a regra do art. 48 é calculada
                            em cima do valor somado de todos os itens do grupo, então ligar/
                            desligar aqui aplica o mesmo valor a todo mundo do grupo de uma vez. */}
                        <div className={`mb-4 p-2 rounded border ${isAboveTeto ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={aplicarCota && !isAboveTeto}
                                    onChange={e => handleLoteCotaToggle(loteId, e.target.checked, valorTotalLote)}
                                    disabled={isAboveTeto}
                                    className="h-4 w-4 rounded border-gray-300 text-cbmpa-red focus:ring-cbmpa-red cursor-pointer disabled:opacity-50"
                                />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cotaMessage}</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {itensLote.map(item => renderItemCard(item))}
                        </div>
                    </div>
                );
            })}
            
            {/* Renderizar Itens sem Grupo */}
            {groupedItens.ungrouped.length > 0 && (
                <div className={`${Object.keys(groupedItens.lotes).length > 0 ? 'bg-gray-50 dark:bg-gray-800/40 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm' : ''}`}>
                    {Object.keys(groupedItens.lotes).length > 0 && (
                        <h3 className="font-bold text-lg text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-4 border-b pb-2 dark:border-gray-600">
                            Itens Sem Grupo
                        </h3>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {groupedItens.ungrouped.map(item => renderItemCard(item))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {data.itens.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                    <p className="text-gray-500 dark:text-gray-400 italic">Nenhum item adicionado ainda. Clique no botão abaixo para começar.</p>
                </div>
            )}
        </div>

        <button onClick={addItem} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm shadow transition transform active:scale-95">➕ Adicionar Novo Item</button>
      </Section>

      {Object.keys(groupedItens.lotes).length > 0 && (
        <Section title="2. JUSTIFICATIVA PARA O AGRUPAMENTO" instruction="Justificar como foi formado o grupo, indicando as razões técnicas que justificam o agrupamento ou a economia de escala que se espera obter.">
          <Field label="Justificativa" note="Se a licitação for apenas por item(ns), preencha com 'não se aplica'.">
              <div className="relative">
                  <textarea name="justificativaAgrupamento" value={data.justificativaAgrupamento} onChange={h.handleChange} className={`${inputClasses} h-24 pr-10`} />
                  <AiAssistant fieldName="Justificativa para Agrupamento de Itens" onGeneratedText={(t) => setData((prev: any) => ({...prev, justificativaAgrupamento: t}))} />
              </div>
          </Field>
        </Section>
      )}
    </>
  );
};
