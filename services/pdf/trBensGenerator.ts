import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { TrBensData, TrBensItem } from '../../types';
import { 
    formatDate, 
    formatCurrency,
    setDefaultFont,
    drawFormattedSignature,
    drawInstitutionalHeader,
    drawInstitutionalFooter,
    checkPageBreak
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT } from './pdfConstants';

export const generateTrBensPdf = (doc: jsPDF, data: TrBensData) => {
    const colorBlueHeader: [number, number, number] = [31, 78, 121];   // #1F4E79
    const colorYellowHeader: [number, number, number] = [252, 230, 157]; // #FCE69D
    const colorGrayLabel: [number, number, number] = [242, 242, 242];  // #F2F2F2
    
    setDefaultFont(doc);

    // O gerador de texto dos checkboxes. (Os quadradinhos visuais serão desenhados por cima deles)
    const checkbox = (checked: boolean) => checked ? '[X]' : '[  ]';
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';

    // Início do documento
    drawInstitutionalHeader(doc, data.setor || '', "TERMO DE REFERÊNCIA DE BENS COMUNS", `PAE nº ${data.pae || 'aaaa/nnnn'}`);

    const body: RowInput[] = [];

    // --- 1. O QUE SERÁ CONTRATADO ---
    body.push([{
        content: '1.  O QUE SERÁ CONTRATADO?\n(art. 6°, XXIII, a e i, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);

    body.push([
        { content: 'Grupo*', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Código SIMAS', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Valor Unit. Estimado**', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Valor total Estimado**', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } },
        { content: 'Concorrência', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center' } }
    ]);

    let totalGlobal = 0;
    if (data.itens && data.itens.length > 0) {
        data.itens.forEach(item => {
            const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
            totalGlobal += subtotal;
            body.push([
                { content: item.loteId || '-', styles: { halign: 'center' } },
                { content: item.item || '-', styles: { halign: 'center' } },
                { content: item.descricao || '' },
                { content: item.codigoSimas || '', styles: { halign: 'center' } },
                { content: item.unidade || '', styles: { halign: 'center' } },
                { content: (item.quantidade || 0).toString(), styles: { halign: 'center' } },
                { content: formatCurrency(item.valorUnitario), styles: { halign: 'right' } },
                { content: formatCurrency(subtotal), styles: { halign: 'right' } },
                { content: item.concorrencia || 'Ampla', styles: { halign: 'center' } }
            ]);
        });
    }

    body.push([
        { content: 'VALOR GLOBAL ESTIMADO**', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: formatCurrency(totalGlobal), colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } }
    ]);

    // --- 2. JUSTIFICATIVA AGRUPAMENTO ---
    body.push([{
        content: '2.  JUSTIFICATIVA PARA O AGRUPAMENTO DE ITENS*\n(art. 40, §§ 2° e 3°, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([{
        content: data.justificativaAgrupamento || 'não se aplica',
        colSpan: 9,
        styles: { fontStyle: 'italic', minCellHeight: 15 }
    }]);

    // --- 3. DESCRIÇÃO DA SOLUÇÃO ---
    body.push([{
        content: '3.  DESCRIÇÃO DA SOLUÇÃO\n(art. 6°, XXIII, c, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '3.1. QUAL O MOTIVO DA CONTRATAÇÃO?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: data.motivoContratacao || '', colSpan: 7, styles: { minCellHeight: 25 } }
    ]);

    // --- 4. NATUREZA DO BEM ---
    body.push([{
        content: '4.  NATUREZA DO BEM\n(art. 6°, XXIII, a, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([{
        content: `${radio(data.naturezaBem === 'comum')} Comum.\n\n${radio(data.naturezaBem === 'especial')} Especial.`,
        colSpan: 9,
        styles: { halign: 'left', cellPadding: 5 }
    }]);

    // --- 5. QUALIDADE E ASSISTÊNCIA ---
    body.push([{
        content: '5.  PROVA DE QUALIDADE, RENDIMENTO, DURABILIDADE E SEGURANÇA DO BEM\n(art. 40, § 1°, I e III, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '5.1. HAVERÁ PROVA DE QUALIDADE?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.provaQualidade === 'sim')} Sim. Justificativa: ${data.justificativaProvaQualidade || ''}\n${radio(data.provaQualidade === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '5.2. O EDITAL EXIGIRÁ AMOSTRA?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.amostra === 'sim')} Sim. Prazo: ${data.amostraPrazo} dias úteis.\n${radio(data.amostra === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '5.3. HAVERÁ GARANTIA DO BEM?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.garantiaBem === 'sim')} Sim. Itens: ${data.garantiaItens || ''}. Prazo: ${data.garantiaBemMeses || ''} meses.\n${radio(data.garantiaBem === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '5.4. HAVERÁ ASSISTÊNCIA TÉCNICA?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.assistenciaTecnica === 'sim')} Sim. Itens: ${data.assistenciaTecnicaItens || ''}. Prazo: ${data.assistenciaTecnicaMeses || ''} meses.\n${radio(data.assistenciaTecnica === 'nao')} Não.`, colSpan: 7 }
    ]);

    // --- 6. CRITÉRIOS DE SELEÇÃO ---
    body.push([{
        content: '6.  CRITÉRIOS DE SELEÇÃO\n(art. 6°, XXIII, h, da Lei Federal nº 14.133/21)',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    const fC = data.formaContratacao || [];
    body.push([
        { content: '6.1. FORMA DE CONTRATAÇÃO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: [
            `${radio(fC.includes('inexigibilidade'))} Inexigibilidade (Art. 74, Inciso ${data.inexigibilidadeInciso || '...'})`,
            `${radio(fC.includes('dispensa_valor'))} Dispensa por Valor (Art. 75, II)`,
            `${radio(fC.includes('dispensa_art75'))} Dispensa (Art. 75, Inciso ${data.dispensaInciso || '...'})`,
            `${radio(fC.includes('pregao'))} Pregão eletrônico`,
            `${radio(fC.includes('pregao_rp'))} Pregão para Registro de Preços`
        ].join('\n'), colSpan: 7 }
    ]);
    body.push([
        { content: '6.2. CRITÉRIO DE JULGAMENTO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.criterioJulgamento === 'menor_preco')} Menor preço.    ${radio(data.criterioJulgamento === 'maior_desconto')} Maior desconto.`, colSpan: 7 }
    ]);
    body.push([
        { content: '6.3. O ORÇAMENTO É SIGILOSO?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.orcamentoSigiloso === 'sim')} Sim. Justificativa: ${data.justificativaOrcamentoSigiloso || ''}\n${radio(data.orcamentoSigiloso === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '6.4. ACEITABILIDADE', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: data.criterioAceitabilidade || '', colSpan: 7 }
    ]);

    // --- 7. REQUISITOS DA CONTRATADA ---
    body.push([{
        content: '7.  REQUISITOS DA CONTRATADA',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '7.1. HABILITAÇÃO JURÍDICA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: (data.habilitacaoJuridica || []).join(', ') || 'Conforme Edital.', colSpan: 7 }
    ]);
    body.push([
        { content: '7.2. FISCAL / SOCIAL', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: (data.habilitacaoFiscal || []).join(', ') || 'Conforme Edital.', colSpan: 7 }
    ]);
    body.push([
        { content: '7.3. QUALIFICAÇÃO ECONÔMICA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: (data.qualificacaoEconomica || []).join(', ') || 'Conforme Edital.', colSpan: 7 }
    ]);
    body.push([
        { content: '7.4. QUALIFICAÇÃO TÉCNICA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.habilitacaoTecnicaExigida === 'sim')} Sim. Qual: ${data.habilitacaoTecnicaQual || ''}\n${radio(data.habilitacaoTecnicaExigida === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '7.7. RISCOS', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.riscosAssumidos === 'sim')} Sim. Detalhes: ${data.riscosAssumidosDesc || ''}\n${radio(data.riscosAssumidos === 'nao')} Não.`, colSpan: 7 }
    ]);
    body.push([
        { content: '7.8. CONSÓRCIO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${radio(data.participacaoConsorcio === 'sim')} Sim (${data.participacaoConsorcioPercentual || '10'}% acréscimo).\n${radio(data.participacaoConsorcio === 'nao')} Não. Motivo: ${data.participacaoConsorcioJustificativa || ''}`, colSpan: 7 }
    ]);

    // --- 8. ENTREGA ---
    body.push([{
        content: '8.  FORMA DE ENTREGA DO BEM',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '8.1. COMO O BEM DEVE SER ENTREGUE?', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: data.formaEntregaTipo === 'unica' ? 'Integral de uma só vez.' : `Parcelada em ${data.entregaParcelasX || ''} vezes.`, colSpan: 7 }
    ]);
    body.push([
        { content: '8.2. LOCAL E HORA', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: data.localEntrega || '', colSpan: 7 }
    ]);

    // --- 9. PAGAMENTO E REAJUSTE ---
    body.push([{
        content: '9.  PRAZO, FORMA DE PAGAMENTO E GARANTIA DO CONTRATO',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: '9.1. PRAZO DO CONTRATO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `${data.prazoContrato === '30' ? '30 dias' : '12 meses'}. Prorrogação: ${data.possibilidadeProrrogacao === 'sim' ? 'Sim' : 'Não'}.`, colSpan: 7 }
    ]);
    body.push([
        { content: '9.3. PAGAMENTO', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `Prazo: ${data.pagamentoPrazoDias || '30'} dias. Opções: ${(data.pagamentoOpcoes || []).join(', ')}.`, colSpan: 7 }
    ]);
    body.push([
        { content: '9.5. REAJUSTE', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `Índice: ${data.reajusteIndice || 'N/A'}. Periodicidade: ${data.reajusteMeses || ''} meses.`, colSpan: 7 }
    ]);

    // --- 10. PREVISÃO ORÇAMENTÁRIA ---
    body.push([{
        content: '10.  PREVISÃO ORÇAMENTÁRIA',
        colSpan: 9,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 9 }
    }]);
    body.push([
        { content: 'FUNCIONAL', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: data.dadosOrcamentariosFuncional || 'xxx', colSpan: 7 }
    ]);
    body.push([
        { content: 'ELEMENTO / FONTE', colSpan: 2, styles: { fillColor: colorGrayLabel, fontStyle: 'bold', halign: 'center' } },
        { content: `Elemento: ${data.dadosOrcamentariosElemento || 'xxx'} | Fonte: ${data.dadosOrcamentariosFonte || 'xxx'}`, colSpan: 7 }
    ]);

    // Gerar Tabela (COM A BALA DE PRATA DOS CHECKBOXES)
    autoTable(doc, {
        startY: 55,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 15 },
        },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: 25 },
        willDrawCell: (hookData) => {
            if (hookData.section === 'body') {
                const cell = hookData.cell;
                if (!cell.text || !Array.isArray(cell.text)) return;
                
                (cell as any).checkboxes = [];
                
                for (let i = 0; i < cell.text.length; i++) {
                    let line = cell.text[i];
                    if (line.includes('[X]')) {
                        (cell as any).checkboxes.push({ lineIndex: i, checked: true });
                        cell.text[i] = line.replace(/\[X\]/g, '    '); 
                    } else if (line.includes('[ ]') || line.includes('[  ]')) {
                        (cell as any).checkboxes.push({ lineIndex: i, checked: false });
                        cell.text[i] = line.replace(/\[\s*\]/g, '    '); 
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
                        const boxX = startX + 1; 
                        const boxY = lineY + ((fontSizeMm - boxSize) / 2) + 0.5;

                        doc.setDrawColor(0);
                        doc.setLineWidth(0.2);
                        doc.rect(boxX, boxY, boxSize, boxSize, 'S');

                        if (cb.checked) {
                            doc.line(boxX, boxY, boxX + boxSize, boxY + boxSize);
                            doc.line(boxX + boxSize, boxY, boxX, boxY + boxSize);
                        }
                    });
                }
            }
        },
        didDrawPage: (hookData) => {
            // Renomeado para hookData para não atrapalhar a variável 'data' com os dados do formulário
            // @ts-ignore
            drawInstitutionalFooter(doc, data.setor || '', hookData.pageNumber, doc.internal.getNumberOfPages());
        }
    });

    // Assinatura Final
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY > PAGE_HEIGHT - 60) {
        doc.addPage();
        finalY = 30;
    }

    doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH / 2, finalY, { align: 'center' });
    finalY = checkPageBreak(doc, finalY, 40);
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, finalY + 15);
};