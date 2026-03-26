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
    // 1. Cabeçalho Centralizado
    const title = `ESTUDO TÉCNICO PRELIMINAR Nº ${data.numero || 'XX'}/${data.ano || '2024'}`;
    const subTitle = `PAE nº ${data.pae || 'aaaa/nnnn'}`;
    
    let y = drawInstitutionalHeader(doc, data.setor || '', title, subTitle);

    // --- Fix: Explicitly type colors as [number, number, number] to satisfy jspdf-autotable's Color type ---
    const colorBlueHeader: [number, number, number] = [31, 78, 121];   // #1F4E79 - Azul Escuro
    const colorWhite: [number, number, number] = [255, 255, 255];      // Branco
    const colorGrayLabel: [number, number, number] = [242, 242, 242];  // #F2F2F2 - Cinza Claro
    const colorYellowHeader: [number, number, number] = [252, 230, 157]; // #FCE69D - Amarelo (Fiel ao modelo)
    const colorRedImpact: [number, number, number] = [244, 204, 204];  // #F4CCCC - Vermelho claro
    const colorBlueMitigation: [number, number, number] = [207, 226, 243]; // #CFE2F3 - Azul claro

    setDefaultFont(doc);

    // Helpers para Checkboxes e Radios no PDF
    const checkbox = (checked: boolean) => checked ? '[X]' : '[  ]';
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';

    // --- Fix: Explicitly type return as [number, number, number] ---
    let labelCounter = 0;
    const getNextLabelColor = (): [number, number, number] => {
        const color = labelCounter % 2 === 0 ? colorGrayLabel : colorWhite;
        labelCounter++;
        return color;
    };

    const body: RowInput[] = [];

    // --- SEÇÃO 1: NECESSIDADE ---
    body.push([{
        content: '1 – DESCRIÇÃO DA NECESSIDADE\n(art. 18, §1º, I, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '1.1 - QUAL A NECESSIDADE A SER ATENDIDA?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.necessidade || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // --- SEÇÃO 2: MERCADO ---
    body.push([{
        content: '2 – LEVANTAMENTO DE MERCADO\n(arts. 18, §1º, V, e 44 da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    
    const f = data.fontesPesquisa || [];
    const fontesTexto = [
        `${checkbox(f.includes('Consulta a fornecedores'))} Consulta a fornecedores.`,
        `${checkbox(f.includes('Contratações similares'))} Contratações similares.`,
        `${checkbox(f.includes('Internet'))} Internet.`,
        `${checkbox(f.includes('Audiência pública'))} Audiência pública.`,
        `${checkbox(f.includes('Outro'))} Outro. Especificar: ${data.fonteOutro || "..."}`
    ].join('\n');

    body.push([
        { content: '2.1 - ONDE FORAM PESQUISADAS AS POSSÍVEIS SOLUÇÕES?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: fontesTexto, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '2.2 - JUSTIFICATIVA TÉCNICA E ECONÔMICA PARA A ESCOLHA DA MELHOR SOLUÇÃO', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.justificativaTecnica || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);
    body.push([
        { content: '2.3 - HÁ RESTRIÇÃO DE FORNECEDORES?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.restricaoFornecedores === 'sim')} Sim.\n${radio(data.restricaoFornecedores === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 3: REQUISITOS ---
    body.push([{
        content: '3 – DESCRIÇÃO DOS REQUISITOS DE CONTRATAÇÃO\n(art. 18, §1º, III, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    
    const t = data.tipoObjeto || [];
    const tipoObjetoTxt = [
        `${checkbox(t.includes('bem'))} Bem.`,
        `${checkbox(t.includes('servico'))} Serviço.`,
        `${checkbox(t.includes('locacao'))} Locação de imóvel.`,
        `${checkbox(t.includes('obra'))} Obra ou serviço de engenharia.`
    ].join('\n');
    body.push([
        { content: '3.1 - QUAL O TIPO DE OBJETO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: tipoObjetoTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.2 - QUAL A NATUREZA?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.natureza === 'continuada')} Continuada.\n${radio(data.natureza === 'nao-continuada')} Não continuada.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.3 - HÁ MONOPÓLIO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.monopolio === 'sim')} Sim, apenas um único fornecedor é capaz de atender a demanda.\n${radio(data.monopolio === 'nao')} Não, há mais de um fornecedor capaz de atender a demanda.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    
    const vigenciaTxt = [
        `${radio(data.vigencia === '30 dias (pronta entrega).')} 30 dias (pronta entrega).`,
        `${radio(data.vigencia === '180 dias.')} 180 dias.`,
        `${radio(data.vigencia === '12 meses.')} 12 meses.`,
        `${radio(data.vigencia === 'Indeterminado.')} Indeterminado.`,
        `${radio(data.vigencia === 'outro')} Outro: ${data.vigenciaOutroNum || 'nnn'} ${data.vigenciaOutroTipo || 'dias'}`
    ].join('\n');
    body.push([
        { content: '3.4 - QUAL A VIGÊNCIA?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: vigenciaTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.5 - PODERÁ HAVER PRORROGAÇÃO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.prorrogacao === 'sim')} Sim.\n${radio(data.prorrogacao === 'nao')} Não.\n${radio(data.prorrogacao === 'na')} Não se aplica porque o prazo é indeterminado.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.6 - HÁ TRANSIÇÃO COM CONTRATO ANTERIOR?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.transicao === 'sim')} Sim. Contrato nº: ${data.transicaoContrato || '...'} Prazo final: ${data.transicaoPrazo || '...'}\n${radio(data.transicao === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 3.7 Padrão Mínimo de Qualidade (Com Cabeçalho Amarelo)
    const qualItems = data.padraoQualidade || [];
    body.push([
        { content: '3.7 - PADRÃO MÍNIMO DE QUALIDADE', rowSpan: qualItems.length + 1, styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Descrição detalhada', colSpan: 4, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } }
    ]);
    if (qualItems.length > 0) {
        qualItems.forEach((item, idx) => {
            body.push([
                { content: (idx + 1).toString(), styles: { halign: 'center' } },
                { content: item.descricao, colSpan: 4, styles: { halign: 'justify', valign: 'middle' } }
            ]);
        });
    } else {
        body.push([{ content: '(Descrever item).', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic' } }]);
    }

    // 3.8 Sustentabilidade
    const s = data.sustentabilidade || [];
    const sustTxt = [
        `${checkbox(s.includes('Utilização de bens constituídos...'))} Utilização de bens constituídos, no todo ou em parte, por material reciclado, atóxico e biodegradável...`,
        `${checkbox(s.includes('Não utilização de bens e produtos...'))} Não utilização de bens e produtos com substâncias perigosas...`,
        `${checkbox(s.includes('Atendimento aos requisitos ambientais...'))} Atendimento aos requisitos ambientais para a obtenção de certificação...`,
        `${checkbox(s.includes('Maior ciclo de vida...'))} Maior ciclo de vida e menor custo de manutenção do bem.`,
        `${checkbox(s.includes('Utilização, preferencial, de embalagem...'))} Utilização, preferencial, de embalagem adequada...`,
        `${checkbox(s.includes('Outro.'))} Outro. Especificar: ${data.sustentabilidadeOutro || ''}`
    ].join('\n');
    body.push([
        { content: '3.8 - QUAIS CRITÉRIOS DE SUSTENTABILIDADE?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: sustTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 4: SOLUÇÃO ---
    body.push([{
        content: '4 – DESCRIÇÃO DA SOLUÇÃO\n(art. 18, §1º, VII, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '4.1 - O QUE SERÁ CONTRATADO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.solucaoContratacao || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.2 - QUAL O PRAZO DA GARANTIA CONTRATUAL?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.garantiaContratual === 'nao_ha')} Não há.\n${radio(data.garantiaContratual === '90_dias')} 90 dias.\n${radio(data.garantiaContratual === '12_meses')} 12 meses.\n${radio(data.garantiaContratual === 'outro')} Outro: ${data.garantiaOutroNum} ${data.garantiaOutroTipo}`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.3 - HÁ NECESSIDADE DE ASSISTÊNCIA TÉCNICA?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.assistenciaTecnica === 'sim')} Sim. Justificativa: ${data.justificativaAssistenciaTecnica || ''}\n${radio(data.assistenciaTecnica === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.4 - HÁ NECESSIDADE DE MANUTENÇÃO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.manutencao === 'sim')} Sim. Descrever solução: (Contrato de manutenção).\n${radio(data.manutencao === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 5: DIMENSIONAMENTO ---
    body.push([{
        content: '5 – DIMENSIONAMENTO DO OBJETO\n(art. 18, §1º, IV, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    const mQ = data.metodoQuantitativo || [];
    const metodosTxt = [
        `${checkbox(mQ.includes('Análise de contratações anteriores.'))} Análise de contratações anteriores.`,
        `${checkbox(mQ.includes('Análise de contratações similares.'))} Análise de contratações similares.`,
        `${checkbox(mQ.includes('Levantamento atual.'))} Levantamento atual.`,
        `${checkbox(mQ.includes('Outro.'))} Outro. Especificar: ${data.metodoOutro || ''}`
    ].join('\n');
    body.push([
        { content: '5.1 - COMO SE OBTEVE O QUANTITATIVO ESTIMADO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: metodosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '5.2 - DESCRIÇÃO DO QUANTITATIVO', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.descricaoQuantitativo || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // 5.3 Especificação (Com Cabeçalho Amarelo)
    const items = data.itens || [];
    body.push([
        { content: '5.3 - ESPECIFICAÇÃO', rowSpan: items.length + 1, styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Descrição', colSpan: 2, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } }
    ]);
    if (items.length > 0) {
        items.forEach((item, idx) => {
            body.push([
                { content: (idx + 1).toString(), styles: { halign: 'center' } },
                { content: item.descricao, colSpan: 2, styles: { halign: 'justify', valign: 'middle' } },
                { content: item.unidade, styles: { halign: 'center' } },
                { content: item.quantidade.toString(), styles: { halign: 'center' } }
            ]);
        });
    } else {
        body.push([{ content: '-', colSpan: 5, styles: { halign: 'center' } }]);
    }

    // --- SEÇÃO 6: ESTIMATIVA DO VALOR ---
    body.push([{
        content: '6 – ESTIMATIVA DO VALOR DA CONTRATAÇÃO\n(art. 18, §1º, VI, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    const mP = data.meiosPesquisa || [];
    const meiosTxt = [
        `${checkbox(mP.includes('Painel de preços.'))} Painel de preços.`,
        `${checkbox(mP.includes('Contratações similares.'))} Contratações similares.`,
        `${checkbox(mP.includes('Simas.'))} Simas.`,
        `${checkbox(mP.includes('Fornecedores.'))} Fornecedores.`,
        `${checkbox(mP.includes('Internet.'))} Internet.`,
        `${checkbox(mP.includes('Outro.'))} Outro. Especificar: ${data.meiosPesquisaOutro || ''}`
    ].join('\n');
    body.push([
        { content: '6.1 - MEIOS USADOS NA PESQUISA', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: meiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 6.2 Estimativa de Preço (Com Cabeçalho e Total Amarelo)
    const totalGeral = items.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);
    body.push([
        { content: '6.2 - ESTIMATIVA DE PREÇO', rowSpan: items.length + 2, styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Valor Unitário', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Valor Total', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } }
    ]);
    if (items.length > 0) {
        items.forEach((item, idx) => {
            body.push([
                { content: (idx + 1).toString(), styles: { halign: 'center' } },
                { content: item.descricao, styles: { halign: 'justify', valign: 'middle' } },
                { content: formatCurrency(item.valorUnitario), styles: { halign: 'right' } },
                { content: item.quantidade.toString(), styles: { halign: 'center' } },
                { content: formatCurrency(item.quantidade * item.valorUnitario), styles: { halign: 'right' } }
            ]);
        });
    } else {
        body.push([{ content: '-', colSpan: 5, styles: { halign: 'center' } }]);
    }
    body.push([
        { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader } },
        { content: formatCurrency(totalGeral), styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader } }
    ]);

    // --- SEÇÃO 7: PARCELAMENTO ---
    body.push([{
        content: '7 – JUSTIFICATIVA PARA O PARCELAMENTO DA SOLUÇÃO\n(art. 18, §1º, VIII, art. 40, V, b, 47, II, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    const mN = data.motivosNaoParcelamento || [];
    const motivosTxt = [
        `${checkbox(mN.includes('Objeto indivisível.'))} Objeto indivisível.`,
        `${checkbox(mN.includes('Perda de escala.'))} Perda de escala.`,
        `${checkbox(mN.includes('Tecnicamente inviável.'))} Tecnicamente inviável.`,
        `${checkbox(mN.includes('Economicametne inviável.'))} Economicamente inviável.`,
        `${checkbox(mN.includes('Aproveitamento da competitividade.'))} Aproveitamento da competitividade.`,
        `${checkbox(mN.includes('Outro.'))} Outro. Especificar: ${data.motivosNaoParcelamentoOutro || ''}`
    ].join('\n');
    body.push([
        { content: '7.1 - A SOLUÇÃO SERÁ DIVIDIDA EM ITENS?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.parcelamento === 'sim')} Sim.\n${radio(data.parcelamento === 'nao')} Não.`, styles: { valign: 'middle', halign: 'left' } },
        { content: 'Por quê?', styles: { fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: motivosTxt, colSpan: 3, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 8: CORRELATAS ---
    body.push([{
        content: '8 – CONTRATAÇÕES CORRELATAS OU INTERDEPENDENTES\n(art. 18, §1º, XI, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '8.1 - HÁ CONTRATAÇÕES CORRELATAS OU INTERDEPENDENTES?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.contratacoesCorrelatas === 'sim')} Sim. Especificar: ${data.contratacoesCorrelatasEspecificar || ''}\n${radio(data.contratacoesCorrelatas === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 9: PLANEJAMENTO ---
    body.push([{
        content: '9 – ALINHAMENTO DA CONTRATAÇÃO COM O PLANEJAMENTO\n(art. 18, §1º, II, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '9.1 - HÁ PREVISÃO NO PLANO DE CONTRATAÇÕES ANUAL?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.previsaoPCA === 'sim')} Sim. Especificar item do PCA: ${data.itemPCA || 'nn'}\n${radio(data.previsaoPCA === 'nao')} Não. Justificativa e providências: ${data.justificativaPCA || ''}`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 10: RESULTADOS ---
    body.push([{
        content: '10 – RESULTADOS PRETENDIDOS\n(art. 18, §1º, IX, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    const b = data.beneficios || [];
    const beneficiosTxt = [
        `${checkbox(b.includes('Manutenção do Funcionamento Administrativo'))} Manutenção do Funcionamento Administrativo`,
        `${checkbox(b.includes('Redução de Custos'))} Redução de Custos`,
        `${checkbox(b.includes('Aproveitamento de Recursos Humanos'))} Aproveitamento de Recursos Humanos`,
        `${checkbox(b.includes('Ganho de Eficiência'))} Ganho de Eficiência`,
        `${checkbox(b.includes('Serviço/Bem de Consumo'))} Serviço/Bem de Consumo`,
        `${checkbox(b.includes('Realização de Política Pública'))} Realização de Política Pública`,
        `${checkbox(b.includes('Outro.'))} Outro. Especificar: ${data.beneficiosOutro || ''}`
    ].join('\n');
    body.push([
        { content: '10.1 - QUAIS OS BENEFÍCIOS PRETENDIDOS NA CONTRATAÇÃO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: beneficiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 11: PENDÊNCIAS ---
    body.push([{
        content: '11 – PENDÊNCIAS RELATIVAS À CONTRATAÇÃO\n(art. 18, §1º, X, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '11.1 - HÁ PROVIDÊNCIAS PENDENTES PARA O SUCESSO DA CONTRATAÇÃO?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.pendencias === 'sim')} Sim. Especificar: ${data.pendenciasEspecificar || ''}\n${radio(data.pendencias === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '11.2 - QUAIS SÃO OS SETORES RESPONSÁVEIS PELAS PROVIDÊNCIAS PENDENTES?', styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.pendenciasResponsaveis || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // --- SEÇÃO 12: IMPACTOS AMBIENTAIS ---
    body.push([{
        content: '12 – IMPACTOS AMBIENTAIS E MEDIDAS DE MITIGAÇÃO\n(art. 18, §1º, XII, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', valign: 'middle' }
    }]);
    body.push([
        { content: '12.1 - HÁ PREVISÃO DE IMPACTO AMBIENTAL NA CONTRATAÇÃO?', rowSpan: 2, styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: `${radio(data.impactoAmbiental === 'sim')} Sim.\n${radio(data.impactoAmbiental === 'nao')} Não.`, rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
        { content: `Impactos:\n${data.impactos || ''}`, colSpan: 4, styles: { fillColor: colorRedImpact, valign: 'top', halign: 'left' } }
    ]);
    body.push([
        { content: `Medidas de mitigação:\n${data.medidasMitigacao || ''}`, colSpan: 4, styles: { fillColor: colorBlueMitigation, valign: 'top', halign: 'left' } }
    ]);

    // --- SEÇÃO 13: VIABILIDADE ---
    body.push([{
        content: '13.1 - A CONTRATAÇÃO POSSUI VIABILIDADE TÉCNICA, SOCIOECONÔMICA E AMBIENTAL?',
        colSpan: 4,
        styles: { fillColor: getNextLabelColor(), fontStyle: 'bold', halign: 'center', valign: 'middle' }
    }, {
        content: `${radio(data.viabilidade === 'sim')} Sim.\n${radio(data.viabilidade === 'nao')} Não.`,
        colSpan: 2,
        styles: { valign: 'middle', halign: 'left' }
    }]);

    // Gerar a Tabela Principal
    autoTable(doc, {
        startY: y,
        head: [],
        body: body,
        theme: 'grid',
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: MARGIN_TOP, bottom: MARGIN_BOTTOM },
        tableWidth: PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT,
        styles: { 
            font: 'helvetica',
            fontSize: 12, 
            cellPadding: 2, 
            lineColor: [0, 0, 0], 
            lineWidth: 0.1,
            overflow: 'linebreak',
            textColor: 0,
            halign: 'left',
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 'auto' }
        },
        pageBreak: 'auto',
        // O didDrawPage desenha elementos estáticos como linhas no cabeçalho ou rodapé se quiséssemos.
        // Como vamos desenhar o rodapé dinâmico no final, deixamos esse vazio apenas para não quebrar.
        didDrawPage: (hookData) => {
            y = hookData.cursor?.y || y;
        },
        willDrawCell: (hookData) => {
            // Este bloco roda ANTES do texto ser impresso na página
            if (hookData.section === 'body') {
                const cell = hookData.cell;
                if (!cell.text || !Array.isArray(cell.text)) return;
                
                // Cria uma "memória" na célula para guardar onde os quadradinhos vão ficar
                (cell as any).checkboxes = [];
                
                for (let i = 0; i < cell.text.length; i++) {
                    let line = cell.text[i];
                    if (line.includes('[X]')) {
                        // Salva a posição e diz que está marcado
                        (cell as any).checkboxes.push({ lineIndex: i, checked: true });
                        // Apaga o [X] do texto e coloca 4 espaços no lugar
                        cell.text[i] = line.replace('[X]', '    '); 
                    } else if (line.includes('[ ]') || line.includes('[  ]')) {
                        // Salva a posição e diz que NÃO está marcado
                        (cell as any).checkboxes.push({ lineIndex: i, checked: false });
                        // Apaga o [ ] do texto e coloca 4 espaços no lugar
                        cell.text[i] = line.replace(/\[\s*\]/, '    '); 
                    }
                }
            }
        },
        didDrawCell: (hookData) => {
            // Este bloco roda DEPOIS do texto ter sido impresso (agora sem os colchetes!)
            if (hookData.section === 'body') {
                const checkboxes = (hookData.cell as any).checkboxes;
                
                // Se encontramos quadradinhos na etapa anterior, vamos desenhá-los
                if (checkboxes && checkboxes.length > 0) {
                    const cell = hookData.cell;
                    const styles = cell.styles;
                    const fontSizeMm = (styles.fontSize * 25.4) / 72;
                    const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15); 
                    
                    let padTop = 0;
                    let padLeft = 0;
                    if (typeof styles.cellPadding === 'number') {
                        padTop = padLeft = styles.cellPadding;
                    } else if (styles.cellPadding) {
                        padTop = (styles.cellPadding as any).top || 0;
                        padLeft = (styles.cellPadding as any).left || 0;
                    }

                    let startY = cell.y + padTop;
                    if (styles.valign === 'middle') {
                        const textHeight = cell.text.length * lineHeight;
                        startY = cell.y + (cell.height - textHeight) / 2;
                    }

                    const startX = cell.x + padLeft;

                    checkboxes.forEach((cb: any) => {
                        const lineY = startY + (cb.lineIndex * lineHeight);
                        
                        const boxSize = 2.5; 
                        const boxX = startX + 1; // 1mm de distância da borda
                        const boxY = lineY + ((fontSizeMm - boxSize) / 2) + 0.5;

                        doc.setDrawColor(0);
                        doc.setLineWidth(0.2);
                        doc.rect(boxX, boxY, boxSize, boxSize, 'S'); // Desenha o quadrado

                        if (cb.checked) {
                            // Desenha o X dentro
                            doc.line(boxX, boxY, boxX + boxSize, boxY + boxSize);
                            doc.line(boxX + boxSize, boxY, boxX, boxY + boxSize);
                        }
                    });
                }
            }
        }
    });

    // Finalização e Assinatura
    const lastAutoTable = (doc as any).lastAutoTable;
    let finalY = lastAutoTable ? lastAutoTable.finalY + 20 : MARGIN_TOP + 20;
    
    if (finalY + 40 > PAGE_HEIGHT - MARGIN_BOTTOM) {
        doc.addPage();
        finalY = MARGIN_TOP + 10;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH / 2, finalY, { align: 'center' });
    
    finalY += 15;

    // Assinatura: Nome (com Nome de Guerra em negrito) - Cargo
    // Função
    finalY = checkPageBreak(doc, finalY, 40);
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, finalY + 15);

    // Lógica do Rodapé: Institucional SOMENTE na última página
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) {
            drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: 'right' });
        }
    }
};