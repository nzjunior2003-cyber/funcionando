import React from 'react';
import { cargoOptions, inputClasses, Field, SectionWithHelp as Section } from '../formCommon';
import { RadioGroup, TrFormProps } from './common';

// Garantia do contrato (art. 96). `naoHaJustificativa` exige a justificativa quando "Não há".
export const GarantiaContratoField: React.FC<TrFormProps & { sec: number; n: number; naoHaJustificativa?: boolean }> = ({ data, h, sec, n, naoHaJustificativa = false }) => (
          <Field label={`${sec}.${n} Qual a garantia do contrato?`}>
              <RadioGroup name="garantiaContratoTipo" value={data.garantiaContratoTipo} options={[{val: 'porcentagem', label: 'X% do valor inicial do contrato.'}, {val: 'nao_ha', label: 'Não há.'}]} onChange={h.handleChange} />
              {data.garantiaContratoTipo === 'porcentagem' && (
                  <div className="mt-2 grid grid-cols-2 gap-4">
                      <input name="garantiaContratoPorcentagem" value={data.garantiaContratoPorcentagem} onChange={h.handleChange} className={inputClasses} placeholder="X %"/>
                      <input name="garantiaContratoJustificativa" value={data.garantiaContratoJustificativa} onChange={h.handleChange} className={inputClasses} placeholder="Justificativa (obrigatório se > 5%)"/>
                  </div>
              )}
              {naoHaJustificativa && data.garantiaContratoTipo === 'nao_ha' && (
                  <textarea name="garantiaContratoNaoHaJustificativa" value={data.garantiaContratoNaoHaJustificativa || ''} onChange={h.handleChange} className={`${inputClasses} mt-2 h-20`} placeholder="Justificativa da não exigência de garantia (obrigatória)"/>
              )}
          </Field>
);

// Índice, periodicidade e marco inicial do reajuste.
export const ReajusteCampos: React.FC<TrFormProps> = ({ data, h }) => (
              <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Índice">
                      <select name="reajusteIndice" value={data.reajusteIndice} onChange={h.handleChange} className={inputClasses}>
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
                        <input type="number" min="0" name="reajusteMeses" value={data.reajusteMeses} onChange={h.handleChange} className={inputClasses} placeholder="Ex: 12"/>
                        <span className="mx-2 dark:text-gray-300">{Number(data.reajusteMeses) === 1 ? 'mês,' : 'meses,'}</span>
                        <select name="reajusteMarco" value={data.reajusteMarco || ''} onChange={h.handleChange} className={inputClasses}>
                            <option value="">a partir de...</option>
                            <option value="orcamento">a partir do orçamento estimado</option>
                            <option value="proposta">a partir da apresentação da proposta</option>
                            <option value="contrato">a partir da assinatura do contrato</option>
                        </select>
                      </div>
                  </Field>
              </div>
);

export const PrevisaoOrcamentariaSection: React.FC<TrFormProps & { sec: number }> = ({ data, h, sec }) => (
      <Section title={`${sec}. PREVISÃO ORÇAMENTÁRIA`}>
          <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{sec}.1. Dados Orçamentários da Contratação</h3>
          <div className="grid md:grid-cols-3 gap-4">
                <Field label="Funcional Programática"><input type="text" name="dadosOrcamentariosFuncional" value={data.dadosOrcamentariosFuncional} onChange={h.handleChange} className={inputClasses} placeholder="xxx" /></Field>
                <Field label="Elemento de Despesa"><input type="text" name="dadosOrcamentariosElemento" value={data.dadosOrcamentariosElemento} onChange={h.handleChange} className={inputClasses} placeholder="xxx" /></Field>
                <Field label="Fonte do Recurso"><input type="text" name="dadosOrcamentariosFonte" value={data.dadosOrcamentariosFonte} onChange={h.handleChange} className={inputClasses} placeholder="xxx" /></Field>
          </div>
      </Section>
);

export const AssinaturaSection: React.FC<TrFormProps> = ({ data, setData, h }) => (
      <Section title="ASSINATURA">
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Cidade" required><input type="text" name="cidade" value={data.cidade} onChange={h.handleChange} required className={inputClasses} /></Field>
          <Field label="Data" required><input type="date" name="data" value={data.data} onChange={h.handleChange} required className={inputClasses} /></Field>
          <Field label="Nome Completo do Servidor" required><input type="text" name="nome" value={data.nome} onChange={h.handleChange} required className={inputClasses} /></Field>
          <Field label="Nome de Guerra" required><input type="text" name="nomeGuerra" value={data.nomeGuerra} onChange={h.handleChange} required className={inputClasses} /></Field>
          <Field label="Cargo" required>
            <select name="cargo" value={data.cargo} onChange={h.handleChange} required className={inputClasses}>
                <option value="">Selecione o cargo</option>
                {cargoOptions.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
            </select>
          </Field>
          <Field label="Função/Matrícula" required><input type="text" name="funcao" value={data.funcao} onChange={h.handleChange} required className={inputClasses} /></Field>
          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!data.assinadoPae} onChange={e => setData((prev: any) => ({ ...prev, assinadoPae: e.target.checked }))} className="h-4 w-4 accent-cbmpa-red" />
              <span className="text-sm font-medium">Incluir "Assinado Eletronicamente via PAE" acima do nome</span>
            </label>
          </div>
        </div>
      </Section>
);
