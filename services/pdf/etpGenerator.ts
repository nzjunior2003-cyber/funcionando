import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { EtpData } from '../../types';
import { 
    drawInstitutionalHeader,
    drawInstitutionalFooter,
    drawFormattedSignature, 
    formatDate, 
    formatCurrency,
    setDefaultFont,
    checkPageBreak
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM } from './pdfConstants';

export const generateEtpPdf = (doc: jsPDF, data: EtpData) => {
    // 1. Configurações de Margem
    const L_MARGIN = 10;
    const R_MARGIN = 10;
    const tableWidth = PAGE_WIDTH - L_MARGIN - R_MARGIN;

    // 2. Cabeçalho
    const title = `ESTUDO TÉCNICO PRELIMINAR Nº ${data.numero || 'XX'}/${data.ano || '2024'}`;
    const subTitle = `PAE nº ${data.pae || 'aaaa/nnnn'}`;
    let y = drawInstitutionalHeader(doc, data.setor || '', title, subTitle);

    const colorBlueHeader: [number, number, number] = [31, 78, 121]; 
    const colorWhite: [number, number, number] = [255, 255, 255];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorRedImpact: [number, number, number] = [244, 204, 204];
    const colorBlueMitigation: [number, number, number] = [207, 226, 243];

    setDefaultFont(doc);

    // Helpers para Checkbox e Radio
    const checkbox = (checked: boolean) => checked ? '[X]' : '[  ]';
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';
    
    const hasItem = (arr: string[] | undefined, keyword: string) => {
        if (!arr || !Array.isArray(arr)) return false;
        return arr.some(item => typeof item === 'string' && item.toLowerCase().includes(keyword.toLowerCase()));
    };

    let labelCounter = 0;
    const getNextLabelColor = (): [number, number, number] => {
        const color = labelCounter % 2 === 0 ? colorGrayLabel : colorWhite;
        labelCounter++;
        return color;
    };

    const questionStyle = (color: [number, number, number]) => ({
        fillColor: color,
        fontStyle: 'normal' as const,
        halign: 'right' as const,
        fontSize: 8,
        valign: 'middle' as const
    });

    const sectionHeaderStyle = {
        fillColor: colorBlueHeader, 
        textColor: 255, 
        halign: 'center' as const, 
        fontStyle: 'bold' as const, 
        fontSize: 10, 
        valign: 'middle' as const
    };

    const body: RowInput[] = [];

    // --- SEÇÃO 1: NECESSIDADE ---
    body.push([{ content: '1 – DESCRIÇÃO DA NECESSIDADE\n(art. 18, §1º, I, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '1.1 - QUAL A NECESSIDADE A SER ATENDIDA?', styles: questionStyle(getNextLabelColor()) },
        { content: data.necessidade || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // --- SEÇÃO 2: MERCADO ---
    body.push([{ content: '2 – LEVANTAMENTO DE MERCADO\n(arts. 18, §1º, V, e 44 da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    
    const f = data.fontesPesquisa || [];
    const fontesTexto = [
        `${checkbox(hasItem(f, 'fornecedores'))} Consulta a fornecedores.`,
        `${checkbox(hasItem(f, 'similares'))} Contratações similares.`,
        `${checkbox(hasItem(f, 'internet'))} Internet.`,
        `${checkbox(hasItem(f, 'pública') || hasItem(f, 'publica'))} Audiência pública.`,
        `${checkbox(hasItem(f, 'outro'))} Outro. Especificar: ${data.fonteOutro || "..."}`
    ].join('\n');

    body.push([
        { content: '2.1 - ONDE FORAM PESQUISADAS AS POSSÍVEIS SOLUÇÕES?', styles: questionStyle(getNextLabelColor()) },
        { content: fontesTexto, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '2.2 - JUSTIFICATIVA TÉCNICA E ECONÔMICA PARA A ESCOLHA DA MELHOR SOLUÇÃO', styles: questionStyle(getNextLabelColor()) },
        { content: data.justificativaTecnica || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);
    body.push([
        { content: '2.3 - HÁ RESTRIÇÃO DE FORNECEDORES?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.restricaoFornecedores === 'sim')} Sim.\n${radio(data.restricaoFornecedores === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 3: REQUISITOS ---
    body.push([{ content: '3 – DESCRIÇÃO DOS REQUISITOS DE CONTRATAÇÃO\n(art. 18, §1º, III, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    
    const t = data.tipoObjeto || [];
    const tipoObjetoTxt = [
        `${checkbox(hasItem(t, 'bem'))} Bem.`,
        `${checkbox(hasItem(t, 'servico'))} Serviço.`,
        `${checkbox(hasItem(t, 'locacao'))} Locação de imóvel.`,
        `${checkbox(hasItem(t, 'obra'))} Obra ou serviço de engenharia.`
    ].join('\n');
    body.push([
        { content: '3.1 - QUAL O TIPO DE OBJETO?', styles: questionStyle(getNextLabelColor()) },
        { content: tipoObjetoTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.2 - QUAL A NATUREZA?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.natureza === 'continuada')} Continuada.\n${radio(data.natureza === 'nao-continuada')} Não continuada.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.3 - HÁ MONOPÓLIO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.monopolio === 'sim')} Sim, apenas um único fornecedor é capaz de atender a demanda.\n${radio(data.monopolio === 'nao')} Não, há mais de um fornecedor capaz de atender a demanda.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    
    const vigenciaTxt = [
        `${radio(data.vigencia === '30 dias (pronta entrega).')} 30 dias (pronta entrega).`,
        `${radio(data.vigencia === '180 dias.')} 180 dias.`,
        `${radio(data.vigencia === '12 meses.')} 12 meses.`,
        `${radio(data.vigencia === 'Indeterminado.')} Indeterminado.`,
        `${radio(data.vigencia === 'outro')} Outro: ${data.vigenciaOutroNum || ''} ${data.vigenciaOutroTipo || ''}`
    ].join('\n');
    body.push([
        { content: '3.4 - QUAL A VIGÊNCIA?', styles: questionStyle(getNextLabelColor()) },
        { content: vigenciaTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.5 - PODERÁ HAVER PRORROGAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.prorrogacao === 'sim')} Sim.\n${radio(data.prorrogacao === 'nao')} Não.\n${radio(data.prorrogacao === 'na')} Não se aplica (prazo indeterminado).`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.6 - HÁ TRANSIÇÃO COM CONTRATO ANTERIOR?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.transicao === 'sim')} Sim. Contrato nº: ${data.transicaoContrato || '...'} Prazo final: ${data.transicaoPrazo || '...'}\n${radio(data.transicao === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 3.7 Padrão Mínimo de Qualidade
    const qualItems = data.padraoQualidade || [];
    body.push([
        { content: '3.7 - PADRÃO MÍNIMO DE QUALIDADE', rowSpan: qualItems.length + 1, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Descrição detalhada', colSpan: 4, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } }
    ]);
    if (qualItems.length > 0) {
        qualItems.forEach((item, idx) => {
            body.push([
                { content: (idx + 1).toString(), styles: { halign: 'center' } },
                { content: item.descricao, colSpan: 4, styles: { halign: 'justify', valign: 'middle' } }
            ]);
        });
    }

    // 3.8 Sustentabilidade
    const s = data.sustentabilidade || [];
    const sustTxt = [
        `${checkbox(hasItem(s, 'reciclado') || hasItem(s, 'atóxico') || hasItem(s, 'biodegradável'))} Utilização de bens constituídos, no todo ou em parte, por material reciclado, atóxico e biodegradável.`,
        `${checkbox(hasItem(s, 'perigosas'))} Não utilização de bens e produtos com substâncias perigosas.`,
        `${checkbox(hasItem(s, 'certifica'))} Atendimento aos requisitos ambientais para a obtenção de certificação.`,
        `${checkbox(hasItem(s, 'ciclo'))} Maior ciclo de vida e menor custo de manutenção do bem.`,
        `${checkbox(hasItem(s, 'embalagem'))} Utilização, preferencial, de embalagem adequada.`,
        `${checkbox(hasItem(s, 'outro'))} Outro. Especificar: ${data.sustentabilidadeOutro || ''}`
    ].join('\n');
    body.push([
        { content: '3.8 - QUAIS CRITÉRIOS DE SUSTENTABILIDADE?', styles: questionStyle(getNextLabelColor()) },
        { content: sustTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 4: SOLUÇÃO ---
    body.push([{ content: '4 – DESCRIÇÃO DA SOLUÇÃO\n(art. 18, §1º, VII, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '4.1 - O QUE SERÁ CONTRATADO?', styles: questionStyle(getNextLabelColor()) },
        { content: data.solucaoContratacao || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.2 - QUAL O PRAZO DA GARANTIA CONTRATUAL?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.garantiaContratual === 'nao_ha')} Não há.\n${radio(data.garantiaContratual === '90_dias')} 90 dias.\n${radio(data.garantiaContratual === '12_meses')} 12 meses.\n${radio(data.garantiaContratual === 'outro')} Outro: ${data.garantiaOutroNum || ''} ${data.garantiaOutroTipo || ''}`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.3 - HÁ NECESSIDADE DE ASSISTÊNCIA TÉCNICA?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.assistenciaTecnica === 'sim')} Sim. Justificativa: ${data.justificativaAssistenciaTecnica || ''}\n${radio(data.assistenciaTecnica === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.4 - HÁ NECESSIDADE DE MANUTENÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.manutencao === 'sim')} Sim. (Contrato de manutenção).\n${radio(data.manutencao === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 5: DIMENSIONAMENTO ---
    body.push([{ content: '5 – DIMENSIONAMENTO DO OBJETO\n(art. 18, §1º, IV, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    
    const mQ = data.metodoQuantitativo || [];
    const metodosTxt = [
        `${checkbox(hasItem(mQ, 'anteriores'))} Análise de contratações anteriores.`,
        `${checkbox(hasItem(mQ, 'similares'))} Análise de contratações similares.`,
        `${checkbox(hasItem(mQ, 'atual'))} Levantamento atual.`,
        `${checkbox(hasItem(mQ, 'outro'))} Outro. Especificar: ${data.metodoOutro || ''}`
    ].join('\n');
    body.push([
        { content: '5.1 - COMO SE OBTEVE O QUANTITATIVO ESTIMADO?', styles: questionStyle(getNextLabelColor()) },
        { content: metodosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '5.2 - DESCRIÇÃO DO QUANTITATIVO', styles: questionStyle(getNextLabelColor()) },
        { content: data.descricaoQuantitativo || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // 5.3 Especificação
    const items = data.itens || [];
    body.push([
        { content: '5.3 - ESPECIFICAÇÃO', rowSpan: items.length + 1, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Descrição', colSpan: 2, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } }
    ]);
    items.forEach((item, idx) => {
        body.push([
            { content: (idx + 1).toString(), styles: { halign: 'center' } },
            { content: item.descricao, colSpan: 2, styles: { halign: 'justify', valign: 'middle' } },
            { content: item.unidade, styles: { halign: 'center' } },
            { content: item.quantidade.toString(), styles: { halign: 'center' } }
        ]);
    });

    // --- SEÇÃO 6: ESTIMATIVA DO VALOR ---
    body.push([{ content: '6 – ESTIMATIVA DO VALOR DA CONTRATAÇÃO\n(art. 18, §1º, VI, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    
    const mP = data.meiosPesquisa || [];
    const meiosTxt = [
        `${checkbox(hasItem(mP, 'painel'))} Painel de preços.`,
        `${checkbox(hasItem(mP, 'similares'))} Contratações similares.`,
        `${checkbox(hasItem(mP, 'simas'))} Simas.`,
        `${checkbox(hasItem(mP, 'fornecedores'))} Fornecedores.`,
        `${checkbox(hasItem(mP, 'internet'))} Internet.`,
        `${checkbox(hasItem(mP, 'outro'))} Outro. Especificar: ${data.meiosPesquisaOutro || ''}`
    ].join('\n');
    body.push([
        { content: '6.1 - MEIOS USADOS NA PESQUISA', styles: questionStyle(getNextLabelColor()) },
        { content: meiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 6.2 Estimativa de Preço
    const totalGeral = items.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);
    body.push([
        { content: '6.2 - ESTIMATIVA DE PREÇO', rowSpan: items.length + 2, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'V. Unitário', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } },
        { content: 'V. Total', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 8 } }
    ]);
    items.forEach((item, idx) => {
        body.push([
            { content: (idx + 1).toString(), styles: { halign: 'center' } },
            { content: item.descricao, styles: { halign: 'justify', valign: 'middle' } },
            { content: formatCurrency(item.valorUnitario), styles: { halign: 'right' } },
            { content: item.quantidade.toString(), styles: { halign: 'center' } },
            { content: formatCurrency(item.quantidade * item.valorUnitario), styles: { halign: 'right' } }
        ]);
    });
    body.push([
        { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader, fontSize: 10 } },
        { content: formatCurrency(totalGeral), styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader, fontSize: 10 } }
    ]);

    // --- SEÇÃO 7: PARCELAMENTO ---
    body.push([{ content: '7 – JUSTIFICATIVA PARA O PARCELAMENTO DA SOLUÇÃO\n(art. 18, §1º, VIII, art. 40, V, b, 47, II, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '7.1 - A SOLUÇÃO SERÁ DIVIDIDA EM ITENS?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.parcelamento === 'sim')} Sim.         ${radio(data.parcelamento === 'nao')} Não.`, colSpan: 5, styles: { valign: 'middle', halign: 'left' } }
    ]);

    if (data.parcelamento === 'nao') {
        const mN = data.motivosNaoParcelamento || [];
        const motivosTxt = [
            `${checkbox(hasItem(mN, 'indivisível'))} Objeto indivisível.`,
            `${checkbox(hasItem(mN, 'escala'))} Perda de escala.`,
            `${checkbox(hasItem(mN, 'tecnicamente'))} Tecnicamente inviável.`,
            `${checkbox(hasItem(mN, 'economicamente'))} Economicamente inviável.`,
            `${checkbox(hasItem(mN, 'competitividade'))} Aproveitamento da competitividade.`,
            `${checkbox(hasItem(mN, 'outro'))} Outro. Especificar: ${data.motivosNaoParcelamentoOutro || ''}`
        ].join('\n');

        body.push([
            { content: 'Por quê?', styles: { ...questionStyle(getNextLabelColor()), fontStyle: 'bold' } },
            { content: motivosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
        ]);
    }

    // --- SEÇÃO 8: CONTRATAÇÕES CORRELATAS ---
    body.push([{ content: '8 – CONTRATAÇÕES CORRELATAS OU INTERDEPENDENTES\n(art. 18, §1º, XI, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '8.1 - HÁ CONTRATAÇÕES CORRELATAS OU INTERDEPENDENTES?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.contratacoesCorrelatas === 'sim')} Sim. Especificar: ${data.contratacoesCorrelatasEspecificar || ''}\n${radio(data.contratacoesCorrelatas === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 9: PLANEJAMENTO ---
    body.push([{ content: '9 – ALINHAMENTO DA CONTRATAÇÃO COM O PLANEJAMENTO\n(art. 18, §1º, II, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '9.1 - HÁ PREVISÃO NO PLANO DE CONTRATAÇÕES ANUAL?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.previsaoPCA === 'sim')} Sim. Especificar item do PCA: ${data.itemPCA || 'nn'}\n${radio(data.previsaoPCA === 'nao')} Não. Justificativa e providências: ${data.justificativaPCA || ''}`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 10: RESULTADOS ---
    body.push([{ content: '10 – RESULTADOS PRETENDIDOS\n(art. 18, §1º, IX, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    const b = data.beneficios || [];
    const beneficiosTxt = [
        `${checkbox(hasItem(b, 'administrativo'))} Manutenção do Funcionamento Administrativo`,
        `${checkbox(hasItem(b, 'custos'))} Redução de Custos`,
        `${checkbox(hasItem(b, 'recursos humanos'))} Aproveitamento de Recursos Humanos`,
        `${checkbox(hasItem(b, 'eficiência'))} Ganho de Eficiência`,
        `${checkbox(hasItem(b, 'consumo'))} Serviço/Bem de Consumo`,
        `${checkbox(hasItem(b, 'política'))} Realização de Política Pública`,
        `${checkbox(hasItem(b, 'outro'))} Outro. Especificar: ${data.beneficiosOutro || ''}`
    ].join('\n');
    body.push([
        { content: '10.1 - QUAIS OS BENEFÍCIOS PRETENDIDOS NA CONTRATAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: beneficiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 11: PENDÊNCIAS ---
    body.push([{ content: '11 – PENDÊNCIAS RELATIVAS À CONTRATAÇÃO\n(art. 18, §1º, X, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '11.1 - HÁ PROVIDÊNCIAS PENDENTES PARA O SUCESSO DA CONTRATAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.pendencias === 'sim')} Sim. Especificar: ${data.pendenciasEspecificar || ''}\n${radio(data.pendencias === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '11.2 - QUAIS SÃO OS SETORES RESPONSÁVEIS PELAS PROVIDÊNCIAS PENDENTES?', styles: questionStyle(getNextLabelColor()) },
        { content: data.pendenciasResponsaveis || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // --- SEÇÃO 12: IMPACTOS AMBIENTAIS ---
    body.push([{ content: '12 – IMPACTOS AMBIENTAIS E MEDIDAS DE MITIGAÇÃO\n(art. 18, §1º, XII, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '12.1 - HÁ PREVISÃO DE IMPACTO AMBIENTAL NA CONTRATAÇÃO?', rowSpan: 2, styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.impactoAmbiental === 'sim')} Sim.\n${radio(data.impactoAmbiental === 'nao')} Não.`, rowSpan: 2, styles: { valign: 'middle', halign: 'left', cellWidth: 20 } },
        { content: `Impactos:\n${data.impactos || ''}`, colSpan: 4, styles: { fillColor: colorRedImpact, halign: 'justify', fontSize: 9 } }
    ]);
    body.push([
        { content: `Medidas de mitigação:\n${data.medidasMitigacao || ''}`, colSpan: 4, styles: { fillColor: colorBlueMitigation, halign: 'justify', fontSize: 9 } }
    ]);

    // --- SEÇÃO 13: DECLARAÇÃO DE VIABILIDADE ---
    body.push([{ content: '13 – DECLARAÇÃO DE VIABILIDADE DA CONTRATAÇÃO\n(art. 18, §1º, XIII, da Lei Federal nº 14.133/21)', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { 
            content: '13.1 - A CONTRATAÇÃO POSSUI VIABILIDADE TÉCNICA, SOCIOECONÔMICA E AMBIENTAL?', 
            colSpan: 4,
            styles: { ...questionStyle(getNextLabelColor()), halign: 'left', fontSize: 9 } 
        }, 
        { 
            content: `${radio(data.viabilidade === 'sim')} Sim.         ${radio(data.viabilidade === 'nao')} Não.`, 
            colSpan: 2, 
            styles: { valign: 'middle', halign: 'left' } 
        }
    ]);

    autoTable(doc, {
        startY: y,
        body: body,
        theme: 'grid',
        margin: { left: L_MARGIN, right: R_MARGIN },
        tableWidth: tableWidth,
        styles: { 
            font: 'helvetica',
            fontSize: 10,
            // AQUI ESTÁ A MÁGICA DO PADDING À DIREITA: 3 milímetros de distância!
            cellPadding: { top: 1.2, right: 3, bottom: 1.2, left: 1.2 },
            lineColor: 0, 
            lineWidth: 0.1,
            textColor: 0,
            valign: 'middle',
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 40 }
        },
        willDrawCell: (hookData) => {
            if (hookData.section === 'body') {
                const cell = hookData.cell;
                if (!cell.text || !Array.isArray(cell.text)) return;
                (cell as any).checkboxes = [];
                
                for (let i = 0; i < cell.text.length; i++) {
                    let replacedLine = cell.text[i];
                    let searchIdx = 0;
                    
                    while(true) {
                        let openIdx = replacedLine.indexOf('[', searchIdx);
                        if (openIdx === -1) break;
                        let closeIdx = replacedLine.indexOf(']', openIdx);
                        if (closeIdx === -1) break;

                        let inside = replacedLine.substring(openIdx + 1, closeIdx);
                        
                        if (inside.trim() === 'X' || inside.trim() === '') {
                            let isChecked = inside.includes('X');
                            let textBefore = replacedLine.substring(0, openIdx);

                            (cell as any).checkboxes.push({
                                lineIndex: i,
                                checked: isChecked,
                                textBefore: textBefore
                            });

                            replacedLine = replacedLine.substring(0, openIdx) + '   ' + replacedLine.substring(closeIdx + 1);
                            searchIdx = openIdx + 3;
                        } else {
                            searchIdx = closeIdx + 1;
                        }
                    }
                    cell.text[i] = replacedLine;
                }
            }
        },
        didDrawCell: (hookData) => {
            if (hookData.section === 'body') {
                const checkboxes = (hookData.cell as any).checkboxes;
                if (checkboxes && checkboxes.length > 0) {
                    const cell = hookData.cell;
                    const styles = cell.styles;
                    const fontSizeMm = (styles.fontSize * 25.4) / 72;
                    const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15); 
                    const padLeft = typeof styles.cellPadding === 'number' ? styles.cellPadding : (styles.cellPadding as any).left || 1.2;
                    const startX = cell.x + padLeft;
                    const textHeight = cell.text.length * lineHeight;
                    let startY = cell.y + (cell.height - textHeight) / 2;

                    doc.setFont(styles.font, styles.fontStyle);
                    doc.setFontSize(styles.fontSize);

                    checkboxes.forEach((cb: any) => {
                        const lineY = startY + (cb.lineIndex * lineHeight);
                        const boxSize = 2.1; 
                        const offsetX = doc.getTextWidth(cb.textBefore); 
                        const boxX = startX + offsetX; 
                        const boxY = lineY + ((fontSizeMm - boxSize) / 2);
                        
                        doc.setDrawColor(0);
                        doc.setLineWidth(0.15);
                        
                        if (cb.checked) {
                            doc.setFillColor(0); 
                            doc.rect(boxX, boxY, boxSize, boxSize, 'FD'); 
                        } else {
                            doc.rect(boxX, boxY, boxSize, boxSize, 'S'); 
                        }
                    });
                }
            }
        }
    });

    const lastY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - R_MARGIN, lastY, { align: 'right' });
    
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, lastY + 20);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) {
            drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        } else {
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - R_MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
        }
    }
};