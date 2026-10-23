import React from 'react';
import { TrBensData } from '../types';
import { AiAssistant } from './AiAssistant';
import { inputClasses, Field, SectionWithHelp as Section } from './formCommon';
import { Checkbox, RadioGroup, useTrHandlers } from './trCommon/common';
import { ItensSection } from './trCommon/ItensSection';
import { FormaContratacaoField, CriteriosSelecaoFields } from './trCommon/SelecaoFields';
import { HabilitacoesFields, QualificacaoTecnicaFields, SustentabilidadeRiscosFields, ConsorcioSubcontratacaoFields } from './trCommon/RequisitosFields';
import { GarantiaContratoField, ReajusteCampos, PrevisaoOrcamentariaSection, AssinaturaSection } from './trCommon/ContratoFields';

interface TrBensFormProps {
  data: TrBensData;
  setData: React.Dispatch<React.SetStateAction<TrBensData>>;
}

const QUALIFICACOES_BENS = [
    {val: 'ciencia', label: 'Declaração de ciência das informações necessárias.'},
    {val: 'registro', label: 'Registro na entidade profissional competente.'},
    {val: 'pessoal', label: 'Indicação de pessoal técnico para execução.'},
    {val: 'atestado', label: 'Atestado de capacidade técnica operacional.'},
    {val: 'lei_especial', label: 'Outro previsto em lei especial.'},
    {val: 'nao_exigida', label: 'Não será exigida prova em razão da baixa complexidade.'}
];

export const TrBensForm: React.FC<TrBensFormProps> = ({ data, setData }) => {
  const h = useTrHandlers(setData);
  const { handleChange, handleCheckboxChange } = h;
  const shared = { data, setData, h };

  const addGarantiaPeriodo = () => setData(prev => ({ ...prev, garantiaPeriodos: [...(prev.garantiaPeriodos || []), { id: Date.now().toString(), itemIds: [], meses: '' }] }));
  const removeGarantiaPeriodo = (id: string) => setData(prev => ({ ...prev, garantiaPeriodos: (prev.garantiaPeriodos || []).filter(p => p.id !== id) }));
  const updateGarantiaPeriodo = (id: string, patch: { meses?: string }) => setData(prev => ({ ...prev, garantiaPeriodos: (prev.garantiaPeriodos || []).map(p => p.id === id ? { ...p, ...patch } : p) }));
  const toggleGarantiaItem = (periodoId: string, itemId: string) => setData(prev => ({
    ...prev,
    garantiaPeriodos: (prev.garantiaPeriodos || []).map(p => p.id === periodoId
      ? { ...p, itemIds: p.itemIds.includes(itemId) ? p.itemIds.filter(i => i !== itemId) : [...p.itemIds, itemId] }
      : p)
  }));

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

      <ItensSection {...shared} objeto="bem comum" />

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
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Prazo para entrega da amostra (dias úteis)" note="Ex: 03 (três) ou 05 (cinco)">
                        <input type="text" name="amostraPrazo" value={data.amostraPrazo || ''} onChange={handleChange} className={inputClasses} placeholder="Ex: 03 (três)"/>
                    </Field>
                    <Field label="Prazo para retirada da amostra (dias úteis)" note="Contado após a análise definitiva pelo setor responsável.">
                        <input type="text" name="amostraPrazoRetirada" value={data.amostraPrazoRetirada || ''} onChange={handleChange} className={inputClasses} placeholder="Ex: 05 (cinco)"/>
                    </Field>
                  </div>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cada período de garantia pode valer para itens diferentes. Marque os itens e informe o prazo; o nome do item é puxado automaticamente.</p>
                    {(data.garantiaPeriodos || []).map((per, idx) => (
                        <div key={per.id} className="p-3 border rounded dark:border-gray-600 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-sm dark:text-gray-200">Período {idx + 1}</span>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0" value={per.meses} onChange={e => updateGarantiaPeriodo(per.id, { meses: e.target.value })} placeholder="Meses" className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"/>
                                    <span className="text-sm dark:text-gray-300">meses</span>
                                    <button type="button" onClick={() => removeGarantiaPeriodo(per.id)} className="text-red-600 text-sm hover:underline">Remover</button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {data.itens.map(it => {
                                    const emOutro = (data.garantiaPeriodos || []).some(o => o.id !== per.id && o.itemIds.includes(it.id));
                                    return (
                                        <label key={it.id} className={`flex items-start gap-2 text-sm dark:text-gray-300 ${emOutro ? 'opacity-50' : ''}`}>
                                            <input type="checkbox" className="mt-1" disabled={emOutro} checked={per.itemIds.includes(it.id)} onChange={() => toggleGarantiaItem(per.id, it.id)}/>
                                            <span><b>Item {it.item || '-'}</b> – {it.descricao || '(sem descrição)'}{emOutro ? ' (já em outro período)' : ''}</span>
                                        </label>
                                    );
                                })}
                                {data.itens.length === 0 && <p className="text-sm text-gray-500">Cadastre os itens na seção 1.</p>}
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addGarantiaPeriodo} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ Adicionar período de garantia</button>
                </div>
              )}
          </Field>
          <Field label="5.4 Haverá assistência técnica?">
              <RadioGroup name="assistenciaTecnica" value={data.assistenciaTecnica} options={[{val: 'sim', label: 'Sim'}, {val: 'nao', label: 'Não'}]} onChange={handleChange} />
              {data.assistenciaTecnica === 'sim' && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 mt-2 space-y-4 shadow-inner">
                    <Field label="Indicação dos Itens"><input type="text" name="assistenciaTecnicaItens" value={data.assistenciaTecnicaItens || ''} onChange={handleChange} placeholder="Quais itens terão assistência?" className={inputClasses}/></Field>
                    <Field label="Prazo (meses)"><input type="number" min="0" name="assistenciaTecnicaMeses" value={data.assistenciaTecnicaMeses || ''} onChange={handleChange} placeholder="Ex: 12" className="w-24 p-2 border rounded dark:bg-gray-700 dark:text-white"/></Field>
                    <Field label="Tipo de Prestação">
                        <RadioGroup name="assistenciaTecnicaModo" value={data.assistenciaTecnicaModo || ''} options={[{val: 'credenciada', label: 'Por empresa credenciada contratada por ele.'}, {val: 'propria', label: 'Por meios próprios.'}]} onChange={handleChange} />
                    </Field>
                </div>
              )}
          </Field>
      </Section>

      <Section title="6. CRITÉRIOS DE SELEÇÃO" instruction="Formas de contratação e julgamento baseados na Lei Federal nº 14.133/21.">
        <FormaContratacaoField {...shared} sec={6} srp />
        <CriteriosSelecaoFields {...shared} sec={6} />
      </Section>

      <Section title="7. REQUISITOS DA CONTRATADA">
          <HabilitacoesFields {...shared} sec={7} />
          <QualificacaoTecnicaFields {...shared} sec={7} options={QUALIFICACOES_BENS} />
          <SustentabilidadeRiscosFields {...shared} sec={7} />
          <ConsorcioSubcontratacaoFields {...shared} sec={7} />
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
          <GarantiaContratoField {...shared} sec={9} n={4} />
          <Field label="9.5 Reajuste">
              <ReajusteCampos {...shared} />
          </Field>
      </Section>

      <PrevisaoOrcamentariaSection {...shared} sec={10} />

      <AssinaturaSection {...shared} />
    </div>
  );
};
