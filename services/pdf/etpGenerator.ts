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
    const L_MARGIN = 10;
    const R_MARGIN = 10;
    const tableWidth = PAGE_WIDTH - L_MARGIN - R_MARGIN;

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
    
    body.push([
        { content: '3.5 - PODERÁ HAVER PRORROGAÇÃO?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.prorrogacao === 'sim')} Sim.\n${radio(data.prorrogacao === 'nao')} Não.\n${radio(data.prorrogacao === 'na')} Não se aplica (prazo indeterminado).`, colSpan: 5, styles: { halign: 'left', valign: 'middle' } }
    ]);

    // --- SEÇÃO 7: PARCELAMENTO (Lógica condicional aplicada) ---
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

    // --- SEÇÃO 11 E 12 (PENDÊNCIAS E IMPACTOS) ---
    body.push([{ content: '11 – PENDÊNCIAS RELATIVAS À CONTRATAÇÃO', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '11.1 - PROVIDÊNCIAS PENDENTES?', styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.pendencias === 'sim')} Sim. ${data.pendenciasEspecificar || ''}\n${radio(data.pendencias === 'nao')} Não.`, colSpan: 5, styles: { halign: 'left' } }
    ]);

    body.push([{ content: '12 – IMPACTOS AMBIENTAIS E MEDIDAS DE MITIGAÇÃO', colSpan: 6, styles: sectionHeaderStyle }]);
    body.push([
        { content: '12.1 - HÁ PREVISÃO DE IMPACTO?', rowSpan: 2, styles: questionStyle(getNextLabelColor()) },
        { content: `${radio(data.impactoAmbiental === 'sim')} Sim.\n${radio(data.impactoAmbiental === 'nao')} Não.`, rowSpan: 2, styles: { valign: 'middle', halign: 'left', cellWidth: 20 } },
        { content: `Impactos:\n${data.impactos || ''}`, colSpan: 4, styles: { fillColor: colorRedImpact, halign: 'justify', fontSize: 9 } }
    ]);
    body.push([
        { content: `Medidas de mitigação:\n${data.medidasMitigacao || ''}`, colSpan: 4, styles: { fillColor: colorBlueMitigation, halign: 'justify', fontSize: 9 } }
    ]);

    // --- SEÇÃO 13: VIABILIDADE (AJUSTADA: Esquerda, Sem negrito, Quadrados FD) ---
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
            cellPadding: 1.2,
            lineColor: 0, 
            lineWidth: 0.1,
            textColor: 0,
            valign: 'middle',
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 40 }
        },
        // NOVO ALGORITMO: DETECTA MÚLTIPLAS CAIXINHAS NA MESMA LINHA
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

                    // Ajusta a fonte do doc para medir corretamente o tamanho do texto
                    doc.setFont(styles.font, styles.fontStyle);
                    doc.setFontSize(styles.fontSize);

                    checkboxes.forEach((cb: any) => {
                        const lineY = startY + (cb.lineIndex * lineHeight);
                        const boxSize = 2.1; 
                        
                        // MÁGICA AQUI: Calcula a posição X exata baseada no texto que vem antes!
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