import jsPDF from 'jspdf';
import { TrServicosData } from '../../types';
import {
    generateTrPdf, TrPdfCtx,
    pushAgrupamentoEDescricao, pushCriteriosSelecaoComuns, pushHabilitacoes,
    pushQualificacaoTecnica, pushSustentabilidadeRiscosConsorcio,
    textoReajuste, textoGarantiaContrato, pushPrevisaoOrcamentaria
} from './trCommonGenerator';

export const TITULO_SERVICO_NAO_CONTINUADO = 'TERMO DE REFERÊNCIA DE SERVIÇOS SEM MÃO-DE-OBRA';
export const TITULO_SERVICO_CONTINUADO = 'TERMO DE REFERÊNCIA DE SERVIÇOS SEM DEDICAÇÃO EXCLUSIVA DE MÃO DE OBRA';

const mapQualificacaoServicos: Record<string, string> = {
    'ciencia': 'Declaração de ciência das informações necessárias para o cumprimento da futura obrigação contratual.',
    'registro': 'Registro na entidade profissional competente.',
    'pessoal': 'Indicação de pessoal técnico, instalações e aparelhamento para o cumprimento da futura obrigação contratual, com a comprovação de qualificação técnica de cada membro da equipe técnica responsável pela execução dos trabalhos.',
    'atestado_responsabilidade': 'Atestado de responsabilidade técnica, relativo à qualificação técnico-profissional, com comprovação de registro em conselho profissional competente, quando for o caso.',
    'atestado_capacidade': 'Atestado de capacidade, relativo à qualificação técnico-operacional.',
    'lei_especial': 'Outro requisito previsto em lei especial.',
    'nao_exigida': 'Não será exigida prova de qualificação técnica em razão da baixa complexidade da contratação.'
};

// "2026-10-20" -> "20/10/2026"
const dataBr = (iso?: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : 'dd/mm/aaaa';
};
// "08:30" -> "08h30m"
const horaBr = (hhmm?: string) => {
    const m = /^(\d{2}):(\d{2})/.exec(hhmm || '');
    return m ? `${m[1]}h${m[2]}m` : 'XXhYYm';
};

export const generateTrServicosPdf = (doc: jsPDF, d: TrServicosData) => {
    const continuado = d.naturezaServico === 'continuado';

    generateTrPdf(doc, d, {
        titulo: continuado ? TITULO_SERVICO_CONTINUADO : TITULO_SERVICO_NAO_CONTINUADO,
        buildRows: (c: TrPdfCtx) => {
            const { radio, pushHeader, pushRow } = c;

            pushAgrupamentoEDescricao(c);

            // 4. NATUREZA E GARANTIA DO SERVIÇO
            pushHeader(`4. NATUREZA E GARANTIA DO SERVIÇO\n(art. 6°, ${continuado ? 'XIII e XV' : 'XIII'}, da Lei Federal nº 14.133/21)`);
            if (continuado) {
                pushRow('4.1. NATUREZA', `Serviço comum de natureza continuada, sem dedicação exclusiva de mão de obra.\n\nJustificativa (essencialidade do serviço e vantajosidade da prorrogação): ${d.justificativaContinuado || '-'}`, true);
            } else {
                pushRow('4.1. NATUREZA', 'Serviço comum de natureza não continuada.');
            }
            const meses = Number(d.garantiaServicoMeses);
            pushRow('4.2. HAVERÁ GARANTIA DO SERVIÇO?', [
                `${radio(d.garantiaServico === 'sim')} Sim.${d.garantiaServico === 'sim' ? ` De acordo com o estudo técnico preliminar, o contratado deverá prestar garantia pelos serviços prestados de, no mínimo, ${d.garantiaServicoMeses || 'N'} ${meses === 1 ? 'mês' : 'meses'}, após a sua conclusão.` : ''}`,
                `${radio(d.garantiaServico === 'nao')} Não.`
            ].join('\n\n'), true);

            // 5. CRITÉRIOS DE SELEÇÃO
            pushHeader('5. CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)');
            const fC = d.formaContratacao || [];
            pushRow('5.1. FORMA DE CONTRATAÇÃO', [
                `${radio(fC.includes('inexigibilidade'))} Inexigibilidade de licitação, com fundamento no art. 74, ${d.inexigibilidadeInciso ? `inciso ${d.inexigibilidadeInciso}` : '...'}, da Lei Federal nº 14.133/21.`,
                `${radio(fC.includes('dispensa_valor'))} Dispensa de licitação em razão do valor*, com fundamento no art. 75, II, da Lei Federal nº 14.133/21.\n* Nesta hipótese, deve-se utilizar preferencialmente a dispensa eletrônica.`,
                `${radio(fC.includes('dispensa_art75'))} Dispensa de licitação, com fundamento no art. 75, ${d.dispensaInciso ? `inciso ${d.dispensaInciso}` : '...'}, da Lei Federal nº 14.133/21.`,
                `${radio(fC.includes('pregao'))} Pregão eletrônico.`
            ].join('\n\n'), true);
            pushCriteriosSelecaoComuns(c, 5);

            // 6. REQUISITOS DA CONTRATADA
            pushHeader('6. REQUISITOS DA CONTRATADA\n(arts. 67 a 70 da Lei Federal nº 14.133/21)');
            pushHabilitacoes(c, 6);
            pushQualificacaoTecnica(c, 6, mapQualificacaoServicos, true);
            pushSustentabilidadeRiscosConsorcio(c, 6);
            const vistoriaTexto = `O licitante deverá realizar vistoria nas instalações do local de execução dos serviços no período de ${dataBr(d.vistoriaDataInicio)} a ${dataBr(d.vistoriaDataFim)}, no horário de ${horaBr(d.vistoriaHorarioInicio)} às ${horaBr(d.vistoriaHorarioFim)}, mediante agendamento para acompanhamento de servidor do órgão.\nCaso o licitante não tenha interesse na vistoria, deverá firmar declaração nesse sentido, concordando com as condições do local de trabalho, renunciando à possibilidade de alegar desconhecimento das instalações posteriormente.`;
            pushRow('6.10. HÁ PREVISÃO DE VISTORIA?', `${radio(d.vistoria === 'sim')} Sim. ${d.vistoria === 'sim' ? vistoriaTexto : ''}\n\n${radio(d.vistoria === 'nao')} Não.`, true);

            // 7. FORMA DE PRESTAÇÃO DO SERVIÇO
            pushHeader('7. FORMA DE PRESTAÇÃO DO SERVIÇO');
            pushRow('7.1. COMO O SERVIÇO SERÁ PRESTADO?', [
                `${radio(d.formaPrestacao === 'ordem_servico')} O serviço será prestado conforme emissão de ordem de serviço.`,
                `${radio(d.formaPrestacao === 'inicio_imediato')} O serviço terá início imediato a partir da assinatura do contrato, contudo a prestação poderá estar sujeita à emissão de ordem de serviço pelo fiscal do contrato.`
            ].join('\n\n'), true);
            pushRow('7.2. LOCAL E HORA DA PRESTAÇÃO DO SERVIÇO', `O serviço deve ser prestado no endereço ${d.localPrestacao || '(indicar endereço completo com CEP)'}, no horário de ${horaBr(d.horarioPrestacaoInicio)} às ${horaBr(d.horarioPrestacaoFim)}.`, true);
            if (continuado) {
                pushRow('7.3. PERIODICIDADE DE EXECUÇÃO', d.periodicidadeExecucao || '-', true);
            }

            // 8. PRAZO, PAGAMENTO E GARANTIA
            pushHeader('8. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO\n(art. 92 da Lei Federal nº 14.133/21)');
            const prazo = Number(d.prazoContrato);
            pushRow('8.1. PRAZO DO CONTRATO', d.prazoContrato ? `${d.prazoContrato} ${prazo === 1 ? 'mês' : 'meses'}.` : '-');
            pushRow('8.2. HAVERÁ POSSIBILIDADE DE PRORROGAÇÃO?', [
                `${radio(d.possibilidadeProrrogacao === 'sim')} Sim, ${d.prorrogacaoFundamento || (continuado ? 'com fundamento nos arts. 106 e 107 da Lei Federal nº 14.133/21.' : 'com fundamento no art. 111 da Lei Federal nº 14.133/21.')}`,
                `${radio(d.possibilidadeProrrogacao === 'nao')} Não.`
            ].join('\n\n'), true);
            const periodicidadePg = continuado
                ? `\nPeriodicidade: ${d.pagamentoPeriodicidade === 'ordem_servico' ? 'por ordem de serviço' : d.pagamentoPeriodicidade === 'mensal' ? 'mensal' : '-'}.`
                : '';
            pushRow('8.3. FORMA DE PAGAMENTO', `Meio: Ordem bancária.\nOnde: Conta corrente da contratada no Banco do Estado do Pará.\nQual o prazo: Até ${d.pagamentoPrazoDias || 'X'} dias corridos, a contar do recebimento da nota fiscal (ou fatura) com o comprovante de regularidade fiscal da contratada.${periodicidadePg}\nProva da regularidade fiscal: A regularidade fiscal pode ser provada:\n1. por consulta ao SICAF ou Cadastramento Unificado de Licitante; ou\n2. pela apresentação dos documentos constantes no art. 68 da Lei Federal nº 14.133/21, quando não for possível consultar aos sistemas oficiais.`, true);
            pushRow('8.4. GARANTIA DE CONTRATO', textoGarantiaContrato(c), true);

            let textoReaj: string;
            if (continuado) {
                textoReaj = `${textoReajuste(d)}\nData-base: ${d.reajusteDataBase || '-'} (art. 25, § 7º, da Lei Federal nº 14.133/21).`;
            } else {
                textoReaj = d.reajusteHavera === 'sim' ? textoReajuste(d) : 'Não haverá reajuste.';
            }
            pushRow('8.5. REAJUSTE', textoReaj, true);

            pushPrevisaoOrcamentaria(c, 9);
        }
    });
};
