import React from 'react';
import { Field, inputClasses } from '../formCommon';
import { Checkbox, RadioGroup, TrFormProps } from './common';

// As opções (7.1.1, 7.2.1...) são chaves de armazenamento; só o número exibido muda conforme a seção.
const makeRn = (sec: number) => (s: string) => s.replace(/^7\./, `${sec}.`);

type SecProps = TrFormProps & { sec: number };

// Habilitações jurídica, fiscal e econômico-financeira (x.1 a x.3).
export const HabilitacoesFields: React.FC<SecProps> = ({ data, h, sec }) => {
  const rn = makeRn(sec);
  return (
    <>
          <Field label={`${sec}.1 Habilitação Jurídica`}>
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
                    <Checkbox key={opt.val} name="habilitacaoJuridica" value={opt.val} checked={data.habilitacaoJuridica?.includes(opt.val)} onChange={h.handleCheckboxChange}>{rn(opt.label)}</Checkbox>
                ))}
            </div>
          </Field>

          <Field label={`${sec}.2 Habilitação Fiscal, Social e Trabalhista`}>
            <div className="space-y-2 mb-4">
                {[
                    {val: '7.2.1', label: '7.2.1. Prova de inscrição no CNPJ ou no CPF...'},
                    {val: '7.2.2', label: '7.2.2. Prova de regularidade fiscal perante a Fazenda Nacional...'},
                    {val: '7.2.3', label: '7.2.3. Prova de regularidade com o FGTS...'},
                    {val: '7.2.4', label: '7.2.4. Prova de inexistência de débitos na Justiça do Trabalho...'},
                    {val: '7.2.5', label: '7.2.5. Prova de inscrição no cadastro Estadual ou Municipal...'},
                    {val: '7.2.6', label: '7.2.6. Prova de regularidade com a Fazenda Estadual ou Municipal...'},
                    {val: '7.2.7', label: '7.2.7. Caso o fornecedor seja considerado isento dos tributos...'},
                    {val: '7.2.8', label: '7.2.8. MEI que pretenda auferir benefícios do tratamento diferenciado...'}
                ].map(opt => (
                    <Checkbox key={opt.val} name="habilitacaoFiscal" value={opt.val} checked={data.habilitacaoFiscal?.includes(opt.val)} onChange={h.handleCheckboxChange}>{rn(opt.label)}</Checkbox>
                ))}
            </div>
          </Field>

          <Field label={`${sec}.3 Qualificação Econômico-Financeira`}>
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
                    <Checkbox key={opt.val} name="qualificacaoEconomica" value={opt.val} checked={data.qualificacaoEconomica?.includes(opt.val)} onChange={h.handleCheckboxChange}>{rn(opt.label)}</Checkbox>
                ))}
            </div>
          </Field>
    </>
  );
};

export interface QualificacaoOpt { val: string; label: string; semJustificativa?: boolean; especificar?: boolean }

// Habilitação técnica (x.4) e qualificações técnicas exigidas (x.5), cada uma com justificativa própria.
// `comLegislacao` acrescenta o campo "legislação aplicável" por exigência (TR Serviços).
export const QualificacaoTecnicaFields: React.FC<SecProps & { options: QualificacaoOpt[]; comLegislacao?: boolean }> = ({ data, h, sec, options, comLegislacao = false }) => (
  <>
          <Field label={`${sec}.4 Será exigida habilitação técnica?`}>
              <RadioGroup name="habilitacaoTecnicaExigida" value={data.habilitacaoTecnicaExigida} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleChange} />
              {data.habilitacaoTecnicaExigida === 'sim' && (
                  <div className="grid md:grid-cols-2 gap-4 mt-2">
                      <Field label="Qual?"><input name="habilitacaoTecnicaQual" value={data.habilitacaoTecnicaQual} onChange={h.handleChange} className={inputClasses} placeholder="Especificar exigência"/></Field>
                      <Field label="Por quê?"><input name="habilitacaoTecnicaPorque" value={data.habilitacaoTecnicaPorque} onChange={h.handleChange} className={inputClasses} placeholder="Justificar exigência"/></Field>
                  </div>
              )}
          </Field>
    <Field label={`${sec}.5 Qualificações Técnicas Exigidas`}>
        <div className="grid grid-cols-1 gap-4">
            {options.map(opt => {
                const sel = data.qualificacoesTecnicas.includes(opt.val);
                const just = data.qualificacoesTecnicasJustificativas || {};
                return (
                  <div key={opt.val} className="border-b pb-2">
                    <Checkbox name="qualificacoesTecnicas" value={opt.val} checked={sel} onChange={h.handleCheckboxChange}>{opt.label}</Checkbox>
                    {sel && opt.especificar && (
                        <input type="text" value={just[`${opt.val}__requisito`] || ''} onChange={e => h.handleJustificationChange(`${opt.val}__requisito`, e.target.value)}
                            className={`${inputClasses} mt-2 text-sm`} placeholder="Especificar: indicar o requisito e o seu fundamento legal" />
                    )}
                    {sel && !opt.semJustificativa && (
                        <textarea
                            value={just[opt.val] || ''}
                            onChange={(e) => h.handleJustificationChange(opt.val, e.target.value)}
                            className={`${inputClasses} mt-2 text-sm h-16`}
                            placeholder={`Justificativa para ${opt.label.substring(0, 30)}...`}
                        />
                    )}
                    {sel && !opt.semJustificativa && comLegislacao && (
                        <input type="text" value={just[`${opt.val}__lei`] || ''} onChange={e => h.handleJustificationChange(`${opt.val}__lei`, e.target.value)}
                            className={`${inputClasses} mt-2 text-sm`} placeholder="Legislação aplicável (se for o caso)" />
                    )}
                  </div>
                );
            })}
        </div>
    </Field>
  </>
);

// Sustentabilidade e riscos (x.6 e x.7).
export const SustentabilidadeRiscosFields: React.FC<SecProps> = ({ data, h, sec }) => (
  <>
 <Field label={`${sec}.6 Há critério de sustentabilidade?`}>
              <RadioGroup name="criterioSustentabilidade" value={data.criterioSustentabilidade} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleChange} />
              {data.criterioSustentabilidade === 'sim' && (
                  <textarea 
                      name="criterioSustentabilidadeDesc" 
                      value={data.criterioSustentabilidadeDesc} 
                      onChange={(e) => {
                          h.handleChange(e);
                          e.target.style.height = 'auto';
                          e.target.style.height = (e.target.scrollHeight) + 'px';
                      }} 
                      className={`${inputClasses} mt-2 min-h-[100px] resize-none overflow-hidden`} 
                      placeholder="Especificar critério (pressione Enter para pular linha)..."
                  />
              )}
          </Field>

          {/* --- NOVO ITEM 7.7 CORRIGIDO --- */}
          <Field label={`${sec}.7 Há riscos a serem assumidos pela contratada?`}>
              <RadioGroup 
                  name="riscosAssumidos" 
                  value={data.riscosAssumidos} 
                  options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} 
                  onChange={h.handleChange} 
              />
              {data.riscosAssumidos === 'sim' && (
                  <textarea
                      name="riscosAssumidosDesc"
                      value={data.riscosAssumidosDesc}
                      onChange={h.handleChange}
                      className={`${inputClasses} mt-2 min-h-[80px] resize-y`}
                      placeholder="Descreva detalhadamente os riscos assumidos pela contratada..."
                  />
              )}
          </Field>
  </>
);

// Consórcio e subcontratação (x.8 e x.9).
export const ConsorcioSubcontratacaoFields: React.FC<SecProps> = ({ data, h, sec }) => (
  <>
          <Field label={`${sec}.8 Será permitida a participação de empresas reunidas em consórcio?`}>
              <RadioGroup name="participacaoConsorcio" value={data.participacaoConsorcio} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleChange} />
              {data.participacaoConsorcio === 'sim' && (
                  <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-inner space-y-4">
                      <div className="dark:text-gray-300 text-sm leading-relaxed">
                          {sec}.8.1. É admitida a participação de empresas reunidas em consórcio, devendo o percentual de acréscimo para fins de qualificação técnica e econômico-financeira ser de 
                          <input 
                              type="number" 
                              name="participacaoConsorcioPercentual" 
                              value={data.participacaoConsorcioPercentual} 
                              onChange={h.handleChange} 
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
              {data.participacaoConsorcio === 'nao' && <input name="participacaoConsorcioJustificativa" value={data.participacaoConsorcioJustificativa} onChange={h.handleChange} className={`${inputClasses} mt-2`} placeholder="Justificar o motivo da vedação"/>}
          </Field>
          <Field label={`${sec}.9 Será permitida a subcontratação?`}>
              <RadioGroup name="subcontratacao" value={data.subcontratacao} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={h.handleChange} />
              {data.subcontratacao === 'sim' && (
                  <div className="mt-2 space-y-4">
                      <Field label="Selecione a Opção">
                          <select name="subcontratacaoOpcao" value={data.subcontratacaoOpcao} onChange={h.handleChange} className={inputClasses}>
                              <option value="">Selecione uma opção...</option>
                              <option value="7.9.1">{sec}.9.1. É admitida a subcontratação parcial do objeto...</option>
                              <option value="7.9.1.1">{sec}.9.1.1. É vedada a subcontratação completa ou da parcela principal...</option>
                              <option value="7.9.1.2">{sec}.9.1.2. A subcontratação fica limitada a percentual...</option>
                          </select>
                      </Field>
                      <textarea name="subcontratacaoDetalhes" value={data.subcontratacaoDetalhes} onChange={h.handleChange} className={`${inputClasses} h-20`} placeholder="Especifique limites ou parcelas permitidas..."/>
                  </div>
              )}
          </Field>
  </>
);
