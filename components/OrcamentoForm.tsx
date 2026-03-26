import React, { useEffect, useState, useMemo } from 'react';
import { OrcamentoData, OrcamentoItemGroup } from '../types';
import { AiAssistant } from './AiAssistant';

interface OrcamentoFormProps {
  data: OrcamentoData;
  setData: React.Dispatch<React.SetStateAction<OrcamentoData>>;
}

const Section: React.FC<{ title: string, children: React.ReactNode, instruction?: string }> = ({ title, children, instruction }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-700/50 dark:border-gray-600">
        <h2 className="text-xl font-bold text-cbmpa-red mb-4 pb-2 border-b-2 border-cbmpa-red">{title}</h2>
        {instruction && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">{instruction}</p>}
        {children}
    </div>
);

const Field: React.FC<{ label: string, required?: boolean, children: React.ReactNode, note?: string }> = ({ label, required, children, note }) => (
    <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{note}</p>}
    </div>
);

const RadioGroup: React.FC<{ name: keyof OrcamentoData, value: string | undefined, options: {val: string, label: string}[], onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, value, options, onChange }) => (
    <div className="flex flex-col gap-y-2">
        {options.map(opt => (
            <div key={opt.val} className="flex items-start">
                <input type="radio" id={`${name}-${opt.val}`} name={name} value={opt.val} checked={value === opt.val} onChange={onChange} className="mr-2 h-4 w-4 cursor-pointer"/>
                <label htmlFor={`${name}-${opt.val}`} className="dark:text-gray-300 cursor-pointer">{opt.label}</label>
            </div>
        ))}
    </div>
);

const parseValue = (value: string | number | undefined, tipoValor: 'moeda' | 'percentual' = 'moeda'): number | null => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return value;

    let strVal = value.toString().trim();
    strVal = strVal.replace(/[R$%\s]/g, ''); 
    strVal = strVal.replace(/[^\d,.-]/g, ''); 

    if (strVal.includes(',')) {
        strVal = strVal.replace(/\./g, '').replace(',', '.');
    } else if (strVal.includes('.')) {
        const parts = strVal.split('.');
        if (parts[parts.length - 1].length === 3) {
            strVal = strVal.replace(/\./g, '');
        }
    }

    const num = parseFloat(strVal);
    return isNaN(num) ? null : num;
};

const formatCurrencyInput = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const calculateEstimate = (prices: (string | undefined)[], methodology: 'menor' | 'media' | 'mediana' | string, tipoValor: 'moeda' | 'percentual' = 'moeda'): number => {
  const validPrices = prices.map(p => parseValue(p, tipoValor)).filter((p): p is number => p !== null && (tipoValor === 'percentual' || p > 0));
  if (validPrices.length === 0) return 0;

  const safeMethodology = methodology || 'media';
  switch (safeMethodology) {
    case 'menor': return Math.min(...validPrices);
    case 'media': return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    case 'mediana':
      const sorted = [...validPrices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    default: return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  }
};

const orcamentoCargoOptions = [
    'Vol. Civil', 'SD QBM', 'CB QBM', '3° SGT QBM', '2° SGT QBM', '1° SGT QBM', 'ST QBM',
    '2° TEN QOBM', '2° TEN QOABM', '1° TEN QOBM', '1° TEN QOABM',
    'CAP QOBM', 'CAP QOABM', 'MAJ QOBM', 'MAJ QOABM',
    'TEN CEL QOBM', 'TEN CEL QOCBM', 'TEN CEL QOSBM',
    'CEL QOCBM', 'CEL QOSBM', 'CEL QOBM'
];

const allFontesOptions = [
    { val: 'simas', label: 'Simas' },
    { val: 'nfe', label: 'Base Nacional de Notas fiscais Eletrônicas' },
    { val: 'pncp', label: 'Portal Nacional de Compras Públicas - PNCP' },
    { val: 'siteEspecializado', label: 'Mídia especializada' },
    { val: 'contratacaoSimilar', label: 'Contratações Similares feitas pela administração pública' },
    { val: 'direta', label: 'Pesquisa direta com fornecedor' }
];

const ATA_SRP_OPTION = { val: 'preco_ata_srp', label: 'Preço da ATA de SRP' };

const ufOptions = [
    { val: 'AC', label: 'Acre' }, { val: 'AL', label: 'Alagoas' }, { val: 'AP', label: 'Amapá' },
    { val: 'AM', label: 'Amazonas' }, { val: 'BA', label: 'Bahia' }, { val: 'CE', label: 'Ceará' },
    { val: 'DF', label: 'Distrito Federal' }, { val: 'ES', label: 'Espírito Santo' }, { val: 'GO', label: 'Goiás' },
    { val: 'MA', label: 'Maranhão' }, { val: 'MT', label: 'Mato Grosso' }, { val: 'MS', label: 'Mato Grosso do Sul' },
    { val: 'MG', label: 'Minas Gerais' }, { val: 'PA', label: 'Pará' }, { val: 'PB', label: 'Paraíba' },
    { val: 'PR', label: 'Paraná' }, { val: 'PE', label: 'Pernambuco' }, { val: 'PI', label: 'Piauí' },
    { val: 'RJ', label: 'Rio de Janeiro' }, { val: 'RN', label: 'Rio Grande do Norte' }, { val: 'RS', label: 'Rio Grande do Sul' },
    { val: 'RO', label: 'Rondônia' }, { val: 'RR', label: 'Roraima' }, { val: 'SC', label: 'Santa Catarina' },
    { val: 'SP', label: 'São Paulo' }, { val: 'SE', label: 'Sergipe' }, { val: 'TO', label: 'Tocantins' }
];

const ItemForm: React.FC<{
    group: OrcamentoItemGroup;
    onRemove: (id: string) => void;
    onGroupChange: (id: string, field: keyof OrcamentoItemGroup, value: any) => void;
    inputClasses: string;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    tipoOrcamento: string;
    precos: any[];
    precosIncluidos: Record<string, boolean>;
    fontesDisponiveis: {val: string, label: string}[];
    onAddPrice: (itemGroupId: string, source: string) => void;
    onPriceChange: (itemGroupId: string, priceId: string, value: string) => void;
    onRemovePrice: (itemGroupId: string, priceId: string) => void;
    onTogglePriceInclusion: (priceId: string, included: boolean) => void;
    valorReferencia: number;
    isLoteItem?: boolean;
}> = ({ group, onRemove, onGroupChange, inputClasses, isSelected, onToggleSelect, tipoOrcamento, precos, precosIncluidos, fontesDisponiveis, onAddPrice, onPriceChange, onRemovePrice, onTogglePriceInclusion, valorReferencia, isLoteItem }) => {
    
    const [localPrice, setLocalPrice] = useState(group.estimativaUnitaria ? formatCurrencyInput(group.estimativaUnitaria) : '');
    const [contractPrice, setContractPrice] = useState(group.valorUnitarioContrato ? formatCurrencyInput(group.valorUnitarioContrato) : '');

    useEffect(() => { setLocalPrice(group.estimativaUnitaria ? formatCurrencyInput(group.estimativaUnitaria) : ''); }, [group.estimativaUnitaria]);
    useEffect(() => { setContractPrice(group.valorUnitarioContrato ? formatCurrencyInput(group.valorUnitarioContrato) : ''); }, [group.valorUnitarioContrato]);

    const handlePriceBlur = () => {
        const numericVal = parseValue(localPrice, group.tipoValor) || 0;
        onGroupChange(group.id, 'estimativaUnitaria', numericVal);
        setLocalPrice(formatCurrencyInput(numericVal));
    };

    const handleContractPriceBlur = () => {
        const numericVal = parseValue(contractPrice, group.tipoValor) || 0;
        onGroupChange(group.id, 'valorUnitarioContrato', numericVal);
        setContractPrice(formatCurrencyInput(numericVal));
    };

    const handleCotaToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        if (!isChecked && valorReferencia <= 80000 && valorReferencia > 0) {
            const confirmJustificativa = window.confirm("ATENÇÃO: A Lei prevê exclusividade ME/EPP para itens/lotes até R$ 80.000,00.\n\nHá justificativa no processo para não atendimento desta previsão legal?");
            if (!confirmJustificativa) return;
        }
        onGroupChange(group.id, 'aplicarCotaMeEpp', isChecked);
    };

    const isAditivo = tipoOrcamento === 'aditivo_contratual';
    
    // AQUI ESTAVA O PROBLEMA! O valorGlobal foi removido da trava. O Teto avalia apenas o Item ou o Lote individualmente!
    const isAboveTeto = valorReferencia > 4800000;
    const isExclusivoME = valorReferencia <= 80000 && valorReferencia > 0;
    
    const valorTotalItem = (Number(group.quantidadeTotal) || 0) * (Number(group.estimativaUnitaria) || 0);

    let cotaMessage = "Aplicar regra de divisão de Cota ME/EPP (25%) neste item";
    if (isAboveTeto) cotaMessage = "Valor acima do limite (R$ 4,8M). 100% AMPLA Concorrência.";
    else if (isExclusivoME) cotaMessage = "Aplicar exclusividade ME/EPP (Até R$ 80.000,00)";

    return (
        <div className={`border rounded-lg mb-6 transition-all shadow-sm ${isSelected ? 'border-cbmpa-blue-start bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'}`}>
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {tipoOrcamento !== 'gerenciador_ata' && tipoOrcamento !== 'adesao_ata' && tipoOrcamento !== 'aditivo_contratual' && (
                            <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(group.id)} className="h-5 w-5 rounded border-gray-300 text-cbmpa-blue-start focus:ring-cbmpa-blue-start cursor-pointer" title="Selecionar para agrupar"/>
                        )}
                        <span className="font-bold text-gray-700 dark:text-gray-300 text-lg">Item {group.itemTR}</span>
                        {group.loteId && !isLoteItem && <span className="bg-cbmpa-blue-end text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">Lote: {group.loteId}</span>}
                    </div>
                    <button onClick={() => onRemove(group.id)} className="text-red-600 hover:text-red-800 text-sm font-bold flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-md">
                        🗑️ <span className="hidden sm:inline">Remover</span>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Descrição Detalhada</label>
                        <div className="relative">
                            <textarea value={group.descricao} onChange={(e) => onGroupChange(group.id, 'descricao', e.target.value)} className={`${inputClasses} min-h-[80px] pr-10`} />
                            <AiAssistant fieldName={`Descrição do Item ${group.itemTR}`} onGeneratedText={(text) => onGroupChange(group.id, 'descricao', text)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Código SIMAS</label>
                            <input type="text" value={group.codigoSimas} onChange={(e) => onGroupChange(group.id, 'codigoSimas', e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Unidade</label>
                            <input type="text" value={group.unidade} onChange={(e) => onGroupChange(group.id, 'unidade', e.target.value)} className={inputClasses} placeholder="Ex: UN, CX, KG" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                {tipoOrcamento === 'gerenciador_ata' ? 'Quantidade Solicitada' : 'Quantidade Original (Contrato)'}
                            </label>
                            <input type="number" value={group.quantidadeTotal || ''} onChange={(e) => onGroupChange(group.id, 'quantidadeTotal', parseFloat(e.target.value) || 0)} className={inputClasses} />
                        </div>

                        {!isLoteItem && tipoOrcamento !== 'gerenciador_ata' && tipoOrcamento !== 'adesao_ata' && tipoOrcamento !== 'aditivo_contratual' && (
                            <div className={`col-span-2 mt-1 mb-1 p-2 rounded border ${isAboveTeto ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700/50'}`}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={group.aplicarCotaMeEpp !== false && !isAboveTeto} 
                                        onChange={handleCotaToggle}
                                        disabled={isAboveTeto}
                                        className="h-4 w-4 rounded border-gray-300 text-cbmpa-red focus:ring-cbmpa-red cursor-pointer disabled:opacity-50"
                                    />
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cotaMessage}</span>
                                </label>
                            </div>
                        )}
                        
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Tipo de Valor da Pesquisa</label>
                            <select value={group.tipoValor || 'moeda'} onChange={(e) => onGroupChange(group.id, 'tipoValor', e.target.value)} className={inputClasses}>
                                <option value="moeda">Moeda (R$)</option>
                                <option value="percentual">Percentual (%)</option>
                            </select>
                        </div>

                        {tipoOrcamento === 'gerenciador_ata' && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300 text-green-700 dark:text-green-400">Valor Unitário Registrado (R$)</label>
                                <input type="text" value={localPrice} onChange={(e) => setLocalPrice(e.target.value.replace(/[^\d,]/g, ''))} onBlur={handlePriceBlur} className={inputClasses} placeholder="0,00" />
                            </div>
                        )}

                        {isAditivo && (
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1 text-blue-600 dark:text-blue-400">Valor Unit. Contrato (R$)</label>
                                <input type="text" value={contractPrice} onChange={(e) => setContractPrice(e.target.value.replace(/[^\d,]/g, ''))} onBlur={handleContractPriceBlur} className={inputClasses} placeholder="0,00" />
                            </div>
                        )}
                    </div>
                    
                    {!isLoteItem && tipoOrcamento !== 'gerenciador_ata' && tipoOrcamento !== 'adesao_ata' && tipoOrcamento !== 'aditivo_contratual' && group.cotas && group.cotas.length > 0 && (
                        <div className="col-span-1 md:col-span-2 mt-2 bg-gray-50 dark:bg-gray-700/30 p-2 rounded text-xs border dark:border-gray-600">
                            <span className="font-bold text-gray-600 dark:text-gray-300">Distribuição Final do Item:</span>
                            <div className="flex gap-4 mt-1">
                                {group.cotas.map((c, idx) => (
                                    <span key={idx} className={`${c.tipo?.includes('ME/EPP') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {c.tipo}: <strong>{c.quantidade}</strong>
                                    </span>
                                ))}
                            </div>
                            {group.aplicarCotaMeEpp === false && !isAboveTeto && <div className="text-cbmpa-red font-bold mt-1">Item assinalado manualmente como AMPLA concorrência.</div>}
                        </div>
                    )}
                </div>
            </div>

            {tipoOrcamento !== 'gerenciador_ata' && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 rounded-b-lg">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><span>🛒</span> Preços da Pesquisa</h4>
                        <select 
                            className="p-2 text-sm border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 cursor-pointer bg-white text-gray-800 dark:text-gray-200 shadow-sm font-semibold"
                            onChange={(e) => { if (e.target.value) { onAddPrice(group.id, e.target.value); e.target.value = ""; } }}
                        >
                            <option value="">➕ Selecionar Fonte para Adicionar</option>
                            {tipoOrcamento === 'adesao_ata' && <option value={ATA_SRP_OPTION.val}>{ATA_SRP_OPTION.label}</option>}
                            {fontesDisponiveis.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                        {precos.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4 bg-white dark:bg-gray-800 rounded border border-dashed dark:border-gray-600">Nenhum preço inserido neste item.</p>}
                        {precos.map(p => (
                            <div key={p.id} className="flex flex-wrap items-center gap-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm hover:border-cbmpa-blue-start transition-colors">
                                <div className="flex-1 min-w-[150px]">
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                        {p.source === ATA_SRP_OPTION.val ? ATA_SRP_OPTION.label : (fontesDisponiveis.find(f => f.val === p.source)?.label || p.source)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-bold">{group.tipoValor === 'percentual' ? '%' : 'R$'}</span>
                                    <input type="text" value={p.value} onChange={(e) => onPriceChange(group.id, p.id, e.target.value)} placeholder="0,00" className="w-32 p-2 text-sm font-bold border border-gray-300 rounded text-right dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-cbmpa-red outline-none"/>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-700/50 px-2 py-1.5 rounded">
                                    <input type="checkbox" checked={precosIncluidos[p.id] ?? true} onChange={(e) => onTogglePriceInclusion(p.id, e.target.checked)} className="h-4 w-4 text-cbmpa-blue-start rounded border-gray-300 cursor-pointer"/>
                                    <span className="text-sm font-medium dark:text-gray-300">Incluir</span>
                                </label>
                                <button onClick={() => onRemovePrice(group.id, p.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded transition-colors text-sm font-bold ml-auto" title="Remover preço">Remover</button>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 flex flex-wrap justify-end items-center gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-md shadow-sm border border-gray-300 dark:border-gray-600">
                            Unitário: {group.tipoValor === 'percentual' ? `${(group.estimativaUnitaria || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : (group.estimativaUnitaria || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {group.tipoValor !== 'percentual' && (
                            <span className="text-sm font-bold text-cbmpa-red bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-md shadow-sm border border-red-100 dark:border-red-800">
                                Total do Item: {valorTotalItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const OrcamentoForm: React.FC<OrcamentoFormProps> = ({ data, setData }) => {
  const inputClasses = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400";
  
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loteName, setLoteName] = useState('');
  const [novoFornecedor, setNovoFornecedor] = useState<{nome: string, justificativa: string}>({ nome: '', justificativa: '' });

  const triggerProps = JSON.stringify({
      precos: data.precosEncontrados,
      incluidos: data.precosIncluidos,
      metodologia: data.metodologia,
      modalidade: data.modalidadeLicitacao,
      tipoOrcamento: data.tipoOrcamento,
      itensProps: (data.itemGroups || []).map(g => ({
          id: g.id,
          qtd: Number(g.quantidadeTotal) || 0,
          loteId: g.loteId,
          aplicarCota: g.aplicarCotaMeEpp,
          tipoValor: g.tipoValor
      }))
  });

  useEffect(() => {
      if (data.tipoOrcamento === 'gerenciador_ata') return;

      setData(prevData => {
          let hasChanges = false;
          const currentGroups = (prevData.itemGroups || []).map(g => ({...g}));

          // 1. Calcular Preços
          if (['licitacao', 'dispensa_licitacao', 'adesao_ata', 'aditivo_contratual'].includes(prevData.tipoOrcamento || '')) {
              currentGroups.forEach(group => {
                  const itemPrices = prevData.precosEncontrados?.[group.id] || [];
                  const includedPrices = itemPrices.filter(p => prevData.precosIncluidos?.[p.id] ?? true);
                  const newEstimate = calculateEstimate(includedPrices.map(p => p.value), prevData.metodologia, group.tipoValor || 'moeda');
                  
                  if (group.estimativaUnitaria !== newEstimate) {
                      group.estimativaUnitaria = newEstimate;
                      hasChanges = true;
                  }
              });
          }

          // 2. Calcular Cotas
          if (prevData.tipoOrcamento !== 'adesao_ata' && prevData.tipoOrcamento !== 'aditivo_contratual') {
              const LIMITE_SRP_COTA = 80000;
              const TETO_VALOR_LOTE = 4800000;
              const PERCENTUAL_COTA = 0.25;

              const lotes: Record<string, typeof currentGroups> = {};
              const itemsWithoutLote: typeof currentGroups = [];

              currentGroups.forEach(item => {
                  if (item.loteId) {
                      if (!lotes[item.loteId]) lotes[item.loteId] = [];
                      lotes[item.loteId].push(item);
                  } else {
                      itemsWithoutLote.push(item);
                  }
              });

              const processItems = (items: typeof currentGroups) => {
                  const valorTotal = items.reduce((acc, item) => acc + ((Number(item.quantidadeTotal) || 0) * (Number(item.estimativaUnitaria) || 0)), 0);
                  const aplicarCotaMeEpp = items[0]?.aplicarCotaMeEpp !== false;

                  let tipoCotaUnica = '';
                  let divideCota = false;

                  // AQUI ESTÁ A CORREÇÃO: Removido o 'valorGlobal > TETO_VALOR_LOTE'. A trava de 4.8M avalia apenas o valorTotal do ITEM ou do LOTE!
                  if (valorTotal > TETO_VALOR_LOTE || !aplicarCotaMeEpp) {
                      tipoCotaUnica = 'AMPLA CONCORRÊNCIA';
                  } else if (valorTotal <= 80000 && valorTotal > 0) {
                      tipoCotaUnica = 'EXCLUSIVA ME/EPP';
                  } else {
                      divideCota = true;
                  }

                  let percentualEfetivoCota = 0;
                  if (divideCota) {
                      let valorCotaCalculada = valorTotal * PERCENTUAL_COTA;
                      if (prevData.modalidadeLicitacao === 'pregao_eletronico_rp' && valorCotaCalculada > LIMITE_SRP_COTA) {
                          valorCotaCalculada = LIMITE_SRP_COTA;
                      }
                      if (valorTotal > 0) percentualEfetivoCota = valorCotaCalculada / valorTotal;
                  }

                  items.forEach(item => {
                      let novasCotas = [];
                      if (!divideCota) {
                          novasCotas = [{ id: tipoCotaUnica === 'AMPLA CONCORRÊNCIA' ? 'ampla' : 'cota', ordemTR: '1', tipo: tipoCotaUnica, quantidade: Number(item.quantidadeTotal) || 0 }];
                      } else {
                          const qtdCota = Math.floor((Number(item.quantidadeTotal) || 0) * percentualEfetivoCota);
                          const qtdAmpla = (Number(item.quantidadeTotal) || 0) - qtdCota;
                          novasCotas = [
                              { id: 'ampla', ordemTR: '1', tipo: 'AMPLA CONCORRÊNCIA', quantidade: qtdAmpla },
                              ...(qtdCota > 0 ? [{ id: 'cota', ordemTR: '2', tipo: 'COTA RESERVADA ME/EPP', quantidade: qtdCota }] : [])
                          ];
                      }

                      if (JSON.stringify(item.cotas) !== JSON.stringify(novasCotas)) {
                          item.cotas = novasCotas;
                          hasChanges = true;
                      }
                  });
              };

              Object.values(lotes).forEach(loteItems => processItems(loteItems));
              itemsWithoutLote.forEach(item => processItems([item]));
          }

          return hasChanges ? { ...prevData, itemGroups: currentGroups } : prevData;
      });
  }, [triggerProps]); 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    if (name === 'fontesPesquisa') {
         setData(prev => {
            const currentArr = prev.fontesPesquisa || [];
            const newFontes = checked ? [...currentArr, value] : currentArr.filter(v => v !== value);
            const newPrecos = { ...(prev.precosEncontrados || {}) };
            
            if (checked) {
                (prev.itemGroups || []).forEach(g => {
                    const existing = newPrecos[g.id] || [];
                    if (!existing.some(p => p.source === value)) {
                        newPrecos[g.id] = [...existing, { id: Date.now().toString() + Math.random().toString(36).substring(2,9), source: value, value: '' }];
                    }
                });
            } else {
                 Object.keys(newPrecos).forEach(gId => { newPrecos[gId] = newPrecos[gId].filter(p => p.source !== value); });
            }
            return { ...prev, fontesPesquisa: newFontes, precosEncontrados: newPrecos };
         });
         return;
    }
    setData(prev => {
        const field = name as keyof OrcamentoData;
        const currentArr = (prev[field] as string[]) || [];
        return { ...prev, [name]: checked ? [...currentArr, value] : currentArr.filter(v => v !== value) };
    });
  };
  
  const handleGroupChange = (id: string, field: keyof OrcamentoItemGroup, value: any) => setData(prev => ({ ...prev, itemGroups: (prev.itemGroups || []).map(group => group.id === id ? { ...group, [field]: value } : group) }));

  const handleLoteCotaToggle = (loteId: string, checked: boolean, valorLote: number) => {
      if (!checked && valorLote <= 80000 && valorLote > 0) {
          const confirmJustificativa = window.confirm("ATENÇÃO: A Lei prevê exclusividade ME/EPP para Lotes até R$ 80.000,00.\n\nHá justificativa no processo para não atendimento desta previsão legal?");
          if (!confirmJustificativa) return;
      }
      setData(prev => ({
          ...prev,
          itemGroups: (prev.itemGroups || []).map(g => g.loteId === loteId ? { ...g, aplicarCotaMeEpp: checked } : g)
      }));
  };

  const handleAditivoCalculation = (id: string, type: 'pct' | 'qtd' | 'total', rawValue: string) => {
    const cleanValue = rawValue.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const value = parseFloat(cleanValue) || 0;

    setData(prev => {
        return {
            ...prev,
            itemGroups: (prev.itemGroups || []).map(item => {
                if (item.id !== id) return item;
                const qtdOriginal = item.quantidadeTotal || 0;
                const vUnitContrato = item.valorUnitarioContrato || 0;
                const pctReajuste = (prev.haveraReajuste === 'sim' ? (prev.porcentagemReajuste || 0) : 0);
                const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100);

                if (vUnitReajustado === 0) return item; 
                let newQtd = 0; let newPct = 0; let newTotal = 0;

                if (type === 'qtd') { newQtd = value; newTotal = newQtd * vUnitReajustado; newPct = qtdOriginal > 0 ? (newQtd / qtdOriginal) * 100 : 0; }
                else if (type === 'pct') { newPct = value; newQtd = (qtdOriginal * newPct) / 100; newTotal = newQtd * vUnitReajustado; }
                else if (type === 'total') { newTotal = value; newQtd = newTotal / vUnitReajustado; newPct = qtdOriginal > 0 ? (newQtd / qtdOriginal) * 100 : 0; }

                return { ...item, aditivoQuantidade: newQtd, aditivoPercentual: newPct, aditivoValorTotal: newTotal };
            })
        };
    });
  };

  const addGroup = () => {
      const newId = Date.now().toString() + Math.random().toString(36).substring(2,9);
      const newItem: OrcamentoItemGroup = { 
          id: newId, itemTR: ((data.itemGroups || []).length + 1).toString(), descricao: '', estimativaUnitaria: 0, codigoSimas: '', unidade: '', quantidadeTotal: 0, cotas: [], aplicarCotaMeEpp: true 
      };
      setData(prev => {
          const initialPrices = (prev.fontesPesquisa || []).map(source => ({ id: Date.now().toString() + Math.random().toString(36).substring(2,9), source, value: '' }));
          return { ...prev, itemGroups: [...(prev.itemGroups || []), newItem], precosEncontrados: { ...(prev.precosEncontrados || {}), [newId]: initialPrices } };
      });
  };

  const removeGroup = (id: string) => setData(prev => ({ ...prev, itemGroups: (prev.itemGroups || []).filter(g => g.id !== id) }));
  const addPrice = (itemGroupId: string, source: string) => setData(prev => ({ ...prev, precosEncontrados: { ...(prev.precosEncontrados || {}), [itemGroupId]: [...((prev.precosEncontrados || {})[itemGroupId] || []), { id: Date.now().toString() + Math.random().toString(36).substring(2,9), source, value: '' }] } }));
  const handlePriceChange = (itemGroupId: string, priceId: string, value: string) => setData(prev => ({ ...prev, precosEncontrados: { ...(prev.precosEncontrados || {}), [itemGroupId]: ((prev.precosEncontrados || {})[itemGroupId] || []).map(p => p.id === priceId ? {...p, value} : p) } }));
  const removePrice = (itemGroupId: string, priceId: string) => setData(prev => ({ ...prev, precosEncontrados: { ...(prev.precosEncontrados || {}), [itemGroupId]: ((prev.precosEncontrados || {})[itemGroupId] || []).filter(p => p.id !== priceId) } }));
  const handleInclusionChange = (pId: string, inc: boolean) => setData(prev => ({ ...prev, precosIncluidos: { ...(prev.precosIncluidos || {}), [pId]: inc } }));

  const toggleSelect = (id: string) => { setSelectedItemIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); };

  const handleAgruparLote = () => {
      if (selectedItemIds.size === 0) { alert('Selecione pelo menos um item para agrupar.'); return; }
      if (!loteName.trim()) { alert('Digite um nome ou número para o Lote.'); return; }
      setData(prev => ({ ...prev, itemGroups: (prev.itemGroups || []).map(item => selectedItemIds.has(item.id) ? { ...item, loteId: loteName.trim() } : item) }));
      setSelectedItemIds(new Set()); setLoteName('');
  };

  const handleDesagrupar = () => {
      if (selectedItemIds.size === 0) { alert('Selecione os itens que deseja desagrupar.'); return; }
      setData(prev => ({ ...prev, itemGroups: (prev.itemGroups || []).map(item => selectedItemIds.has(item.id) ? { ...item, loteId: undefined } : item) }));
      setSelectedItemIds(new Set());
  };

  const handleAddFornecedor = () => {
      if (!novoFornecedor.nome || !novoFornecedor.justificativa) { alert("Preencha o nome e a justificativa para adicionar."); return; }
      setData(prev => ({ ...prev, fornecedoresDiretos: [ ...(prev.fornecedoresDiretos || []), { id: Date.now().toString(), nome: novoFornecedor.nome, justificativa: novoFornecedor.justificativa, requisitos: 'sim' } ] }));
      setNovoFornecedor({ nome: '', justificativa: '' });
  };

  const handleRemoveFornecedor = (id: string) => setData(prev => ({ ...prev, fornecedoresDiretos: (prev.fornecedoresDiretos || []).filter(f => f.id !== id) }));

  const sortedItems = useMemo(() => {
      return [...(data.itemGroups || [])].sort((a, b) => {
          if (a.loteId && !b.loteId) return -1;
          if (!a.loteId && b.loteId) return 1;
          if (a.loteId && b.loteId) { const loteCompare = a.loteId.localeCompare(b.loteId, undefined, { numeric: true }); if (loteCompare !== 0) return loteCompare; }
          return (parseInt(a.itemTR) || 0) - (parseInt(b.itemTR) || 0);
      });
  }, [data.itemGroups]);

  const selectedFontes = useMemo(() => allFontesOptions.filter(o => (data.fontesPesquisa || []).includes(o.val)), [data.fontesPesquisa]);
  const isOnlyDireta = (data.fontesPesquisa || []).length === 1 && (data.fontesPesquisa || []).includes('direta');

  const currentPaeParts = data.pae ? data.pae.split('/') : [];
  const currentYear = currentPaeParts[0] || '2025';
  const currentNum = currentPaeParts[1] || '';

  const handlePaeYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const newYear = e.target.value; setData(prev => ({...prev, pae: `${newYear}/${currentNum}`})); };
  const handlePaeNumChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newNum = e.target.value.replace(/\D/g, ''); setData(prev => ({...prev, pae: `${currentYear}/${newNum}`})); };

  const lotesMap = new Map<string, OrcamentoItemGroup[]>();
  const avulsos: OrcamentoItemGroup[] = [];
  sortedItems.forEach(item => {
      if (item.loteId) {
          if (!lotesMap.has(item.loteId)) lotesMap.set(item.loteId, []);
          lotesMap.get(item.loteId)!.push(item);
      } else {
          avulsos.push(item);
      }
  });

  return (
    <div className="space-y-6">
      {/* 1. DADOS GERAIS */}
      <Section title="Dados Gerais do Orçamento">
          <div className="grid md:grid-cols-2 gap-4">
              <Field label="PAE nº" required note="Formato: AAAA/NNNNNNNN"><input type="text" name="pae" value={data.pae} onChange={handleChange} required className={inputClasses} placeholder="Ex: 2026/325698745" /></Field>
              <Field label="Setor" required><input type="text" name="setor" value={data.setor || ''} onChange={handleChange} required className={inputClasses} placeholder="Ex: DL/DAL" /></Field>

              <Field label="Tipo de Orçamento">
                  <select name="tipoOrcamento" value={data.tipoOrcamento} onChange={handleChange} className={inputClasses}>
                      <option value="licitacao">Licitação</option>
                      <option value="adesao_ata">Adesão à Ata de Registro de Preços</option>
                      <option value="gerenciador_ata">Gerenciador da Ata</option>
                      <option value="dispensa_licitacao">Dispensa de Licitação</option>
                      <option value="aditivo_contratual">Aditivo Contratual</option>
                  </select>
              </Field>
              
              {data.tipoOrcamento === 'aditivo_contratual' && (
                  <div className="md:col-span-2 mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 animate-fade-in-down">
                      <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4 border-b border-blue-200 pb-2">Dados do Contrato</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                          <Field label="Número do Contrato" required><input type="text" name="numeroContrato" value={data.numeroContrato || ''} onChange={handleChange} className={inputClasses} placeholder="Ex: 001/2023" /></Field>
                          <Field label="Ano do Contrato" required>
                              <select name="anoContrato" value={data.anoContrato || '2024'} onChange={handleChange} className={inputClasses}>
                                  <option value="2022">2022</option><option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                              </select>
                          </Field>
                      </div>
                  </div>
              )}

              {data.tipoOrcamento === 'licitacao' && (
                  <Field label="Modalidade da Licitação">
                      <select name="modalidadeLicitacao" value={data.modalidadeLicitacao} onChange={handleChange} className={inputClasses}>
                          <option value="pregao_eletronico_comum">Pregão Eletrônico (Comum)</option>
                          <option value="pregao_eletronico_rp">Pregão Eletrônico (SRP)</option>
                      </select>
                  </Field>
              )}
              {data.tipoOrcamento === 'adesao_ata' && (
                 <div className="md:col-span-2 mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 animate-fade-in-down">
                     <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2">Dados da Ata de Registro de Preços (Carona)</h3>
                     <div className="grid md:grid-cols-2 gap-4">
                         <Field label="Número da Ata" required><input type="text" name="numeroAta" value={data.numeroAta} onChange={handleChange} className={inputClasses} placeholder="Ex: 001/2024" /></Field>
                         <Field label="Ano da Ata" required>
                             <select name="anoAta" value={data.anoAta} onChange={handleChange} className={inputClasses}>
                                 <option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                             </select>
                         </Field>
                         <Field label="Órgão Gerenciador" required><input type="text" name="orgaoAta" value={data.orgaoAta} onChange={handleChange} className={inputClasses} placeholder="Ex: Secretaria de Estado..." /></Field>
                         <Field label="Estado" required>
                             <select name="estadoAta" value={data.estadoAta} onChange={handleChange} className={inputClasses}>
                                 <option value="">Selecione um Estado</option>{ufOptions.map(uf => (<option key={uf.val} value={uf.val}>{uf.val} - {uf.label}</option>))}
                             </select>
                         </Field>
                     </div>
                 </div>
              )}
              {data.tipoOrcamento === 'gerenciador_ata' && (
                  <div className="md:col-span-2 mt-4 p-4 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 animate-fade-in-down">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b pb-2">Dados da Ata Própria</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                          <Field label="Número da Ata" required><input type="text" name="numeroAta" value={data.numeroAta} onChange={handleChange} className={inputClasses} placeholder="Ex: 001" /></Field>
                          <Field label="Ano da Ata" required>
                              <select name="anoAta" value={data.anoAta} onChange={handleChange} className={inputClasses}>
                                 <option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                              </select>
                          </Field>
                      </div>
                  </div>
              )}
          </div>
      </Section>

      {/* 2. FONTES CONSULTADAS */}
      {data.tipoOrcamento !== 'gerenciador_ata' && (
        <Section title="Fontes Consultadas para a Pesquisa de Preço" instruction="Selecione as fontes que foram utilizadas. Elas ficarão disponíveis para escolha dentro de cada item.">
            <div className="grid md:grid-cols-2 gap-4">
                {allFontesOptions.map(f => (
                    <label key={f.val} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer">
                        <input type="checkbox" name="fontesPesquisa" value={f.val} checked={(data.fontesPesquisa || []).includes(f.val)} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-cbmpa-red focus:ring-cbmpa-red" /> 
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f.label}</span>
                    </label>
                ))}
            </div>
            
            {isOnlyDireta && (
                <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg space-y-6 animate-fade-in-down">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 border-b pb-2">Detalhamento da Pesquisa Direta</h3>
                    <Field label="Justificativa da Ausência de Pesquisa de Preço no SIMAS, PNCP ou em Contratações Similares" note="Obrigatório se 'Pesquisa Direta' for a única fonte.">
                        <textarea name="justificativaAusenciaFonte" value={data.justificativaAusenciaFonte} onChange={handleChange} className={`${inputClasses} h-24`} placeholder="(Caso não tenha sido realizada a pesquisa de preço em uma dessas fontes, justifique aqui)." />
                    </Field>
                    <Field label="Justificativa da Pesquisa Direta com Fornecedores">
                        <textarea name="justificativaPesquisaDireta" value={data.justificativaPesquisaDireta} onChange={handleChange} className={`${inputClasses} h-24`} placeholder="(Justificar o motivo de ter sido utilizada essa fonte e quais os critérios de escolha dos fornecedores consultados)." />
                    </Field>

                    <div>
                        <h4 className="font-bold text-md text-gray-800 dark:text-gray-200 mb-2">Fornecedores Cotados</h4>
                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                            <div><label className="block text-sm font-semibold mb-1 dark:text-gray-300">Nome do Fornecedor</label><input type="text" value={novoFornecedor.nome} onChange={(e) => setNovoFornecedor(prev => ({ ...prev, nome: e.target.value }))} className={inputClasses} /></div>
                            <div><label className="block text-sm font-semibold mb-1 dark:text-gray-300">Qual a razão da escolha?</label><input type="text" value={novoFornecedor.justificativa} onChange={(e) => setNovoFornecedor(prev => ({ ...prev, justificativa: e.target.value }))} className={inputClasses} /></div>
                        </div>
                        <button onClick={handleAddFornecedor} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-md">Adicionar</button>

                        {(data.fornecedoresDiretos || []).length > 0 && (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-200 dark:bg-gray-600">
                                        <tr><th className="px-4 py-2">Fornecedor</th><th className="px-4 py-2">Justificativa da Escolha</th><th className="px-4 py-2 text-center">Ação</th></tr>
                                    </thead>
                                    <tbody>
                                        {(data.fornecedoresDiretos || []).map(f => (
                                            <tr key={f.id} className="border-b dark:border-gray-600 bg-white dark:bg-gray-800">
                                                <td className="px-4 py-2 font-medium">{f.nome}</td><td className="px-4 py-2">{f.justificativa}</td>
                                                <td className="px-4 py-2 text-center"><button onClick={() => handleRemoveFornecedor(f.id)} className="text-red-500 hover:text-red-700 font-bold">Excluir</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Section>
      )}

      {/* 3. METODOLOGIA E ASSISTENTE DE IA */}
      {data.tipoOrcamento !== 'gerenciador_ata' && (
          <>
            <Section title="Metodologia da Estimativa de Preço">
                <RadioGroup name="metodologia" value={data.metodologia} options={[ {val:'menor',label:'Menor preço'}, {val:'media',label:'Média aritmética'}, {val:'mediana',label:'Mediana'} ]} onChange={handleChange} />
            </Section>
            
            {selectedFontes.length > 0 && (
                <Section title="Pesquisa Automatizada de Preços (IA) - Opcional" instruction="Você pode preencher os preços manualmente dentro de cada item abaixo, ou usar o assistente de IA para buscar preços em massa baseados nas fontes que você selecionou.">
                    <AiAssistant data={data} setData={setData} addPrice={addPrice} availableSources={selectedFontes} />
                </Section>
            )}
          </>
      )}

      {/* 4. ITENS DA CONTRATAÇÃO */}
      <Section title="Itens da Contratação e Inserção de Preços">
          {data.tipoOrcamento !== 'gerenciador_ata' && data.tipoOrcamento !== 'adesao_ata' && data.tipoOrcamento !== 'aditivo_contratual' && selectedItemIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm animate-fade-in-down">
                  <span className="font-bold text-cbmpa-blue-start">{selectedItemIds.size} item(s) selecionado(s)</span>
                  <div className="flex items-center gap-2 flex-grow">
                      <input type="text" placeholder="Nome do Lote (Ex: 01)" value={loteName} onChange={(e) => setLoteName(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-500 dark:text-white flex-grow min-w-[150px]" />
                      <button onClick={handleAgruparLote} className="bg-cbmpa-blue-start hover:bg-cbmpa-blue-end text-white font-bold py-2 px-4 rounded shadow transition-colors">Agrupar</button>
                      <button onClick={handleDesagrupar} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded shadow transition-colors">Desagrupar</button>
                  </div>
              </div>
          )}

          <div className="space-y-6">
              {Array.from(lotesMap.entries()).map(([loteId, itemsLote]) => {
                  const valorTotalLote = itemsLote.reduce((acc, it) => acc + ((Number(it.quantidadeTotal) || 0) * (Number(it.estimativaUnitaria) || 0)), 0);
                  const isAboveTeto = valorTotalLote > 4800000;
                  const isExclusivoME = valorTotalLote <= 80000 && valorTotalLote > 0;
                  const aplicarCota = itemsLote[0]?.aplicarCotaMeEpp !== false;

                  let cotaMessage = "Aplicar regra de divisão de Cota ME/EPP (25%) neste LOTE";
                  if (isAboveTeto) cotaMessage = "Valor do Lote acima do limite (R$ 4,8M). 100% AMPLA Concorrência.";
                  else if (isExclusivoME) cotaMessage = "Aplicar exclusividade ME/EPP (Lote até R$ 80.000,00)";

                  let totalAmpla = 0; let totalCota = 0;
                  itemsLote.forEach(it => {
                      (it.cotas || []).forEach(c => {
                          if (c.id === 'ampla' || c.tipo?.includes('AMPLA')) totalAmpla += (Number(c.quantidade) || 0);
                          if (c.id === 'cota' || c.tipo?.includes('COTA')) totalCota += (Number(c.quantidade) || 0);
                      });
                  });

                  return (
                      <div key={`lote-${loteId}`} className="border-2 border-cbmpa-blue-start rounded-lg mb-6 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
                          <div className="bg-cbmpa-blue-start text-white p-4 flex justify-between items-center">
                              <h3 className="font-bold text-lg">📦 LOTE {loteId}</h3>
                              <div className="text-right">
                                  <span className="text-sm opacity-80 block">Valor Total do Lote</span>
                                  <span className="font-bold text-xl">{formatCurrency(valorTotalLote)}</span>
                              </div>
                          </div>
                          
                          {data.tipoOrcamento !== 'gerenciador_ata' && data.tipoOrcamento !== 'adesao_ata' && data.tipoOrcamento !== 'aditivo_contratual' && (
                              <div className={`p-4 border-b ${isAboveTeto ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700/50'}`}>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input 
                                          type="checkbox" 
                                          checked={aplicarCota && !isAboveTeto} 
                                          onChange={(e) => handleLoteCotaToggle(loteId, e.target.checked, valorTotalLote)}
                                          disabled={isAboveTeto}
                                          className="h-5 w-5 rounded border-gray-300 text-cbmpa-red cursor-pointer disabled:opacity-50"
                                      />
                                      <span className="font-semibold">{cotaMessage}</span>
                                  </label>
                                  
                                  <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded border text-sm">
                                      <span className="font-bold block mb-1">Distribuição Oficial do Lote:</span>
                                      <div className="flex gap-4">
                                          {!aplicarCota || isAboveTeto ? (
                                              <span className="text-cbmpa-red font-bold">100% AMPLA CONCORRÊNCIA</span>
                                          ) : isExclusivoME ? (
                                              <span className="text-blue-600 font-bold">100% EXCLUSIVA ME/EPP</span>
                                          ) : (
                                              <>
                                                  <span className="text-gray-600 dark:text-gray-300">AMPLA: <strong>{totalAmpla} itens</strong></span>
                                                  <span className="text-blue-600 dark:text-blue-400">COTA ME/EPP: <strong>{totalCota} itens</strong></span>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}

                          <div className="p-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                              <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-2">Itens que compõem este Lote</h4>
                              {itemsLote.map(g => {
                                  const valorRef = (Number(g.quantidadeTotal) || 0) * (Number(g.estimativaUnitaria) || 0);
                                  return (
                                      <ItemForm 
                                          key={g.id} group={g} onRemove={removeGroup} onGroupChange={handleGroupChange} inputClasses={inputClasses} isSelected={selectedItemIds.has(g.id)} onToggleSelect={toggleSelect}
                                          tipoOrcamento={data.tipoOrcamento} precos={(data.precosEncontrados || {})[g.id] || []} precosIncluidos={data.precosIncluidos || {}} fontesDisponiveis={selectedFontes}
                                          onAddPrice={addPrice} onPriceChange={handlePriceChange} onRemovePrice={removePrice} onTogglePriceInclusion={handleInclusionChange}
                                          valorReferencia={valorRef} valorGlobal={0} isLoteItem={true}
                                      />
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}

              {avulsos.map(g => {
                  const valorRef = (Number(g.quantidadeTotal) || 0) * (Number(g.estimativaUnitaria) || 0);
                  return (
                      <ItemForm 
                          key={g.id} group={g} onRemove={removeGroup} onGroupChange={handleGroupChange} inputClasses={inputClasses} isSelected={selectedItemIds.has(g.id)} onToggleSelect={toggleSelect}
                          tipoOrcamento={data.tipoOrcamento} precos={(data.precosEncontrados || {})[g.id] || []} precosIncluidos={data.precosIncluidos || {}} fontesDisponiveis={selectedFontes}
                          onAddPrice={addPrice} onPriceChange={handlePriceChange} onRemovePrice={removePrice} onTogglePriceInclusion={handleInclusionChange}
                          valorReferencia={valorRef} valorGlobal={0}
                      />
                  )
              })}
          </div>

          <button onClick={addGroup} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-md mt-6">
              <span className="text-xl">➕</span> Adicionar Novo Item
          </button>
      </Section>

      {/* 5. DESCARTE DE PREÇOS */}
      {data.tipoOrcamento !== 'gerenciador_ata' && (
          <Section title="Descarte de Preços" instruction="Indique se foi necessário descartar algum preço discrepante ou inexequível encontrado na pesquisa.">
              <Field label="Houve descarte de preço?">
                  <div className="flex gap-6 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="houveDescarte" value="sim" checked={data.houveDescarte === 'sim'} onChange={handleChange} className="h-4 w-4"/>
                          <span className="text-sm dark:text-gray-300">Sim</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="houveDescarte" value="nao" checked={data.houveDescarte === 'nao'} onChange={handleChange} className="h-4 w-4"/>
                          <span className="text-sm dark:text-gray-300">Não</span>
                      </label>
                  </div>
              </Field>
              {data.houveDescarte === 'sim' && (
                  <Field label="Justificativa do Descarte" required>
                      <textarea name="justificativaDescarte" value={data.justificativaDescarte} onChange={handleChange} className={`${inputClasses} h-20`} placeholder="Explique os motivos técnicos para descartar cotações discrepantes..."/>
                  </Field>
              )}
          </Section>
      )}

      {/* 6. DADOS DO REAJUSTE (ADITIVO) */}
      {data.tipoOrcamento === 'aditivo_contratual' && (
          <Section title="Dados do Reajuste">
              <div className="space-y-6">
                  <div className="border-b pb-4 dark:border-gray-600">
                      <Field label="Tempo?">
                          <div className="flex gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="aditivoTempo" value="sim" checked={data.aditivoTempo === 'sim'} onChange={handleChange} className="h-4 w-4"/>
                                  <span className="dark:text-gray-300">Sim</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="aditivoTempo" value="nao" checked={data.aditivoTempo === 'nao'} onChange={handleChange} className="h-4 w-4"/>
                                  <span className="dark:text-gray-300">Não</span>
                              </label>
                          </div>
                      </Field>
                      {data.aditivoTempo === 'sim' && (
                          <div className="flex items-center gap-2 mt-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                              <span className="dark:text-gray-300">Prazo:</span>
                              <input type="text" name="aditivoTempoQuantidade" value={data.aditivoTempoQuantidade || ''} onChange={handleChange} className={`${inputClasses} w-32`} placeholder="Qtd" />
                              <select name="aditivoTempoUnidade" value={data.aditivoTempoUnidade || 'meses'} onChange={handleChange} className={inputClasses}><option value="meses">meses</option><option value="anos">ano(s)</option></select>
                          </div>
                      )}
                  </div>
                  <div>
                      <Field label="Haverá reajuste?">
                          <div className="flex gap-6">
                              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="haveraReajuste" value="sim" checked={data.haveraReajuste === 'sim'} onChange={handleChange} className="h-4 w-4"/><span className="dark:text-gray-300">Sim</span></label>
                              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="haveraReajuste" value="nao" checked={data.haveraReajuste === 'nao'} onChange={handleChange} className="h-4 w-4"/><span className="dark:text-gray-300">Não</span></label>
                          </div>
                      </Field>
                      {data.haveraReajuste === 'sim' && (
                          <div className="grid md:grid-cols-2 gap-4 mt-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded">
                              <Field label="Porcentagem de Reajuste (%)" required><input type="number" name="porcentagemReajuste" value={data.porcentagemReajuste || ''} onChange={(e) => setData({...data, porcentagemReajuste: parseFloat(e.target.value)})} className={inputClasses} placeholder="Ex: 5.0" /></Field>
                              <Field label="Índice" required>
                                  <select name="indiceReajuste" value={data.indiceReajuste || ''} onChange={handleChange} className={inputClasses}>
                                      <option value="">Selecione o Índice</option><option value="IPCA">IPCA</option><option value="IGP-M">IGP-M</option><option value="INPC">INPC</option><option value="IPC-Fipe">IPC-Fipe</option>
                                  </select>
                              </Field>
                          </div>
                      )}
                  </div>
              </div>
          </Section>
      )}

      {/* 7. COMPARATIVO (ADITIVO) */}
      {data.tipoOrcamento === 'aditivo_contratual' && sortedItems.length > 0 && (
          <Section title="Cálculo do Valor do Aditivo" instruction="De quanto será o aditivo? Edite o Percentual, a Quantidade ou o Valor Total. O cálculo utiliza o valor com reajuste (se houver).">
              <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left">
                      <thead className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                          <tr><th className="px-2 py-2">ITEM</th><th className="px-2 py-2">DESCRIÇÃO</th><th className="px-2 py-2 text-center">QTD ORIGINAL</th><th className="px-2 py-2 text-right">V. UNIT. CONTRATO</th><th className="px-2 py-2 text-right">V. TOTAL BASE</th><th className="px-2 py-2 text-center w-24">ADITIVO (%)</th><th className="px-2 py-2 text-center w-24">ADITIVO (QTD)</th><th className="px-2 py-2 text-right w-32">ADITIVO TOTAL (R$)</th><th className="px-2 py-2 text-right">NOVO V. GLOBAL</th></tr>
                      </thead>
                      <tbody>
                          {sortedItems.map(item => {
                              const qtdOriginal = Number(item.quantidadeTotal) || 0; const vUnitContrato = Number(item.valorUnitarioContrato) || 0; const pctReajuste = (data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0);
                              const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100); const vTotalBase = qtdOriginal * vUnitReajustado;
                              const qtdAditivo = Number(item.aditivoQuantidade) || 0; const vTotalAditivo = Number(item.aditivoValorTotal) || (qtdAditivo * vUnitReajustado); const pctAditivo = Number(item.aditivoPercentual) || (qtdOriginal > 0 ? (qtdAditivo / qtdOriginal) * 100 : 0); const novoVGlobal = vTotalBase + vTotalAditivo;
                              return (
                                  <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                      <td className="px-2 py-2 font-bold">{item.itemTR}</td><td className="px-2 py-2 truncate max-w-[150px]" title={item.descricao}>{item.descricao}</td><td className="px-2 py-2 text-center">{qtdOriginal}</td><td className="px-2 py-2 text-right">{vUnitContrato.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td><td className="px-2 py-2 text-right text-blue-600 font-semibold">{vTotalBase.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                      <td className="px-2 py-2 text-center"><input type="text" value={pctAditivo ? pctAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 4}) : ''} onChange={(e) => handleAditivoCalculation(item.id, 'pct', e.target.value)} className="w-full text-center border rounded p-1 dark:bg-gray-700 dark:text-white" placeholder="%" /></td>
                                      <td className="px-2 py-2 text-center"><input type="text" value={qtdAditivo ? qtdAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 4}) : ''} onChange={(e) => handleAditivoCalculation(item.id, 'qtd', e.target.value)} className="w-full text-center border rounded p-1 dark:bg-gray-700 dark:text-white font-bold" placeholder="Qtd" /></td>
                                      <td className="px-2 py-2 text-right"><input type="text" value={vTotalAditivo ? vTotalAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 2, minimumFractionDigits: 2}) : ''} onChange={(e) => handleAditivoCalculation(item.id, 'total', e.target.value)} className="w-full text-right border rounded p-1 dark:bg-gray-700 dark:text-white font-bold text-green-600" placeholder="R$" /></td>
                                      <td className="px-2 py-2 text-right font-bold">{novoVGlobal.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </Section>
      )}

      {/* 8. ASSINATURAS */}
      <Section title="Assinatura">
        <div className="grid md:grid-cols-2 gap-6">
            <Field label="Cidade" required><input type="text" name="cidade" value={data.cidade} onChange={handleChange} required className={inputClasses} /></Field>
            <Field label="Data" required><input type="date" name="data" value={data.data} onChange={handleChange} required className={inputClasses} /></Field>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
             <div className="p-4 border rounded-md bg-white dark:bg-gray-800 shadow-sm">
                <p className="font-bold mb-2 text-cbmpa-red border-b pb-1">Assinante 1 (Responsável)</p>
                <Field label="Nome Completo"><input type="text" name="assinante1Nome" value={data.assinante1Nome} onChange={handleChange} className={inputClasses} /></Field>
                <Field label="Cargo"><select name="assinante1Cargo" value={data.assinante1Cargo} onChange={handleChange} className={inputClasses}>{orcamentoCargoOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
                <Field label="Função"><input type="text" name="assinante1Funcao" value={data.assinante1Funcao} onChange={handleChange} className={inputClasses} /></Field>
            </div>
            <div className="p-4 border rounded-md bg-white dark:bg-gray-800 shadow-sm">
                <p className="font-bold mb-2 text-cbmpa-red border-b pb-1">Assinante 2 (Opcional)</p>
                <Field label="Nome Completo"><input type="text" name="assinante2Nome" value={data.assinante2Nome} onChange={handleChange} className={inputClasses} /></Field>
                <Field label="Cargo"><select name="assinante2Cargo" value={data.assinante2Cargo} onChange={handleChange} className={inputClasses}><option value="">Selecione...</option>{orcamentoCargoOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
                <Field label="Função"><input type="text" name="assinante2Funcao" value={data.assinante2Funcao} onChange={handleChange} className={inputClasses} /></Field>
            </div>
        </div>
      </Section>
    </div>
  );
};