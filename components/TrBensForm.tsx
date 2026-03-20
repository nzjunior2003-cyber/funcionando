
import React, { useState, useMemo } from 'react';
import { TrBensData, TrBensItem } from '../types';
import { AiAssistant } from './AiAssistant';

interface TrBensFormProps {
  data: TrBensData;
  setData: React.Dispatch<React.SetStateAction<TrBensData>>;
}

const SIGILOSO_TEXT_PADRAO = "O custo estimado da contratação possui caráter sigiloso e será tornado público apenas e imediatamente após o julgamento das propostas. Quando as propostas permanecerem com preços acima do orçamento estimado, o custo estimado da contratação será tornado público após a fase de lances.";

const cargoOptions = [
    'SD QBM', 'CB QBM', '3° SGT QBM', '2° SGT QBM', '1° SGT QBM', 'ST QBM',
    '2° TEN QOBM', '2° TEN QOABM', '1° TEN QOBM', '1° TEN QOABM',
    'CAP QOBM', 'CAP QOABM', 'MAJ QOBM', 'MAJ QOABM',
    'TCEL QOBM', 'CEL QOBM', 'CEL QOCBM', 'CEL QOSBM'
];

const parseCurrency = (value: string): number => {
  const cleanValue = value
    .replace(/[^\d,]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

const formatCurrencyInput = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Help: React.FC<{ instruction: string }> = ({ instruction }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-block ml-2" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        type="button"
        className="text-gray-400 hover:text-cbmpa-red focus:outline-none"
        aria-label="Ajuda"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 bottom-full right-0 mb-2 w-80 p-3 text-sm font-normal text-left text-gray-600 bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Instrução de Preenchimento</h3>
          {instruction}
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string, children: React.ReactNode, instruction?: string }> = ({ title, children, instruction }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 dark:bg-gray-700/50 dark:border-gray-600">
        <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-cbmpa-red">
            <h2 className="text-xl font-bold text-cbmpa-red">{title}</h2>
            {instruction && <Help instruction={instruction} />}
        </div>
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

const Checkbox: React.FC<{ name: string, value: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, children: React.ReactNode }> = ({ name, value, checked, onChange, children }) => (
    <div className="flex items-start">
        <input type="checkbox" id={`${name}-${value.replace(/\s/g, '')}`} name={name} value={value} checked={checked} onChange={onChange} className="mr-2 h-4 w-4 mt-1 flex-shrink-0"/>
        <label htmlFor={`${name}-${value.replace(/\s/g, '')}`} className="dark:text-gray-300 leading-tight">{children}</label>
    </div>
);

const RadioGroup: React.FC<{ name: keyof TrBensData, value: string, options: {val: string, label: string}[], onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ name, value, options, onChange }) => (
    <div className="flex flex-col gap-y-2">
        {options.map(opt => (
            <div key={opt.val} className="flex items-start">
                <input type="radio" id={`${name}-${opt.val}`} name={name} value={opt.val} checked={value === opt.val} onChange={onChange} className="mr-2 h-4 w-4 mt-1 flex-shrink-0"/>
                <label htmlFor={`${name}-${opt.val}`} className="dark:text-gray-300">{opt.label}</label>
            </div>
        ))}
    </div>
);

export const TrBensForm: React.FC<TrBensFormProps> = ({ data, setData }) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loteInputValue, setLoteInputValue] = useState('');
  const [editingPrice, setEditingPrice] = useState<{[key: string]: string}>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSigilosoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setData(prev => ({
        ...prev,
        orcamentoSigiloso: val,
        justificativaOrcamentoSigiloso: val === 'sim' ? SIGILOSO_TEXT_PADRAO : ''
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setData(prev => {
        const field = name as keyof TrBensData;
        const prevValue = (prev[field] as string[]) || [];
        const newValue = checked ? [...prevValue, value] : prevValue.filter(v => v !== value);
        
        const updates: Partial<TrBensData> = { [field]: newValue };
        
        if (value === 'inexigibilidade' && !checked) updates.inexigibilidadeInciso = '';
        if (value === 'dispensa_art75' && !checked) updates.dispensaInciso = '';
        
        return { ...prev, ...updates };
    });
  };

  const handleJustificationChange = (key: string, value: string) => {
    setData(prev => ({
        ...prev,
        qualificacoesTecnicasJustificativas: {
            ...prev.qualificacoesTecnicasJustificativas,
            [key]: value
        }
    }));
  };

  const handleItemChange = (id: string, field: keyof TrBensItem, value: string | number) => {
    setData(prev => ({
        ...prev,
        itens: prev.itens.map(item => item.id === id ? { ...item, [field]: value } : item)
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
    const newItem: TrBensItem = { id: Date.now().toString(), grupo: '', item: (data.itens.length + 1).toString(), descricao: '', codigoSimas: '', unidade: '', quantidade: 0, valorUnitario: 0, concorrencia: '' };
    setData(prev => ({ ...prev, itens: [...prev.itens, newItem] }));
  };

  const removeItem = (id: string) => {
    setData(prev => ({ ...prev, itens: prev.itens.filter(item => item.id !== id) }));
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
        alert("Digite o nome ou número do lote.");
        return;
    }
    setData(prev => ({
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
      setData(prev => ({
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

  const inputClasses = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400";

  const renderItemRow = (item: TrBensItem) => (
    <tr key={item.id} className={`${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'} border-b transition-colors`}>
        <td className="px-2 py-2 border text-center">
            <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleItemSelection(item.id)} className="h-4 w-4" />
        </td>
        <td className="px-1 py-1 border font-semibold text-center dark:text-gray-300">{item.loteId || '-'}</td>
        <td className="px-1 py-1 border"><input type="text" value={item.item} onChange={e => handleItemChange(item.id, 'item', e.target.value)} className="w-full p-1 bg-transparent text-center" /></td>
        <td className="px-1 py-1 border"><textarea value={item.descricao} onChange={e => handleItemChange(item.id, 'descricao', e.target.value)} className="w-full p-1 bg-transparent h-10 min-w-[200px]" /></td>
        <td className="px-1 py-1 border"><input type="text" value={item.codigoSimas} onChange={e => handleItemChange(item.id, 'codigoSimas', e.target.value)} className="w-full p-1 bg-transparent" /></td>
        <td className="px-1 py-1 border"><input type="text" value={item.unidade} onChange={e => handleItemChange(item.id, 'unidade', e.target.value)} className="w-full p-1 bg-transparent text-center" /></td>
        <td className="px-1 py-1 border"><input type="number" value={item.quantidade} onChange={e => handleItemChange(item.id, 'quantidade', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-transparent text-center" /></td>
        <td className="px-1 py-1 border">
            <div className="relative flex items-center">
                <span className="text-gray-500 mr-1">R$</span>
                <input 
                    type="text" 
                    value={editingPrice[item.id] ?? formatCurrencyInput(item.valorUnitario)} 
                    onChange={e => handlePriceInputChange(item.id, e.target.value)} 
                    onBlur={e => handlePriceBlur(item.id, e.target.value)}
                    className="w-full p-1 bg-transparent text-right outline-none focus:ring-1 focus:ring-cbmpa-red rounded" 
                />
            </div>
        </td>
        <td className="px-1 py-1 border text-center">
            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 font-bold px-2">Remover</button>
        </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <Section title="IDENTIFICAÇÃO">
        <div className="grid md:grid-cols-2 gap-4">
            <Field label="PAE nº" required>
                <input type="text" name="pae" value={data.pae} onChange={handleChange} placeholder="aaaa/nnnn" className={inputClasses} />
            </Field>
            <Field label="Setor" required>
                <input type="text" name="setor" value={data.setor} onChange={handleChange} placeholder="Ex: DL/DAL" className={inputClasses} />
            </Field>
        </div>
      </Section>

      <Section title="1. O QUE SERÁ CONTRATADO?" instruction="Indicar o objeto da contratação (bem comum) e os quantitativos estimados.">
        
        {selectedItems.size > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-4 mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="font-semibold dark:text-blue-200">{selectedItems.size} item(s) selecionado(s)</span>
                <input
                    type="text"
                    value={loteInputValue}
                    onChange={e => setLoteInputValue(e.target.value)}
                    placeholder="Nome/Nº do Lote"
                    className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                />
                <button onClick={handleAgrupar} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">Agrupar em Lote</button>
                <button onClick={handleDesagrupar} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition">Desagrupar</button>
            </div>
        )}

        <div className="overflow-x-auto border rounded-lg dark:border-gray-600 mb-4 shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-cbmpa-red text-white uppercase text-xs">
                    <tr>
                        <th className="px-2 py-2 border w-10 text-center">Sel.</th>
                        <th className="px-2 py-2 border w-16 text-center">Lote</th>
                        <th className="px-2 py-2 border w-16 text-center">Item</th>
                        <th className="px-2 py-2 border">Descrição</th>
                        <th className="px-2 py-2 border">Código SIMAS</th>
                        <th className="px-2 py-2 border w-20 text-center">Und</th>
                        <th className="px-2 py-2 border w-20 text-center">Qtd</th>
                        <th className="px-2 py-2 border w-32 text-right">V. Unit.</th>
                        <th className="px-2 py-2 border w-24 text-center">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(groupedItens.lotes).sort().map(loteId => (
                        <React.Fragment key={`lote-group-${loteId}`}>
                            <tr className="bg-gray-100 dark:bg-gray-700/50">
                                <td colSpan={9} className="px-4 py-2 font-bold text-cbmpa-red border italic">Lote: {loteId}</td>
                            </tr>
                            {groupedItens.lotes[loteId].map(item => renderItemRow(item))}
                        </React.Fragment>
                    ))}
                    {groupedItens.ungrouped.length > 0 && (
                        <>
                            {Object.keys(groupedItens.lotes).length > 0 && (
                                <tr className="bg-gray-100 dark:bg-gray-700/50">
                                    <td colSpan={9} className="px-4 py-2 font-bold text-gray-600 dark:text-gray-400 border italic">Itens sem Lote</td>
                                </tr>
                            )}
                            {groupedItens.ungrouped.map(item => renderItemRow(item))}
                        </>
                    )}
                    {data.itens.length === 0 && (
                        <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 italic">Nenhum item adicionado ainda.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <button onClick={addItem} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm mb-4 shadow transition transform active:scale-95">➕ Adicionar Novo Item</button>
      </Section>

      {Object.keys(groupedItens.lotes).length > 0 && (
        <Section title="2. JUSTIFICATIVA PARA O AGRUPAMENTO" instruction="Justificar como foi formado o grupo, indicando as razões técnicas que justificam o agrupamento ou a economia de escala que se espera obter.">
          <Field label="Justificativa" note="Se a licitação for apenas por item(ns), preencha com 'não se aplica'.">
              <div className="relative">
                  <textarea name="justificativaAgrupamento" value={data.justificativaAgrupamento} onChange={handleChange} className={`${inputClasses} h-24 pr-10`} />
                  <AiAssistant fieldName="Justificativa para Agrupamento de Itens" onGeneratedText={(t) => setData(prev => ({...prev, justificativaAgrupamento: t}))} />
              </div>
          </Field>
        </Section>
      )}

      <Section title="3. DESCRIÇÃO DA SOLUÇÃO" instruction="Resumir a solução escolhida pelo estudo técnico preliminar, a partir da demanda.">
        <Field label="3.1 Qual o motivo da contratação?" note="Descrição detalhada de como os bens suprem a demanda.">
            <div className="relative">
                <textarea name="motivoContratacao" value={data.motivoContratacao} onChange={handleChange} className={`${inputClasses} h-32 pr-10`} />
                <AiAssistant fieldName="Motivo da Contratação (Resumo ETP)" onGeneratedText={(t) => setData(prev => ({...prev, motivoContratacao: t}))} />
            </div>
        </Field>
      </Section>

      <Section title="4. NATUREZA DO BEM" instruction="Bens comuns podem ser definidos por padrões usuais de desempenho e qualidade. Bens especiais não podem ser definidos dessa forma.">
          <RadioGroup name="naturezaBem" value={data.naturezaBem} options={[{val: 'comum', label: 'Comum.'}, {val: 'especial', label: 'Especial.'}]} onChange={handleChange} />
      </Section>

      <Section title="5. QUALIDADE, RENDIMENTO E GARANTIA" instruction="Requisitos de qualidade, rendimento, segurança e durabilidade.">
          <Field label="5.1 Haverá prova de qualidade?">
              <RadioGroup name="provaQualidade" value={data.provaQualidade} options={[{val: 'sim', label: 'Sim'}, {val: 'nao', label: 'Não'}]} onChange={handleChange} />
              {data.provaQualidade === 'sim' && <textarea name="justificativaProvaQualidade" value={data.justificativaProvaQualidade} onChange={handleChange} placeholder="Justificativa (deve ser comprovada por certificação INMETRO/CONMETRO)" className={`${inputClasses} h-20 mt-2`}/>}
          </Field>
          <Field label="5.2 O edital exigirá amostra?">
              <RadioGroup name="amostra" value={data.amostra} options={[{val: 'sim', label: 'Sim'}, {val: 'nao', label: 'Não'}]} onChange={handleChange} />
              {data.amostra === 'sim' && (
                <div className="space-y-4 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-inner">
                  <Field label="Prazo em dias úteis" note="Ex: 03 (três) ou 05 (cinco)">
                    <input type="text" name="amostraPrazo" value={data.amostraPrazo || ''} onChange={handleChange} className={inputClasses} placeholder="Ex: 03 (três)"/>
                  </Field>
                  <Field label="Justificativa Opcional (Complementar)">
                    <textarea name="justificativaAmostra" value={data.justificativaAmostra} onChange={handleChange} placeholder="Justificativa adicional..." className={`${inputClasses} h-20`}/>
                  </Field>
                </div>
              )}
          </Field>
          <Field label="5.3 Haverá garantia do bem?">
              <RadioGroup name="garantiaBem" value={data.garantiaBem} options={[{val: 'sim', label: 'Sim'}, {val: 'nao', label: 'Não'}]} onChange={handleChange} />
              {data.garantiaBem === 'sim' && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 mt-2 space-y-4 shadow-inner">
                    <Field label="Indicação dos Itens" note="Ex: 01, 02 e 05"><input type="text" name="garantiaItens" value={data.garantiaItens || ''} onChange={handleChange} placeholder="Quais itens terão garantia?" className={inputClasses}/></Field>
                    <Field label="Prazo de Garantia (meses)"><input type="number" name="garantiaBemMeses" value={data.garantiaBemMeses} onChange={handleChange} placeholder="Ex: 12" className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"/></Field>
                </div>
              )}
          </Field>
          <Field label="5.4 Haverá assistência técnica?">
              <RadioGroup name="assistenciaTecnica" value={data.assistenciaTecnica} options={[{val: 'sim', label: 'Sim'}, {val: 'nao', label: 'Não'}]} onChange={handleChange} />
              {data.assistenciaTecnica === 'sim' && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 mt-2 space-y-4 shadow-inner">
                    <Field label="Indicação dos Itens"><input type="text" name="assistenciaTecnicaItens" value={data.assistenciaTecnicaItens || ''} onChange={handleChange} placeholder="Quais itens terão assistência?" className={inputClasses}/></Field>
                    <Field label="Prazo (meses)"><input type="number" name="assistenciaTecnicaMeses" value={data.assistenciaTecnicaMeses || ''} onChange={handleChange} placeholder="Ex: 12" className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"/></Field>
                    <Field label="Tipo de Prestação">
                        <RadioGroup name="assistenciaTecnicaModo" value={data.assistenciaTecnicaModo || ''} options={[{val: 'credenciada', label: 'Por empresa credenciada contratada por ele.'}, {val: 'propria', label: 'Por meios próprios.'}]} onChange={handleChange} />
                    </Field>
                </div>
              )}
          </Field>
      </Section>

      <Section title="6. CRITÉRIOS DE SELEÇÃO" instruction="Formas de contratação e julgamento baseados na Lei Federal nº 14.133/21.">
        <Field label="6.1 Forma de Contratação" required>
            <div className="flex flex-col gap-y-2">
                <Checkbox name="formaContratacao" value="inexigibilidade" checked={data.formaContratacao.includes('inexigibilidade')} onChange={handleCheckboxChange}>Inexigibilidade de licitação, com fundamento no art. 74.</Checkbox>
                {data.formaContratacao.includes('inexigibilidade') && (
                    <div className="ml-6 p-3 bg-white dark:bg-gray-800 border border-blue-200 rounded-md shadow-inner">
                        <label className="block text-sm font-semibold mb-1 dark:text-blue-200">Selecione o Inciso (Art. 74):</label>
                        <select name="inexigibilidadeInciso" value={data.inexigibilidadeInciso} onChange={handleChange} className={inputClasses}>
                            <option value="">Selecione...</option>
                            <option value="I">I - Aquisição com exclusividade</option>
                            <option value="II">II - Notória especialização (serviços técnicos)</option>
                            <option value="III">III - Artista consagrado</option>
                            <option value="IV">IV - Credenciamento</option>
                            <option value="V">V - Aquisição/locação de imóvel específico</option>
                        </select>
                    </div>
                )}
                <Checkbox name="formaContratacao" value="dispensa_valor" checked={data.formaContratacao.includes('dispensa_valor')} onChange={handleCheckboxChange}>Dispensa de licitação em razão do valor*, com fundamento no art. 75, II.</Checkbox>
                <Checkbox name="formaContratacao" value="dispensa_art75" checked={data.formaContratacao.includes('dispensa_art75')} onChange={handleCheckboxChange}>Dispensa de licitação, com fundamento no art. 75 (demais incisos).</Checkbox>
                {data.formaContratacao.includes('dispensa_art75') && (
                    <div className="ml-6 p-3 bg-white dark:bg-gray-800 border border-blue-200 rounded-md shadow-inner">
                        <label className="block text-sm font-semibold mb-1 dark:text-blue-200">Selecione o Inciso (Art. 75):</label>
                        <select name="dispensaInciso" value={data.dispensaInciso} onChange={handleChange} className={inputClasses}>
                            <option value="">Selecione...</option>
                            <option value="III">III - Manutenção de veículos/equipamentos</option>
                            <option value="IV">IV - Emergência/Calamidade</option>
                            <option value="V">V - Licitação deserta/fracassada</option>
                            <option value="VI">VI - Produtos perecíveis</option>
                            <option value="VII">VII - Ensino/Pesquisa</option>
                            <option value="VIII">VIII - Organizações Sociais</option>
                            <option value="IX">IX - Ciência/Tecnologia/Inovação</option>
                        </select>
                    </div>
                )}
                <Checkbox name="formaContratacao" value="pregao" checked={data.formaContratacao.includes('pregao')} onChange={handleCheckboxChange}>Pregão eletrônico.</Checkbox>
                <Checkbox name="formaContratacao" value="pregao_rp" checked={data.formaContratacao.includes('pregao_rp')} onChange={handleCheckboxChange}>Pregão eletrônico para Registro de Preços.</Checkbox>
            </div>
        </Field>
        <Field label="6.2 Critério de Julgamento">
            <RadioGroup name="criterioJulgamento" value={data.criterioJulgamento} options={[{val: 'menor_preco', label: 'Menor preço.'}, {val: 'maior_desconto', label: 'Maior desconto.'}]} onChange={handleChange} />
        </Field>
        <Field label="6.3 O orçamento é sigiloso?">
            <RadioGroup name="orcamentoSigiloso" value={data.orcamentoSigiloso} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleSigilosoChange} />
            {data.orcamentoSigiloso === 'sim' && <textarea name="justificativaOrcamentoSigiloso" value={data.justificativaOrcamentoSigiloso} onChange={handleChange} className={`${inputClasses} h-32 mt-2 font-mono text-xs`}/>}
        </Field>
        <Field label="6.4 Critério para a Proposta ser Aceita">
            <textarea name="criterioAceitabilidade" value={data.criterioAceitabilidade} onChange={handleChange} className={`${inputClasses} h-40 text-sm`} />
        </Field>
        <Field label="6.5 Há itens com participação exclusiva de ME/EPP?">
            <RadioGroup name="participacaoME" value={data.participacaoME} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
            {data.participacaoME === 'sim' && (
                <div className="mt-2">
                    <Field label="Indicar os itens:">
                        <input name="participacaoMEItens" value={data.participacaoMEItens} onChange={handleChange} className={inputClasses} placeholder="Ex: 01, 02 e 05"/>
                    </Field>
                </div>
            )}
        </Field>
      </Section>

      <Section title="7. REQUISITOS DA CONTRATADA">
          <Field label="7.1 Habilitação Jurídica">
            <div className="space-y-2 mb-4">
                {[
                    {val: '7.1.1', label: '7.1.1. Pessoa física: cédula de identidade (RG)...'},
                    {val: '7.1.2', label: '7.1.2. Empresário individual: inscrição no Registro Público...'},
                    {val: '7.1.3', label: '7.1.3. Microempreendedor Individual - MEI: CCMEI...'},
                    {val: '7.1.4', label: '7.1.4. Sociedade empresária estrangeira: portaria de autorização...'},
                    {val: '7.1.5', label: '7.1.5. Sociedade simples: inscrição do ato constitutivo...'},
                    {val: '7.1.6', label: '7.1.6. Filial, sucursal ou agência: inscrição do ato constitutivo...'},
                    {val: '7.1.7', label: '7.1.7. Sociedade cooperativa: ata de fundação e estatuto...'},
                    {val: '7.1.8', label: '7.1.8. Agricultor familiar: Declaração de Aptidão ao Pronaf...'},
                    {val: '7.1.9', label: '7.1.9. Produtor Rural: matrícula no CEI...'},
                    {val: '7.1.10', label: '7.1.10. Ato de autorização para o exercício da atividade...'},
                    {val: '7.1.11', label: '7.1.11. Documentos acompanhados de todas as alterações...'}
                ].map(opt => (
                    <Checkbox key={opt.val} name="habilitacaoJuridica" value={opt.val} checked={data.habilitacaoJuridica?.includes(opt.val)} onChange={handleCheckboxChange}>{opt.label}</Checkbox>
                ))}
            </div>
          </Field>

          <Field label="7.2 Habilitação Fiscal, Social e Trabalhista">
            <div className="space-y-2 mb-4">
                {[
                    {val: '7.2.1', label: '7.2.1. Prova de inscrição no CNPJ ou no CPF...'},
                    {val: '7.2.2', label: '7.2.2. Prova de regularidade fiscal perante a Fazenda Nacional...'},
                    {val: '7.2.3', label: '7.2.3. Prova de regularidade com o FGTS...'},
                    {val: '7.2.4', label: '7.2.4. Prova de inexistência de débitos na Justiça do Trabalho...'},
                    {val: '7.2.5', label: '7.2.5. Prova de inscrição no cadastro Estadual ou Municipal...'},
                    {val: '7.2.6', label: '7.2.6. Prova de regularidade com a Fazenda Estadual ou Municipal...'},
                    {val: '7.2.7', label: '7.2.7. Caso o fornecedor seja considerado isento dos tributos...'},
                    {val: '7.2.8', label: '7.2.8. MEI que pretenda auferir benefícios do tratamento diferenciado...'}
                ].map(opt => (
                    <Checkbox key={opt.val} name="habilitacaoFiscal" value={opt.val} checked={data.habilitacaoFiscal?.includes(opt.val)} onChange={handleCheckboxChange}>{opt.label}</Checkbox>
                ))}
            </div>
          </Field>

          <Field label="7.3 Qualificação Econômico-Financeira">
            <div className="space-y-2 mb-4">
                {[
                    {val: '7.3.1', label: '7.3.1. Certidão negativa de insolvência civil...'},
                    {val: '7.3.2', label: '7.3.2. Certidão negativa de falência...'},
                    {val: '7.3.3', label: '7.3.3. Balanço patrimonial e demonstrações contábeis...'},
                    {val: '7.3.4', label: '7.3.4. Índices de Liquidez (LG, LC e SG) superiores a 1...'},
                    {val: '7.3.5', label: '7.3.5. Empresas criadas no exercício financeiro...'},
                    {val: '7.3.6', label: '7.3.6. Documentos limitar-se-ão ao último exercício...'},
                    {val: '7.3.7', label: '7.3.7. Documentos com base no limite definido pela RFB...'},
                    {val: '7.3.8', label: '7.3.8. Exigência de capital mínimo ou patrimônio líquido...'},
                    {val: '7.3.9', label: '7.3.9. Balanço atestado por profissional habilitado...'}
                ].map((opt: any) => (
                    <Checkbox key={opt.val} name="qualificacaoEconomica" value={opt.val} checked={data.qualificacaoEconomica?.includes(opt.val)} onChange={handleCheckboxChange}>{opt.label}</Checkbox>
                ))}
            </div>
          </Field>

          <Field label="7.4 Será exigida habilitação técnica?">
              <RadioGroup name="habilitacaoTecnicaExigida" value={data.habilitacaoTecnicaExigida} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
              {data.habilitacaoTecnicaExigida === 'sim' && (
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                      <Field label="Qual?"><input name="habilitacaoTecnicaQual" value={data.habilitacaoTecnicaQual} onChange={handleChange} className={inputClasses} placeholder="Especificar exigência"/></Field>
                      <Field label="Por quê?"><input name="habilitacaoTecnicaPorque" value={data.habilitacaoTecnicaPorque} onChange={handleChange} className={inputClasses} placeholder="Justificar exigência"/></Field>
                  </div>
              )}
          </Field>
          <Field label="7.5 Qualificações Técnicas Exigidas">
              <div className="grid grid-cols-1 gap-4">
                  {[
                      {val: 'ciencia', label: 'Declaração de ciência das informações necessárias.'},
                      {val: 'registro', label: 'Registro na entidade profissional competente.'},
                      {val: 'pessoal', label: 'Indicação de pessoal técnico para execução.'},
                      {val: 'atestado', label: 'Atestado de capacidade técnica operacional.'},
                      {val: 'lei_especial', label: 'Outro previsto em lei especial.'},
                      {val: 'nao_exigida', label: 'Não será exigida prova em razão da baixa complexidade.'}
                  ].map(opt => (
                      <div key={opt.val} className="border-b pb-2">
                        <Checkbox name="qualificacoesTecnicas" value={opt.val} checked={data.qualificacoesTecnicas.includes(opt.val)} onChange={handleCheckboxChange}>{opt.label}</Checkbox>
                        {data.qualificacoesTecnicas.includes(opt.val) && (
                            <textarea 
                                value={data.qualificacoesTecnicasJustificativas?.[opt.val] || ''} 
                                onChange={(e) => handleJustificationChange(opt.val, e.target.value)}
                                className={`${inputClasses} mt-2 text-sm h-16`}
                                placeholder={`Justificativa para ${opt.label.substring(0, 30)}...`}
                            />
                        )}
                      </div>
                  ))}
              </div>
          </Field>
          <Field label="7.6 Há critério de sustentabilidade?">
              <RadioGroup name="criterioSustentabilidade" value={data.criterioSustentabilidade} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
              {data.criterioSustentabilidade === 'sim' && <input name="criterioSustentabilidadeDesc" value={data.criterioSustentabilidadeDesc} onChange={handleChange} className={`${inputClasses} mt-2`} placeholder="Especificar critério"/>}
          </Field>
          <Field label="7.7 Há riscos a serem assumidos pela contratada?">
              <RadioGroup name="riscosAssumidos" value={data.riscosAssumidos} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
              {data.riscosAssumidos === 'sim' && <textarea name="riscosAssumidosDesc" value={data.riscosAssumidosDesc} onChange={handleChange} className={`${inputClasses} mt-2 h-20`} placeholder="Especificar riscos conforme análise de risco"/>}
          </Field>
          <Field label="7.8 Será permitida a participação de empresas reunidas em consórcio?">
              <RadioGroup name="participacaoConsorcio" value={data.participacaoConsorcio} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
              {data.participacaoConsorcio === 'sim' && (
                  <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-inner space-y-4">
                      <div className="dark:text-gray-300 text-sm leading-relaxed">
                          7.8.1. É admitida a participação de empresas reunidas em consórcio, devendo o percentual de acréscimo para fins de qualificação técnica e econômico-financeira ser de 
                          <input 
                              type="number" 
                              name="participacaoConsorcioPercentual" 
                              value={data.participacaoConsorcioPercentual} 
                              onChange={handleChange} 
                              min="10"
                              max="30"
                              className="w-16 mx-2 p-1 border-b border-gray-400 bg-transparent text-center focus:border-cbmpa-red outline-none font-bold dark:text-white"
                              placeholder="10"
                          />
                          % sobre o valor exigido para licitantes individuais.
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 italic font-normal">*(O acréscimo deve ser de 10% a 30%, conforme art. 15, §1º da Lei 14.133/21)</p>
                      </div>
                  </div>
              )}
              {data.participacaoConsorcio === 'nao' && <input name="participacaoConsorcioJustificativa" value={data.participacaoConsorcioJustificativa} onChange={handleChange} className={`${inputClasses} mt-2`} placeholder="Justificar o motivo da vedação"/>}
          </Field>
          <Field label="7.9 Será permitida a subcontratação?">
              <RadioGroup name="subcontratacao" value={data.subcontratacao} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
              {data.subcontratacao === 'sim' && (
                  <div className="mt-2 space-y-4">
                      <Field label="Selecione a Opção">
                          <select name="subcontratacaoOpcao" value={data.subcontratacaoOpcao} onChange={handleChange} className={inputClasses}>
                              <option value="">Selecione uma opção...</option>
                              <option value="7.9.1">7.9.1. É admitida a subcontratação parcial do objeto...</option>
                              <option value="7.9.1.1">7.9.1.1. É vedada a subcontratação completa ou da parcela principal...</option>
                              <option value="7.9.1.2">7.9.1.2. A subcontratação fica limitada a percentual...</option>
                          </select>
                      </Field>
                      <textarea name="subcontratacaoDetalhes" value={data.subcontratacaoDetalhes} onChange={handleChange} className={`${inputClasses} h-20`} placeholder="Especifique limites ou parcelas permitidas..."/>
                  </div>
              )}
          </Field>
      </Section>

      <Section title="8. FORMA DE ENTREGA DO BEM">
          <Field label="8.1 Como o bem deve ser entregue?">
              <div className="space-y-4">
                <label className="flex items-start">
                    <input type="radio" name="formaEntregaTipo" value="unica" checked={data.formaEntregaTipo === 'unica'} onChange={handleChange} className="mr-2 mt-1"/>
                    <span className="dark:text-gray-300">O bem deve ser totalmente entregue de uma só vez, conforme edital.</span>
                </label>
                <label className="flex items-start">
                    <input type="radio" name="formaEntregaTipo" value="parcelada" checked={data.formaEntregaTipo === 'parcelada'} onChange={handleChange} className="mr-2 mt-1"/>
                    <div className="dark:text-gray-300">
                        O bem deve ser entregue em <input name="entregaParcelasX" value={data.entregaParcelasX} onChange={handleChange} className="w-12 border-b text-center mx-1 bg-transparent border-gray-400" placeholder="X"/> parcelas, sendo a 1ª em até <input name="entregaParcelasY" value={data.entregaParcelasY} onChange={handleChange} className="w-12 border-b text-center mx-1 bg-transparent border-gray-400" placeholder="Y"/> dias, a contar do recebimento da nota de empenho, e as demais, conforme necessidade da contratante dentro do prazo de vigência contratual, mediante seu aviso com <input name="entregaParcelasZ" value={data.entregaParcelasZ} onChange={handleChange} className="w-12 border-b text-center mx-1 bg-transparent border-gray-400" placeholder="Z"/> dias de antecedência.
                    </div>
                </label>
              </div>
          </Field>
          <Field label="8.2 Local e Hora da Entrega">
              <textarea name="localEntrega" value={data.localEntrega} onChange={handleChange} className={`${inputClasses} h-20`} placeholder="Indicar endereço completo com CEP e cidade, e horário (XXhYYm)"/>
          </Field>
          <Field label="8.3 Prazo Máximo de Validade (para bens perecíveis)" note="Caso não se aplique, deixe em branco">
            <div className="p-3 bg-white dark:bg-gray-800 border rounded-md border-gray-300 dark:border-gray-600">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-3 dark:text-gray-300 text-sm leading-relaxed">
                    <span>O prazo de validade do bem, contado da data de sua entrega, não poderá ser inferior a</span>
                    <input 
                        type="text" 
                        name="prazoValidadePereciveis" 
                        value={data.prazoValidadePereciveis} 
                        onChange={handleChange} 
                        className="min-w-[150px] border-b border-gray-400 bg-transparent text-center focus:border-cbmpa-red outline-none px-1 font-bold dark:text-white" 
                        placeholder="Ex: 180 (cento e oitenta)"
                    />
                    <span>dias.</span>
                </div>
            </div>
          </Field>
      </Section>

      <Section title="9. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO">
          <Field label="9.1 Prazo do Contrato">
              <RadioGroup name="prazoContrato" value={data.prazoContrato} options={[{val: '30', label: '30 dias (pronta entrega).'}, {val: '12', label: '12 meses.'}]} onChange={handleChange} />
          </Field>
          <Field label="9.2 Haverá possibilidade de prorrogação?">
              <RadioGroup name="possibilidadeProrrogacao" value={data.possibilidadeProrrogacao} options={[{val: 'sim', label: 'Sim, nas hipóteses do art. 111 da Lei Federal nº 14.133/21.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
          </Field>
          <Field label="9.3 Forma de Pagamento" required>
              <div className="bg-white dark:bg-gray-800 p-4 border rounded-md shadow-inner space-y-4">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 border-b pb-1 mb-2">Selecione as cláusulas aplicáveis:</p>
                  <div className="space-y-3">
                      <Checkbox 
                        name="pagamentoOpcoes" 
                        value="ordem_bancaria" 
                        checked={data.pagamentoOpcoes.includes('ordem_bancaria')} 
                        onChange={handleCheckboxChange}
                      >
                        O pagamento será realizado por meio de ordem bancária creditada em conta corrente.
                      </Checkbox>
                      
                      <Checkbox 
                        name="pagamentoOpcoes" 
                        value="banpara" 
                        checked={data.pagamentoOpcoes.includes('banpara')} 
                        onChange={handleCheckboxChange}
                      >
                        Banco do Estado do Pará - BANPARÁ.
                      </Checkbox>

                      <Checkbox 
                        name="pagamentoOpcoes" 
                        value="qualquer_banco" 
                        checked={data.pagamentoOpcoes.includes('qualquer_banco')} 
                        onChange={handleCheckboxChange}
                      >
                        Qualquer instituição bancária indicada pela contratada.
                      </Checkbox>

                      <div className="border-t pt-2 mt-2">
                          <Checkbox 
                            name="pagamentoOpcoes" 
                            value="prazo_NF" 
                            checked={data.pagamentoOpcoes.includes('prazo_NF')} 
                            onChange={handleCheckboxChange}
                          >
                            <div className="inline-flex flex-wrap items-center gap-1">
                                O prazo para pagamento será de até 
                                <input 
                                    type="text" 
                                    name="pagamentoPrazoDias" 
                                    value={data.pagamentoPrazoDias} 
                                    onChange={handleChange}
                                    className="w-24 border-b border-gray-400 bg-transparent text-center focus:border-cbmpa-red outline-none px-1"
                                    placeholder="30 (trinta)"
                                />
                                dias corridos, a contar do recebimento da nota fiscal/fatura.
                            </div>
                          </Checkbox>
                      </div>

                      <div className="border-t pt-2 mt-2">
                        <Checkbox 
                            name="pagamentoOpcoes" 
                            value="regularidade" 
                            checked={data.pagamentoOpcoes.includes('regularidade')} 
                            onChange={handleCheckboxChange}
                        >
                            Prova da Regularidade Fiscal:
                        </Checkbox>
                        {data.pagamentoOpcoes.includes('regularidade') && (
                            <textarea 
                                name="pagamentoRegularidade" 
                                value={data.pagamentoRegularidade} 
                                onChange={handleChange} 
                                className={`${inputClasses} mt-2 text-xs font-mono h-28`} 
                                placeholder="Insira o texto sobre regularidade fiscal..."
                            />
                        )}
                      </div>
                  </div>
              </div>
          </Field>
          <Field label="9.4 Qual a garantia do contrato?">
              <RadioGroup name="garantiaContratoTipo" value={data.garantiaContratoTipo} options={[{val: 'porcentagem', label: 'X% do valor inicial do contrato.'}, {val: 'nao_ha', label: 'Não há.'}]} onChange={handleChange} />
              {data.garantiaContratoTipo === 'porcentagem' && (
                  <div className="mt-2 grid grid-cols-2 gap-4">
                      <input name="garantiaContratoPorcentagem" value={data.garantiaContratoPorcentagem} onChange={handleChange} className={inputClasses} placeholder="X %"/>
                      <input name="garantiaContratoJustificativa" value={data.garantiaContratoJustificativa} onChange={handleChange} className={inputClasses} placeholder="Justificativa (obrigatório se > 5%)"/>
                  </div>
              )}
          </Field>
          <Field label="9.5 Reajuste">
              <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Índice">
                      <select name="reajusteIndice" value={data.reajusteIndice} onChange={handleChange} className={inputClasses}>
                          <option value="">Selecione o índice...</option>
                          <option value="IPCA">IPCA (IBGE)</option>
                          <option value="IGP-M">IGP-M (FGV)</option>
                          <option value="INPC">INPC (IBGE)</option>
                          <option value="IPC-Fipe">IPC-Fipe</option>
                          <option value="Outro">Outro</option>
                      </select>
                  </Field>
                  <Field label="Período (meses)">
                      <div className="flex items-center">
                        <span className="mr-2 dark:text-gray-300">A cada</span>
                        <input type="number" name="reajusteMeses" value={data.reajusteMeses} onChange={handleChange} className={inputClasses} placeholder="Ex: 12"/>
                        <span className="ml-2 dark:text-gray-300">meses.</span>
                      </div>
                  </Field>
              </div>
          </Field>
      </Section>

      <Section title="10. PREVISÃO ORÇAMENTÁRIA">
          <div className="grid md:grid-cols-3 gap-4">
                <Field label="Funcional Programática"><input type="text" name="dadosOrcamentariosFuncional" value={data.dadosOrcamentariosFuncional} onChange={handleChange} className={inputClasses} placeholder="xxx" /></Field>
                <Field label="Elemento de Despesa"><input type="text" name="dadosOrcamentariosElemento" value={data.dadosOrcamentariosElemento} onChange={handleChange} className={inputClasses} placeholder="xxx" /></Field>
                <Field label="Fonte do Recurso"><input type="text" name="dadosOrcamentariosFonte" value={data.dadosOrcamentariosFonte} onChange={handleChange} className={inputClasses} placeholder="xxx" /></Field>
          </div>
      </Section>

      <Section title="ASSINATURA">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Cidade" required><input type="text" name="cidade" value={data.cidade} onChange={handleChange} required className={inputClasses} /></Field>
          <Field label="Data" required><input type="date" name="data" value={data.data} onChange={handleChange} required className={inputClasses} /></Field>
          <Field label="Nome Completo do Servidor" required><input type="text" name="nome" value={data.nome} onChange={handleChange} required className={inputClasses} /></Field>
          <Field label="Nome de Guerra" required><input type="text" name="nomeGuerra" value={data.nomeGuerra} onChange={handleChange} required className={inputClasses} /></Field>
          <Field label="Cargo" required>
            <select name="cargo" value={data.cargo} onChange={handleChange} required className={inputClasses}>
                <option value="">Selecione o cargo</option>
                {cargoOptions.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
          </Field>
          <Field label="Função/Matrícula" required><input type="text" name="funcao" value={data.funcao} onChange={handleChange} required className={inputClasses} /></Field>
        </div>
      </Section>
    </div>
  );
};
