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
    // 1. Configurações de Margem e Espaçamento (Mantendo o ajuste de 10mm)
    const L_MARGIN = 10;
    const R_MARGIN = 10;
    const tableWidth = PAGE_WIDTH - L_MARGIN - R_MARGIN;

    // 2. Cabeçalho
    const title = `ESTUDO TÉCNICO PRELIMINAR Nº ${data.numero || 'XX'}/${data.ano || '2024'}`;
    const subTitle = `PAE nº ${data.pae || 'aaaa/nnnn'}`;
    let y = drawInstitutionalHeader(doc, data.setor || '', title, subTitle);

    // Cores e Estilos
    const colorBlueHeader: [number, number, number] = [31, 78, 121]; 
    const colorWhite: [number, number, number] = [255, 255, 255];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorRedImpact: [number, number, number] = [244, 204, 204];
    const colorBlueMitigation: [number, number, number] = [207, 226, 243];

    setDefaultFont(doc);

    const checkbox = (checked: boolean) => checked ? '[X]' : '[  ]';
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';

    let labelCounter = 0;
    const getNextLabelColor = (): [number, number, number] => {
        const color = labelCounter % 2 === 0 ? colorGrayLabel : colorWhite;
        labelCounter++;
        return color;
    };

    // Estilo para Perguntas (Alinhado à direita, sem negrito, fonte 9)
    const questionStyle = (color: [number, number, number]) => ({
        fillColor: color,
        fontStyle: 'normal' as const,
        halign: 'right' as const,
        fontSize: 9,
        valign: 'middle' as const
    });

    const body: RowInput[] = [];

    // --- SEÇÃO 1: NECESSIDADE ---
    body.push([{
        content: '1 – DESCRIÇÃO DA NECESSIDADE\n(art. 18, §1º, I, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    body.push([
        { content: '1.1 - QUAL A NECESSIDADE A SER ATENDIDA?', styles: questionStyle(getNextLabelColor()) },
        { content: data.necessidade || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // --- SEÇÃO 2: MERCADO ---
    body.push([{
        content: '2 – LEVANTAMENTO DE MERCADO\n(arts. 18, §1º, V, e 44 da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
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
    body.push([{
        content: '3 – DESCRIÇÃO DOS REQUISITOS DE CONTRATAÇÃO\n(art. 18, §1º, III, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    
    const t = data.tipoObjeto || [];
    const tipoObjetoTxt = [
        `${checkbox(t.includes('bem'))} Bem.`,
        `${checkbox(t.includes('servico'))} Serviço.`,
        `${checkbox(t.includes('locacao'))} Locação de imóvel.`,
        `${checkbox(t.includes('obra'))} Obra ou serviço de engenharia.`
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
        `${radio(data.vigencia === 'outro')} Outro: ${data.vigenciaOutroNum || 'nnn'} ${data.vigenciaOutroTipo || 'dias'}`
    ].join('\n');
    body.push([
        { content: '3.4 - QUAL A VIGÊNCIA?', styles: questionStyle(getNextLabelColor()) },
        { content: vigenciaTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.5 - PODERÁ HAVER PRORROGAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.prorrogacao === 'sim')} Sim.\n${radio(data.prorrogacao === 'nao')} Não.\n${radio(data.prorrogacao === 'na')} Não se aplica porque o prazo é indeterminado.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '3.6 - HÁ TRANSIÇÃO COM CONTRATO ANTERIOR?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.transicao === 'sim')} Sim. Contrato nº: ${data.transicaoContrato || '...'} Prazo final: ${data.transicaoPrazo || '...'}\n${radio(data.transicao === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 3.7 Padrão Mínimo de Qualidade
    const qualItems = data.padraoQualidade || [];
    body.push([
        { content: '3.7 - PADRÃO MÍNIMO DE QUALIDADE', rowSpan: qualItems.length + 1, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Descrição detalhada', colSpan: 4, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } }
    ]);
    if (qualItems.length > 0) {
        qualItems.forEach((item, idx) => {
            body.push([
                { content: (idx + 1).toString(), styles: { halign: 'center' } },
                { content: item.descricao, colSpan: 4, styles: { halign: 'justify', valign: 'middle' } }
            ]);
        });
    }

    // 3.8 Sustentabilidade (TEXTOS INTEGRAIS RESTAURADOS)
    const s = data.sustentabilidade || [];
    const sustTxt = [
        `${checkbox(s.includes('Utilização de bens constituídos, no todo ou em parte, por material reciclado, atóxico e biodegradável'))} Utilização de bens constituídos, no todo ou em parte, por material reciclado, atóxico e biodegradável.`,
        `${checkbox(s.includes('Não utilização de bens e produtos com substâncias perigosas'))} Não utilização de bens e produtos com substâncias perigosas.`,
        `${checkbox(s.includes('Atendimento aos requisitos ambientais para a obtenção de certificação'))} Atendimento aos requisitos ambientais para a obtenção de certificação.`,
        `${checkbox(s.includes('Maior ciclo de vida e menor custo de manutenção do bem'))} Maior ciclo de vida e menor custo de manutenção do bem.`,
        `${checkbox(s.includes('Utilização, preferencial, de embalagem adequada'))} Utilização, preferencial, de embalagem adequada.`,
        `${checkbox(s.includes('Outro'))} Outro. Especificar: ${data.sustentabilidadeOutro || ''}`
    ].join('\n');
    body.push([
        { content: '3.8 - QUAIS CRITÉRIOS DE SUSTENTABILIDADE?', styles: questionStyle(getNextLabelColor()) },
        { content: sustTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 4: SOLUÇÃO ---
    body.push([{
        content: '4 – DESCRIÇÃO DA SOLUÇÃO\n(art. 18, §1º, VII, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    body.push([
        { content: '4.1 - O QUE SERÁ CONTRATADO?', styles: questionStyle(getNextLabelColor()) },
        { content: data.solucaoContratacao || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);
    body.push([
        { content: '4.2 - QUAL O PRAZO DA GARANTIA CONTRATUAL?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.garantiaContratual === 'nao_ha')} Não há.\n${radio(data.garantiaContratual === '90_dias')} 90 dias.\n${radio(data.garantiaContratual === '12_meses')} 12 meses.\n${radio(data.garantiaContratual === 'outro')} Outro: ${data.garantiaOutroNum} ${data.garantiaOutroTipo}`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
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
    body.push([{
        content: '5 – DIMENSIONAMENTO DO OBJETO\n(art. 18, §1º, IV, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    const mQ = data.metodoQuantitativo || [];
    const metodosTxt = [
        `${checkbox(mQ.includes('Análise de contratações anteriores'))} Análise de contratações anteriores.`,
        `${checkbox(mQ.includes('Análise de contratações similares'))} Análise de contratações similares.`,
        `${checkbox(mQ.includes('Levantamento atual'))} Levantamento atual.`,
        `${checkbox(mQ.includes('Outro'))} Outro. Especificar: ${data.metodoOutro || ''}`
    ].join('\n');
    body.push([
        { content: '5.1 - COMO SE OBTEVE O QUANTITATIVO ESTIMADO?', styles: questionStyle(getNextLabelColor()) },
        { content: metodosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);
    body.push([
        { content: '5.2 - DESCRIÇÃO DO QUANTITATIVO', styles: questionStyle(getNextLabelColor()) },
        { content: data.descricaoQuantitativo || '', colSpan: 5, styles: { halign: 'justify', valign: 'middle' } }
    ]);

    // 5.3 Especificação (Ajuste de larguras para números caberem)
    const items = data.itens || [];
    body.push([
        { content: '5.3 - ESPECIFICAÇÃO', rowSpan: items.length + 1, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Descrição', colSpan: 2, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } }
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
    body.push([{
        content: '6 – ESTIMATIVA DO VALOR DA CONTRATAÇÃO\n(art. 18, §1º, VI, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    const mP = data.meiosPesquisa || [];
    const meiosTxt = [
        `${checkbox(mP.includes('Painel de preços'))} Painel de preços.`,
        `${checkbox(mP.includes('Contratações similares'))} Contratações similares.`,
        `${checkbox(mP.includes('Simas'))} Simas.`,
        `${checkbox(mP.includes('Fornecedores'))} Fornecedores.`,
        `${checkbox(mP.includes('Internet'))} Internet.`,
        `${checkbox(mP.includes('Outro'))} Outro. Especificar: ${data.meiosPesquisaOutro || ''}`
    ].join('\n');
    body.push([
        { content: '6.1 - MEIOS USADOS NA PESQUISA', styles: questionStyle(getNextLabelColor()) },
        { content: meiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // 6.2 Estimativa de Preço
    const totalGeral = items.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);
    body.push([
        { content: '6.2 - ESTIMATIVA DE PREÇO', rowSpan: items.length + 2, styles: questionStyle(getNextLabelColor()) },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'V. Unitário', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'V. Total', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } }
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
    body.push([{
        content: '7 – JUSTIFICATIVA PARA O PARCELAMENTO DA SOLUÇÃO\n(art. 18, §1º, VIII, art. 40, V, b, 47, II, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    const mN = data.motivosNaoParcelamento || [];
    const motivosTxt = [
        `${checkbox(mN.includes('Objeto indivisível'))} Objeto indivisível.`,
        `${checkbox(mN.includes('Perda de escala'))} Perda de escala.`,
        `${checkbox(mN.includes('Tecnicamente inviável'))} Tecnicamente inviável.`,
        `${checkbox(mN.includes('Economicamente inviável'))} Economicamente inviável.`,
        `${checkbox(mN.includes('Aproveitamento da competitividade'))} Aproveitamento da competitividade.`,
        `${checkbox(mN.includes('Outro'))} Outro. Especificar: ${data.motivosNaoParcelamentoOutro || ''}`
    ].join('\n');
    body.push([
        { content: '7.1 - A SOLUÇÃO SERÁ DIVIDIDA EM ITENS?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.parcelamento === 'sim')} Sim. ${radio(data.parcelamento === 'nao')} Não.`, styles: { valign: 'middle', halign: 'left' } },
        { content: 'Por quê?', styles: { fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: motivosTxt, colSpan: 3, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 10: RESULTADOS (FIX: TEXTO INTEGRAL CONFORME IMAGEM) ---
    body.push([{
        content: '10 – RESULTADOS PRETENDIDOS\n(art. 18, §1º, IX, da Lei Federal nº 14.133/21)',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11, valign: 'middle' }
    }]);
    const b = data.beneficios || [];
    const beneficiosTxt = [
        `${checkbox(b.includes('Manutenção do Funcionamento Administrativo'))} Manutenção do Funcionamento Administrativo`,
        `${checkbox(b.includes('Redução de Custos'))} Redução de Custos`,
        `${checkbox(b.includes('Aproveitamento de Recursos Humanos'))} Aproveitamento de Recursos Humanos`,
        `${checkbox(b.includes('Ganho de Eficiência'))} Ganho de Eficiência`,
        `${checkbox(b.includes('Serviço/Bem de Consumo'))} Serviço/Bem de Consumo`,
        `${checkbox(b.includes('Realização de Política Pública'))} Realização de Política Pública`,
        `${checkbox(b.includes('Outro'))} Outro. Especificar: ${data.beneficiosOutro || ''}`
    ].join('\n');
    body.push([
        { content: '10.1 - QUAIS OS BENEFÍCIOS PRETENDIDOS NA CONTRATAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: beneficiosTxt, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 13: VIABILIDADE ---
    body.push([{
        content: '13.1 - A CONTRATAÇÃO POSSUI VIABILIDADE TÉCNICA, SOCIOECONÔMICA E AMBIENTAL?',
        colSpan: 4,
        styles: questionStyle(getNextLabelColor())
    }, {
        content: `${radio(data.viabilidade === 'sim')} Sim.\n${radio(data.viabilidade === 'nao')} Não.`,
        colSpan: 2,
        styles: { valign: 'middle', halign: 'left' }
    }]);

    // Gerador da Tabela Principal
    autoTable(doc, {
        startY: y,
        body: body,
        theme: 'grid',
        margin: { left: L_MARGIN, right: R_MARGIN },
        tableWidth: tableWidth,
        styles: { 
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 1.2,
            lineColor: 0, 
            lineWidth: 0.1,
            textColor: 0,
            valign: 'middle',
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 10 },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 28 },
            4: { cellWidth: 12 },
            5: { cellWidth: 28 }
        },
        willDrawCell: (hookData) => {
            if (hookData.section === 'body') {
                const cell = hookData.cell;
                if (!cell.text || !Array.isArray(cell.text)) return;
                (cell as any).checkboxes = [];
                for (let i = 0; i < cell.text.length; i++) {
                    let line = cell.text[i];
                    if (line.includes('[X]')) {
                        (cell as any).checkboxes.push({ lineIndex: i, checked: true });
                        cell.text[i] = line.replace('[X]', '   '); 
                    } else if (line.includes('[ ]') || line.includes('[  ]')) {
                        (cell as any).checkboxes.push({ lineIndex: i, checked: false });
                        cell.text[i] = line.replace(/\[\s*\]/, '   '); 
                    }
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
                    const padLeft = 1.2; 
                    const startX = cell.x + padLeft;
                    const textHeight = cell.text.length * lineHeight;
                    const startY = cell.y + (cell.height - textHeight) / 2;

                    checkboxes.forEach((cb: any) => {
                        const lineY = startY + (cb.lineIndex * lineHeight);
                        const boxSize = 2.1; 
                        const boxX = startX; 
                        const boxY = lineY + ((fontSizeMm - boxSize) / 2);
                        doc.setDrawColor(0);
                        doc.setLineWidth(0.15);
                        doc.rect(boxX, boxY, boxSize, boxSize, 'S');
                        if (cb.checked) {
                            doc.line(boxX, boxY, boxX + boxSize, boxY + boxSize);
                            doc.line(boxX + boxSize, boxY, boxX, boxY + boxSize);
                        }
                    });
                }
            }
        }
    });

    // Finalização e Data Alinhada à Direita
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