import React from 'react';
import { Field, inputClasses } from '../formCommon';
import { Checkbox, RadioGroup, TrFormProps } from './common';

// Forma de contratação (x.1). `srp` liga as opções de Registro de Preços / Adesão à Ata (só TR Bens).
export const FormaContratacaoField: React.FC<TrFormProps & { sec: number; srp?: boolean }> = ({ data, h, sec, srp = false }) => (
        <Field label={`${sec}.1 Forma de Contratação`} required>
            <div className="flex flex-col gap-y-2">
                <Checkbox name="formaContratacao" value="inexigibilidade" checked={data.formaContratacao.includes('inexigibilidade')} onChange={h.handleCheckboxChange}>Inexigibilidade de licitação, com fundamento no art. 74.</Checkbox>
                {data.formaContratacao.includes('inexigibilidade') && (
                    <div className="ml-6 p-3 bg-white dark:bg-gray-800 border border-blue-200 rounded-md shadow-inner">
                        <label className="block text-sm font-semibold mb-1 dark:text-blue-200">Selecione o Inciso (Art. 74):</label>
                        <select name="inexigibilidadeInciso" value={data.inexigibilidadeInciso} onChange={h.handleChange} className={inputClasses}>
                            <option value="">Selecione...</option>
                            <option value="I">I - Aquisição com exclusividade</option>
                            <option value="II">II - Notória especialização (serviços técnicos)</option>
                            <option value="III">III - Artista consagrado</option>
                            <option value="IV">IV - Credenciamento</option>
                            <option value="V">V - Aquisição/locação de imóvel específico</option>
                        </select>
                    </div>
                )}
                <Checkbox name="formaContratacao" value="dispensa_valor" checked={data.formaContratacao.includes('dispensa_valor')} onChange={h.handleCheckboxChange}>Dispensa de licitação em razão do valor*, com fundamento no art. 75, II.</Checkbox>
                <Checkbox name="formaContratacao" value="dispensa_art75" checked={data.formaContratacao.includes('dispensa_art75')} onChange={h.handleCheckboxChange}>Dispensa de licitação, com fundamento no art. 75 (demais incisos).</Checkbox>
                {data.formaContratacao.includes('dispensa_art75') && (
                    <div className="ml-6 p-3 bg-white dark:bg-gray-800 border border-blue-200 rounded-md shadow-inner">
                        <label className="block text-sm font-semibold mb-1 dark:text-blue-200">Selecione o Inciso (Art. 75):</label>
                        <select name="dispensaInciso" value={data.dispensaInciso} onChange={h.handleChange} className={inputClasses}>
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
                <Checkbox name="formaContratacao" value="pregao" checked={data.formaContratacao.includes('pregao')} onChange={h.handleCheckboxChange}>Pregão eletrônico.</Checkbox>
                {srp && (<>
                <Checkbox name="formaContratacao" value="pregao_rp" checked={data.formaContratacao.includes('pregao_rp')} onChange={h.handleCheckboxChange}>Pregão eletrônico para Registro de Preços.</Checkbox>
                <Checkbox name="formaContratacao" value="adesao_ata" checked={data.formaContratacao.includes('adesao_ata')} onChange={h.handleCheckboxChange}>Adesão à Ata de Registro de Preços.</Checkbox>
                </>)}
            </div>
        </Field>
);

// Critério de julgamento, sigilo do orçamento, aceitabilidade e ME/EPP (x.2 a x.5).
export const CriteriosSelecaoFields: React.FC<TrFormProps & { sec: number }> = ({ data, h, sec }) => (
  <>
        <Field label={`${sec}.2 Critério de Julgamento`}>
            <RadioGroup name="criterioJulgamento" value={data.criterioJulgamento} options={[{val: 'menor_preco', label: 'Menor preço.'}, {val: 'maior_desconto', label: 'Maior desconto.'}]} onChange={h.handleChange} />
        </Field>
        <Field label={`${sec}.3 O orçamento é sigiloso?`}>
            <RadioGroup name="orcamentoSigiloso" value={data.orcamentoSigiloso} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleSigilosoChange} />
            {data.orcamentoSigiloso === 'sim' && <textarea name="justificativaOrcamentoSigiloso" value={data.justificativaOrcamentoSigiloso} onChange={h.handleChange} className={`${inputClasses} h-32 mt-2 font-mono text-xs`}/>}
        </Field>
        <Field label={`${sec}.4 Critério para a Proposta ser Aceita`}>
            <textarea name="criterioAceitabilidade" value={data.criterioAceitabilidade} onChange={h.handleChange} className={`${inputClasses} h-40 text-sm`} />
        </Field>
        <Field label={`${sec}.5 Há itens com participação exclusiva de ME/EPP?`}>
            <RadioGroup name="participacaoME" value={data.participacaoME} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleChange} />
            {data.participacaoME === 'sim' && (
                <div className="mt-2">
                    <Field label="Indicar os itens:">
                        <input name="participacaoMEItens" value={data.participacaoMEItens} onChange={h.handleChange} className={inputClasses} placeholder="Ex: 01, 02 e 05"/>
                    </Field>
                </div>
            )}
        </Field>
  </>
);
