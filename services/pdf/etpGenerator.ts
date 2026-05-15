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
    // 1. Configurações de Margem e Espaçamento
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

    // --- MONTAGEM DO CONTEÚDO (Mantendo a lógica de seções) ---
    // Seção 1
    body.push([{
        content: '1 – DESCRIÇÃO DA NECESSIDADE',
        colSpan: 6,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold', fontSize: 11 }
    }]);
    body.push([
        { content: '1.1 - QUAL A NECESSIDADE A SER ATENDIDA?', styles: questionStyle(getNextLabelColor()) },
        { content: data.necessidade || '', colSpan: 5, styles: { halign: 'justify' } }
    ]);

    // Seção 5.3: Especificação (Ajuste de larguras de colunas numéricas)
    const items = data.itens || [];
    body.push([{
        content: '5.3 - ESPECIFICAÇÃO',
        rowSpan: items.length + 1,
        styles: questionStyle(getNextLabelColor())
    }, 
    { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'Descrição', colSpan: 2, styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'Und', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } }]);
    
    items.forEach((item, idx) => {
        body.push([
            { content: (idx + 1).toString(), styles: { halign: 'center' } },
            { content: item.descricao, colSpan: 2, styles: { halign: 'justify' } },
            { content: item.unidade, styles: { halign: 'center' } },
            { content: item.quantidade.toString(), styles: { halign: 'center' } }
        ]);
    });

    // Seção 6.2: Estimativa (Garantindo que valores monetários caibam)
    const totalGeral = items.reduce((sum, item) => sum + (item.quantidade * item.valorUnitario), 0);
    body.push([{
        content: '6.2 - ESTIMATIVA DE PREÇO',
        rowSpan: items.length + 2,
        styles: questionStyle(getNextLabelColor())
    }, 
    { content: 'Item', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'Descrição', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'V. Unitário', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'Qtd', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } },
    { content: 'V. Total', styles: { fillColor: colorYellowHeader, fontStyle: 'bold', halign: 'center', fontSize: 9 } }]);

    items.forEach((item, idx) => {
        body.push([
            { content: (idx + 1).toString(), styles: { halign: 'center' } },
            { content: item.descricao, styles: { halign: 'justify' } },
            { content: formatCurrency(item.valorUnitario), styles: { halign: 'right' } },
            { content: item.quantidade.toString(), styles: { halign: 'center' } },
            { content: formatCurrency(item.quantidade * item.valorUnitario), styles: { halign: 'right' } }
        ]);
    });

    body.push([
        { content: 'TOTAL', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader, fontSize: 10 } },
        { content: formatCurrency(totalGeral), styles: { fontStyle: 'bold', halign: 'right', fillColor: colorYellowHeader, fontSize: 10 } }
    ]);

    // --- GERADOR DA TABELA ---
    autoTable(doc, {
        startY: y,
        body: body,
        theme: 'grid',
        margin: { left: L_MARGIN, right: R_MARGIN },
        tableWidth: tableWidth,
        styles: { 
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 1.2, // Reduzido para dar mais ar às células
            lineColor: 0, 
            lineWidth: 0.1,
            textColor: 0,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 35 }, // Coluna Pergunta
            1: { cellWidth: 10 }, // Coluna Item (Estreita)
            2: { cellWidth: 'auto' }, // Descrição (Flexível)
            3: { cellWidth: 28 }, // Valor / Unidade (Suficiente para R$ 0.000,00)
            4: { cellWidth: 12 }, // Qtd (Estreita)
            5: { cellWidth: 28 }  // Valor Total
        },
        willDrawCell: (hookData) => {
            if (hookData.section === 'body') {
                const cell = hookData.cell;
                if (!cell.text || !Array.isArray(cell.text)) return;
                (cell as any).checkboxes = [];
                for (let i = 0; i < cell.text.length; i++) {
                    let line = cell.text[i];
                    // Reduzido para 3 espaços para aproximar o nome da caixa
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
                    
                    // Cálculo da altura do bloco de texto para centralizar
                    const textHeight = cell.text.length * lineHeight;
                    const startY = cell.y + (cell.height - textHeight) / 2;

                    checkboxes.forEach((cb: any) => {
                        const lineY = startY + (cb.lineIndex * lineHeight);
                        const boxSize = 2.1; 
                        // boxX colado no início do padding
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

    // --- RODAPÉ E DATA (ALINHADA À DIREITA) ---
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