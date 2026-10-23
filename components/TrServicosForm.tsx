import React from 'react';
import { TrServicosData } from '../types';
import { AiAssistant } from './AiAssistant';
import { inputClasses, Field, SectionWithHelp as Section } from './formCommon';
import { RadioGroup, useTrHandlers } from './trCommon/common';
import { ItensSection } from './trCommon/ItensSection';
import { FormaContratacaoField, CriteriosSelecaoFields } from './trCommon/SelecaoFields';
import { HabilitacoesFields, QualificacaoTecnicaFields, SustentabilidadeRiscosFields, ConsorcioSubcontratacaoFields } from './trCommon/RequisitosFields';
import { GarantiaContratoField, ReajusteCampos, PrevisaoOrcamentariaSection, AssinaturaSection } from './trCommon/ContratoFields';

interface TrServicosFormProps {
  data: TrServicosData;
  setData: React.Dispatch<React.SetStateAction<TrServicosData>>;
}

const QUALIFICACOES_SERVICOS = [
    {val: 'ciencia', label: 'Declaração de ciência das informações necessárias para o cumprimento da futura obrigação contratual.'},
    {val: 'registro', label: 'Registro na entidade profissional competente.'},
    {val: 'pessoal', label: 'Indicação de pessoal técnico, instalações e aparelhamento, com a qualificação de cada membro da equipe técnica responsável pela execução.'},
    {val: 'atestado_responsabilidade', label: 'Atestado de responsabilidade técnica (qualificação técnico-profissional), com registro em conselho profissional competente.'},
    {val: 'atestado_capacidade', label: 'Atestado de capacidade (qualificação técnico-operacional).'},
    {val: 'lei_especial', label: 'Outro previsto em lei especial.', especificar: true},
    {val: 'nao_exigida', label: 'Não será exigida prova de qualificação técnica em razão da baixa complexidade da contratação.', semJustificativa: true}
];

export const PRORROGACAO_CONTINUADO = 'com fundamento nos arts. 106 e 107 da Lei Federal nº 14.133/21.';
export const PRORROGACAO_NAO_CONTINUADO = 'com fundamento no art. 111 da Lei Federal nº 14.133/21.';

export const TrServicosForm: React.FC<TrServicosFormProps> = ({ data, setData }) => {
  const h = useTrHandlers(setData);
  const { handleChange } = h;
  const shared = { data, setData, h };
  const continuado = data.naturezaServico === 'continuado';

  // Ao trocar a natureza, ajusta os padrões que dependem dela (fundamento da prorrogação e reajuste).
  const handleNatureza = (e: React.ChangeEvent<HTMLInputElement>) => {
    const natureza = e.target.value as TrServicosData['naturezaServico'];
    setData(prev => {
      const fundamentoEhPadrao = !prev.prorrogacaoFundamento || prev.prorrogacaoFundamento === PRORROGACAO_CONTINUADO || prev.prorrogacaoFundamento === PRORROGACAO_NAO_CONTINUADO;
      return {
        ...prev,
        naturezaServico: natureza,
        prorrogacaoFundamento: fundamentoEhPadrao ? (natureza === 'continuado' ? PRORROGACAO_CONTINUADO : PRORROGACAO_NAO_CONTINUADO) : prev.prorrogacaoFundamento,
        reajusteHavera: natureza === 'continuado' ? 'sim' : prev.reajusteHavera,
        reajusteMeses: natureza === 'continuado' && !prev.reajusteMeses ? '12' : prev.reajusteMeses,
      };
    });
  };

  return (
    <div className="space-y-6">
      <Section title="NATUREZA DO SERVIÇO" instruction="Serviços comuns sem dedicação exclusiva de mão de obra. A natureza define os campos e o título do Termo de Referência.">
        <RadioGroup name="naturezaServico" value={data.naturezaServico} options={[
            {val: 'nao_continuado', label: 'Serviço comum de natureza não continuada.'},
            {val: 'continuado', label: 'Serviço comum de natureza continuada, sem dedicação exclusiva de mão de obra.'}
        ]} onChange={handleNatureza} />
      </Section>

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

      <ItensSection {...shared} objeto="serviço comum" />

      <Section title="3. DESCRIÇÃO DA SOLUÇÃO" instruction="Resumir a solução escolhida pelo estudo técnico preliminar, a partir da demanda.">
        <Field label="3.1 Qual o motivo da contratação?" note="Descrição detalhada de como os serviços suprem a demanda.">
            <div className="relative">
                <textarea name="motivoContratacao" value={data.motivoContratacao} onChange={handleChange} className={`${inputClasses} h-32 pr-10`} />
                <AiAssistant fieldName="Motivo da Contratação (Resumo ETP)" onGeneratedText={(t) => setData(prev => ({...prev, motivoContratacao: t}))} />
            </div>
        </Field>
      </Section>

      <Section title="4. NATUREZA E GARANTIA DO SERVIÇO">
        <Field label="4.1 Natureza">
            <p className="dark:text-gray-300">{continuado ? 'Serviço comum de natureza continuada, sem dedicação exclusiva de mão de obra.' : data.naturezaServico === 'nao_continuado' ? 'Serviço comum de natureza não continuada.' : 'Selecione a natureza no topo da página.'}</p>
            {continuado && (
                <div className="mt-2">
                    <Field label="Justificativa da natureza continuada" required note="Indicar a essencialidade do serviço e a vantajosidade da prorrogação.">
                        <textarea name="justificativaContinuado" value={data.justificativaContinuado} onChange={handleChange} className={`${inputClasses} h-28`} />
                    </Field>
                </div>
            )}
        </Field>
        <Field label="4.2 Haverá garantia do serviço?">
            <RadioGroup name="garantiaServico" value={data.garantiaServico} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
            {data.garantiaServico === 'sim' && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-inner dark:text-gray-300 text-sm">
                    De acordo com o estudo técnico preliminar, o contratado deverá prestar garantia pelos serviços prestados de, no mínimo,
                    <input type="number" min="1" name="garantiaServicoMeses" value={data.garantiaServicoMeses} onChange={handleChange} className="w-20 mx-2 p-1 border-b border-gray-400 bg-transparent text-center font-bold dark:text-white outline-none" placeholder="N" />
                    {Number(data.garantiaServicoMeses) === 1 ? 'mês' : 'meses'}, após a sua conclusão.
                </div>
            )}
        </Field>
      </Section>

      <Section title="5. CRITÉRIOS DE SELEÇÃO" instruction="Formas de contratação e julgamento baseados na Lei Federal nº 14.133/21.">
        <FormaContratacaoField {...shared} sec={5} />
        <CriteriosSelecaoFields {...shared} sec={5} />
      </Section>

      <Section title="6. REQUISITOS DA CONTRATADA">
        <HabilitacoesFields {...shared} sec={6} />
        <QualificacaoTecnicaFields {...shared} sec={6} options={QUALIFICACOES_SERVICOS} comLegislacao />
        <SustentabilidadeRiscosFields {...shared} sec={6} />
        <ConsorcioSubcontratacaoFields {...shared} sec={6} />
        <Field label="6.10 Há previsão de vistoria?">
            <RadioGroup name="vistoria" value={data.vistoria} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
            {data.vistoria === 'sim' && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-inner space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                        <Field label="Período — de"><input type="date" name="vistoriaDataInicio" value={data.vistoriaDataInicio} onChange={handleChange} className={inputClasses} /></Field>
                        <Field label="Período — a"><input type="date" name="vistoriaDataFim" value={data.vistoriaDataFim} onChange={handleChange} className={inputClasses} /></Field>
                        <Field label="Horário — das"><input type="time" name="vistoriaHorarioInicio" value={data.vistoriaHorarioInicio} onChange={handleChange} className={inputClasses} /></Field>
                        <Field label="Horário — às"><input type="time" name="vistoriaHorarioFim" value={data.vistoriaHorarioFim} onChange={handleChange} className={inputClasses} /></Field>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">O texto padrão (agendamento com servidor do órgão e declaração de renúncia à vistoria) é incluído automaticamente no PDF.</p>
                </div>
            )}
        </Field>
      </Section>

      <Section title="7. FORMA DE PRESTAÇÃO DO SERVIÇO">
        <Field label="7.1 Como o serviço será prestado?">
            <RadioGroup name="formaPrestacao" value={data.formaPrestacao} options={[
                {val: 'ordem_servico', label: 'O serviço será prestado conforme emissão de ordem de serviço.'},
                {val: 'inicio_imediato', label: 'O serviço terá início imediato a partir da assinatura do contrato, contudo a prestação poderá estar sujeita à emissão de ordem de serviço pelo fiscal do contrato.'}
            ]} onChange={handleChange} />
        </Field>
        <Field label="7.2 Local e hora da prestação do serviço">
            <textarea name="localPrestacao" value={data.localPrestacao} onChange={handleChange} className={`${inputClasses} h-20`} placeholder="Endereço completo com CEP" />
            <div className="grid grid-cols-2 gap-4 mt-2">
                <Field label="Horário — das"><input type="time" name="horarioPrestacaoInicio" value={data.horarioPrestacaoInicio} onChange={handleChange} className={inputClasses} /></Field>
                <Field label="Horário — às"><input type="time" name="horarioPrestacaoFim" value={data.horarioPrestacaoFim} onChange={handleChange} className={inputClasses} /></Field>
            </div>
        </Field>
        {continuado && (
            <Field label="7.3 Periodicidade de execução" note="Ex.: diária, semanal, mensal.">
                <input type="text" name="periodicidadeExecucao" value={data.periodicidadeExecucao} onChange={handleChange} className={inputClasses} placeholder="Ex: semanal" />
            </Field>
        )}
      </Section>

      <Section title="8. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO">
        <Field label="8.1 Prazo do contrato (meses)" required={continuado}>
            <input type="number" min="1" name="prazoContrato" value={data.prazoContrato} onChange={handleChange} className={`${inputClasses} w-32`} placeholder="Ex: 12" />
        </Field>
        <Field label="8.2 Haverá possibilidade de prorrogação?">
            <RadioGroup name="possibilidadeProrrogacao" value={data.possibilidadeProrrogacao} options={[{val: 'sim', label: 'Sim.'}, {val: 'nao', label: 'Não.'}]} onChange={handleChange} />
            {data.possibilidadeProrrogacao === 'sim' && (
                <div className="mt-2">
                    <Field label="Fundamento legal (editável)" note={continuado ? 'Serviço continuado: arts. 106 e 107 da Lei nº 14.133/21.' : 'Serviço não continuado: art. 111 da Lei nº 14.133/21.'}>
                        <input type="text" name="prorrogacaoFundamento" value={data.prorrogacaoFundamento} onChange={handleChange} className={inputClasses} />
                    </Field>
                </div>
            )}
        </Field>
        <Field label="8.3 Forma de pagamento" required>
            <div className="bg-white dark:bg-gray-800 p-4 border rounded-md shadow-inner space-y-3 dark:text-gray-300 text-sm">
                <p>Meio: ordem bancária, em conta corrente da contratada no Banco do Estado do Pará.</p>
                <div className="flex flex-wrap items-center gap-1">
                    Prazo de pagamento: até
                    <input type="text" name="pagamentoPrazoDias" value={data.pagamentoPrazoDias} onChange={handleChange} className="w-28 border-b border-gray-400 bg-transparent text-center outline-none px-1" placeholder="30 (trinta)" />
                    dias corridos, a contar do recebimento da nota fiscal (ou fatura) com o comprovante de regularidade fiscal da contratada.
                </div>
                <p>Regularidade fiscal: consulta ao SICAF/Cadastramento Unificado de Licitante ou, quando não for possível, documentos do art. 68 da Lei nº 14.133/21.</p>
                {continuado && (
                    <Field label="Periodicidade do pagamento">
                        <RadioGroup name="pagamentoPeriodicidade" value={data.pagamentoPeriodicidade} options={[{val: 'mensal', label: 'Mensal.'}, {val: 'ordem_servico', label: 'Por ordem de serviço.'}]} onChange={handleChange} />
                    </Field>
                )}
            </div>
        </Field>
        <GarantiaContratoField {...shared} sec={8} n={4} naoHaJustificativa />
        <Field label="8.5 Reajuste" required={continuado}>
            {continuado ? (
                <div className="space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">Serviço continuado: reajuste obrigatório (art. 25, § 7º, da Lei nº 14.133/21).</p>
                    <ReajusteCampos {...shared} />
                    <Field label="Data-base do reajuste" required>
                        <input type="text" name="reajusteDataBase" value={data.reajusteDataBase} onChange={handleChange} className={inputClasses} placeholder="Ex: data da apresentação da proposta / data do orçamento estimado" />
                    </Field>
                </div>
            ) : (
                <>
                    <RadioGroup name="reajusteHavera" value={data.reajusteHavera} options={[{val: 'nao', label: 'Não haverá reajuste.'}, {val: 'sim', label: 'Haverá reajuste.'}]} onChange={handleChange} />
                    {data.reajusteHavera === 'sim' && <div className="mt-2"><ReajusteCampos {...shared} /></div>}
                </>
            )}
        </Field>
      </Section>

      <PrevisaoOrcamentariaSection {...shared} sec={9} />

      <AssinaturaSection {...shared} />
    </div>
  );
};
