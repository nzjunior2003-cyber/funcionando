import jsPDF from 'jspdf';
import { TrBensData } from '../../types';
import { sanitizeText } from './pdfUtils';
import {
    generateTrPdf, TrPdfCtx, mapQualificacaoTecnica,
    pushAgrupamentoEDescricao, pushCriteriosSelecaoComuns, pushHabilitacoes,
    pushQualificacaoTecnica, pushSustentabilidadeRiscosConsorcio,
    textoReajuste, textoGarantiaContrato, pushPrevisaoOrcamentaria
} from './trCommonGenerator';

export const generateTrBensPdf = (doc: jsPDF, bens: TrBensData) => {
    generateTrPdf(doc, bens, {
        titulo: "TERMO DE REFERÊNCIA DE BENS COMUNS",
        buildRows: (c: TrPdfCtx) => {
    const data = bens;
    const { radio, pushHeader, pushRow, pushFullRow, numerosImpressos } = c;

    pushAgrupamentoEDescricao(c);

    pushHeader('4. NATUREZA DO BEM\n(art. 6°, XXIII, a, da Lei Federal nº 14.133/21)');
    pushFullRow(`${radio(data.naturezaBem === 'comum')} Comum.\n\n${radio(data.naturezaBem === 'especial')} Especial.`, false);

    pushHeader('5. PROVA DE QUALIDADE, RENDIMENTO, DURABILIDADE E SEGURANÇA\n(art. 40, § 1°, I e III, da Lei Federal nº 14.133/21)');
    pushRow('5.1. HAVERÁ PROVA DE QUALIDADE?', `${radio(data.provaQualidade === 'sim')} Sim. Justificativa: ${data.justificativaProvaQualidade || '-'}\n\n${radio(data.provaQualidade === 'nao')} Não.`, true);
    const amostraTextoPadrao = `Será requerida apresentação de AMOSTRA a ser entregue no local indicado no chat da sessão pública e dentro de ${data.amostraPrazo || 'xx (xxxx)'} dias úteis, contados do dia posterior à solicitação, sendo incluído o último dia na contagem; podendo ser prorrogado a critério da administração e, se devidamente justificado pelo licitante e, em tempo hábil, qual seja, antes de findo o prazo concedido.\n\nNo caso de a amostra ser apresentada fora das especificações e havendo tempo hábil previsto no item acima, poderá o Pregoeiro solicitar a devida adequação.\n\nOs exemplares colocados à disposição da Administração serão tratados como protótipos, podendo ser manuseados e desmontados pela equipe técnica responsável pela análise, não gerando direito a ressarcimento.\n\nApós a análise definitiva da amostra pelo setor responsável, o pregoeiro informará o licitante para que faça a retirada da amostra no prazo de até ${data.amostraPrazoRetirada || 'xx (xxx)'} dias úteis, após o qual, se não retiradas, poderão ser descartadas ou usadas pela Administração, sem direito a ressarcimento. Em casos excepcionais, poderá a administração liberar a amostra para retirada somente após a entrega do primeiro pedido, para que seja verificada a compatibilidade entre o produto ofertado e o efetivamente entregue.`;
    const amostraJustificativa = data.justificativaAmostra ? `Justificativa: ${data.justificativaAmostra}\n\n` : '';
    pushRow('5.2. O EDITAL EXIGIRÁ AMOSTRA?', `${radio(data.amostra === 'sim')} Sim.\n\n${data.amostra === 'sim' ? amostraJustificativa + amostraTextoPadrao : ''}\n\n${radio(data.amostra === 'nao')} Não.`, true);

    const periodosGarantia = (data.garantiaPeriodos || []).filter(p => p.itemIds.length > 0);
    let garantiaDetalhe: string;
    if (periodosGarantia.length > 0) {
        garantiaDetalhe = periodosGarantia.map((p, i) => {
            const linhas = p.itemIds.map(id => data.itens.find(it => it.id === id)).filter(Boolean).map(it => {
                const nums = (numerosImpressos.get(it!.id) || [it!.item || '-']).join(' / ');
                return `Item ${nums} – ${sanitizeText(it!.descricao)}`;
            });
            return `Garantia de ${p.meses || '-'} meses:\n${linhas.join('\n')}`;
        }).join('\n\n');
    } else {
        garantiaDetalhe = `Itens: ${data.garantiaItens || '-'}. Prazo: ${data.garantiaBemMeses || '-'} meses.`;
    }
    pushRow('5.3. HAVERÁ GARANTIA DO BEM?', `${radio(data.garantiaBem === 'sim')} Sim.${data.garantiaBem === 'sim' ? '\n' + garantiaDetalhe : ''}\n\n${radio(data.garantiaBem === 'nao')} Não.`, true);
    pushRow('5.4. HAVERÁ ASSISTÊNCIA TÉCNICA?', `${radio(data.assistenciaTecnica === 'sim')} Sim. Itens: ${data.assistenciaTecnicaItens || '-'}. Prazo: ${data.assistenciaTecnicaMeses || '-'} meses.\nMODO: ${data.assistenciaTecnicaModo === 'propria' ? 'Própria' : 'Empresa Credenciada'}\n\n${radio(data.assistenciaTecnica === 'nao')} Não.`, true);

    pushHeader('6. CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)');
    const fC = data.formaContratacao || [];
    pushRow('6.1. FORMA DE CONTRATAÇÃO', [
        `${radio(fC.includes('inexigibilidade'))} Inexigibilidade (Art. 74, Inciso ${data.inexigibilidadeInciso || '...'})`,
        `${radio(fC.includes('dispensa_valor'))} Dispensa por Valor (Art. 75, II)`,
        `${radio(fC.includes('dispensa_art75'))} Dispensa (Art. 75, Inciso ${data.dispensaInciso || '...'})`,
        `${radio(fC.includes('pregao'))} Pregão eletrônico`,
        `${radio(fC.includes('pregao_rp'))} Pregão para Registro de Preços`,
        `${radio(fC.includes('adesao_ata'))} Adesão à Ata de Registro de Preços`
    ].join('\n\n'));
    pushCriteriosSelecaoComuns(c, 6);

    pushHeader('7. REQUISITOS DA CONTRATADA\n(arts. 67 a 70 da Lei Federal nº 14.133/21)');
    pushHabilitacoes(c, 7);
    pushQualificacaoTecnica(c, 7, mapQualificacaoTecnica);
    pushSustentabilidadeRiscosConsorcio(c, 7);

    pushHeader('8. FORMA DE ENTREGA DO BEM\n(art. 40, § 1°, II, da Lei Federal nº 14.133/21)');
    pushRow('8.1. FORMA', data.formaEntregaTipo === 'unica' ? 'Integral de uma só vez.' : `Parcelada em ${data.entregaParcelasX || '-'} parcelas. A 1ª em até ${data.entregaParcelasY || '-'} dias da nota de empenho, e as demais mediante aviso com ${data.entregaParcelasZ || '-'} dias de antecedência.`, true);
    pushRow('8.2. LOCAL E HORA', data.localEntrega || '-', true);
    pushRow('8.3. PRAZO MÁXIMO DE VALIDADE', data.prazoValidadePereciveis ? `O prazo de validade não poderá ser inferior a ${data.prazoValidadePereciveis} dias da entrega.` : 'Não se aplica (bem não perecível).', true);

    pushHeader('9. PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO\n(art. 92 da Lei Federal nº 14.133/21)');
    pushRow('9.1. PRAZO DO CONTRATO', `${data.prazoContrato === '30' ? '30 dias (Pronta Entrega)' : '12 meses'}.`);
    pushRow('9.2. HAVERÁ POSSIBILIDADE DE PRORROGAÇÃO?', data.possibilidadeProrrogacao === 'sim' ? 'Sim, nas hipóteses do art. 111 da Lei Federal nº 14.133/21.' : 'Não.');


    const pgOpts = data.pagamentoOpcoes || [];
    let pgText = '';
    if(pgOpts.includes('ordem_bancaria')) pgText += '• O pagamento será realizado por ordem bancária creditada em conta corrente.\n';
    if(pgOpts.includes('banpara')) pgText += '• Banco do Estado do Pará - BANPARÁ.\n';
    if(pgOpts.includes('qualquer_banco')) pgText += '• Qualquer instituição bancária indicada pela contratada.\n';
    if(pgOpts.includes('prazo_NF')) pgText += `• O prazo para pagamento será de até ${data.pagamentoPrazoDias || '30'} dias corridos após o recebimento da nota fiscal.\n`;
    if(pgOpts.includes('regularidade')) pgText += `• Prova da Regularidade Fiscal: ${data.pagamentoRegularidade || 'Conforme Edital'}\n`;
    pushRow('9.3. PAGAMENTO', pgText || 'Conforme Edital.', true);

    pushRow('9.4. GARANTIA DE CONTRATO', textoGarantiaContrato(c), true);
    pushRow('9.5. REAJUSTE', textoReajuste(data));

    pushPrevisaoOrcamentaria(c, 10);
        }
    });
};
