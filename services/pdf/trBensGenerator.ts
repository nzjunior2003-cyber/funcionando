import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { TrBensData } from '../../types';
import { 
    formatDate, 
    formatCurrency,
    setDefaultFont,
    drawInstitutionalHeader,
    drawInstitutionalFooter
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_TOP, MARGIN_BOTTOM } from './pdfConstants';

// ============================================================================
// DICIONÁRIOS DE TRADUÇÃO (TEXTOS INTEGRAIS DA LEI 14.133/21)
// ============================================================================
const mapJuridica: Record<string, string> = {
    '7.1.1': '7.1.1. Pessoa física: cédula de identidade (RG) ou documento equivalente que demonstre a capacidade civil;',
    '7.1.2': '7.1.2. Empresário individual: inscrição no Registro Público de Empresas Mercantis;',
    '7.1.3': '7.1.3. Microempreendedor Individual - MEI: Certificado da Condição de Microempreendedor Individual - CCMEI;',
    '7.1.4': '7.1.4. Sociedade empresária estrangeira: portaria de autorização de funcionamento no Brasil;',
    '7.1.5': '7.1.5. Sociedade simples: inscrição do ato constitutivo no Registro Civil de Pessoas Jurídicas;',
    '7.1.6': '7.1.6. Filial, sucursal ou agência: averbação do ato constitutivo da filial, sucursal ou agência;',
    '7.1.7': '7.1.7. Sociedade cooperativa: ata de fundação e estatuto social, com a ata da assembleia que o aprovou;',
    '7.1.8': '7.1.8. Agricultor familiar: Declaração de Aptidão ao Pronaf (DAP) ou Cadastro Nacional da Agricultura Familiar (CAF);',
    '7.1.9': '7.1.9. Produtor Rural: matrícula no CEI - Cadastro Específico do INSS;',
    '7.1.10': '7.1.10. Ato de autorização para o exercício da atividade, quando exigido por lei;',
    '7.1.11': '7.1.11. Documentos acompanhados de todas as alterações ou da consolidação respectiva.'
};

const mapFiscal: Record<string, string> = {
    '7.2.1': '7.2.1. Prova de inscrição no CNPJ ou no CPF;',
    '7.2.2': '7.2.2. Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e/ou Municipal do domicílio ou sede do licitante;',
    '7.2.3': '7.2.3. Prova de regularidade com o FGTS;',
    '7.2.4': '7.2.4. Prova de inexistência de débitos inadimplidos perante a Justiça do Trabalho (CNDT);',
    '7.2.5': '7.2.5. Prova de inscrição no cadastro de contribuintes Estadual ou Municipal, relativo ao domicílio ou sede do licitante;',
    '7.2.6': '7.2.6. Prova de regularidade com a Fazenda Estadual ou Municipal do domicílio ou sede do licitante;',
    '7.2.7': '7.2.7. Caso o fornecedor seja considerado isento dos tributos, comprovação mediante declaração da Fazenda respectiva;',
    '7.2.8': '7.2.8. MEI que pretenda auferir benefícios do tratamento diferenciado: comprovação da regularidade fiscal.'
};

const mapEconomica: Record<string, string> = {
    '7.3.1': '7.3.1. Certidão negativa de insolvência civil expedida pelo distribuidor do domicílio ou sede;',
    '7.3.2': '7.3.2. Certidão negativa de falência expedida pelo distribuidor da sede do licitante;',
    '7.3.3': '7.3.3. Balanço patrimonial e demonstrações contábeis dos 2 (dois) últimos exercícios sociais;',
    '7.3.4': '7.3.4. Índices de Liquidez (LG, LC e SG) superiores a 1 (um);',
    '7.3.5': '7.3.5. Empresas criadas no exercício financeiro da licitação: apresentação do balanço de abertura;',
    '7.3.6': '7.3.6. Documentos limitar-se-ão ao último exercício no caso de fornecimento de bens para pronta entrega;',
    '7.3.7': '7.3.7. Documentos com base no limite definido pela RFB para pequenas e médias empresas;',
    '7.3.8': '7.3.8. Exigência de capital mínimo ou patrimônio líquido mínimo;',
    '7.3.9': '7.3.9. Balanço atestado por profissional habilitado.'
};

const mapQualificacaoTecnica: Record<string, string> = {
    'ciencia': 'Declaração de que o licitante tomou conhecimento de todas as informações necessárias para o cumprimento das obrigações.',
    'registro': 'Apresentação de registro ou inscrição na entidade profissional competente.',
    'pessoal': 'Indicação do pessoal técnico, das instalações e do aparelhamento adequados e disponíveis para a execução.',
    'atestado': 'Atestado de capacidade técnica operacional (fornecimento de bens pertinentes e compatíveis em características e prazos).',
    'lei_especial': 'Cumprimento de outro requisito previsto em lei especial.',
    'nao_exigida': 'Não será exigida prova de qualificação técnica em razão da baixa complexidade da contratação.'
};

const translateOptions = (selected: string[] | undefined, map: Record<string, string>) => {
    if (!selected || selected.length === 0) return 'Conforme Edital.';
    return selected.map(opt => `${map[opt] || opt}`).join('\n\n');
};

export const generateTrBensPdf = (doc: jsPDF, data: TrBensData) => {
    // Margens Reduzidas (Item 4)
    const L_MARGIN = 8;
    const R_MARGIN = 8;
    const tableWidth = PAGE_WIDTH - L_MARGIN - R_MARGIN;

    const colorBlueHeader: [number, number, number] = [31, 78, 121];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorWhiteLabel: [number, number, number] = [255, 255, 255];
    
    setDefaultFont(doc);
    const hasItem = (arr: string[] | undefined, keyword: string) => {
        if (!arr || !Array.isArray(arr)) return false;
        return arr.some(item => typeof item === 'string' && item.toLowerCase().includes(keyword.toLowerCase()));
    };

    let currentY = drawInstitutionalHeader(doc, data.setor || '', "TERMO DE REFERÊNCIA DE BENS COMUNS", `PAE nº ${data.pae || 'aaaa/nnnn'}`);
    currentY += 5;

    // MOTOR DE DESENHO (IDÊNTICO AO ETP V3 - À PROVA DE VAZAMENTO)
    const advancedWillDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            if (!cell.text || !Array.isArray(cell.text)) return;
            (cell as any).checkboxes = [];
            let modifiedText = [...cell.text];
            for (let i = 0; i < modifiedText.length; i++) {
                let replacedLine = modifiedText[i];
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
                        (cell as any).checkboxes.push({ lineIndex: i, checked: isChecked, textBefore: textBefore });
                        replacedLine = replacedLine.substring(0, openIdx) + '   ' + replacedLine.substring(closeIdx + 1);
                        searchIdx = openIdx + 3;
                    } else { searchIdx = closeIdx + 1; }
                }
                modifiedText[i] = replacedLine;
            }
            (cell as any)._myLines = modifiedText;
            cell.text = []; 
        }
    };

    const advancedDidDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            const styles = cell.styles;
            const fontSizeMm = (styles.fontSize * 25.4) / 72;
            const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15); 
            const padLeft = 1.2, padRight = 3, padTop = 1.2;
            const textX = cell.x + padLeft;
            const maxWidth = cell.width - padLeft - padRight;
            doc.setFont(styles.font, styles.fontStyle);
            doc.setFontSize(styles.fontSize);
            const lines = (cell as any)._myLines;
            if (!lines || lines.length === 0) return;
            const textHeight = lines.length * lineHeight;
            let startY = cell.y + padTop;
            if (styles.valign === 'middle') startY = cell.y + (cell.height - textHeight) / 2;

            const checkboxes = (cell as any).checkboxes;
            if (checkboxes && checkboxes.length > 0) {
                checkboxes.forEach((cb: any) => {
                    const lineY = startY + (cb.lineIndex * lineHeight);
                    const boxSize = 2.1; 
                    const offsetX = doc.getTextWidth(cb.textBefore); 
                    const boxX = textX + offsetX; 
                    const boxY = lineY + ((fontSizeMm - boxSize) / 2);
                    doc.setDrawColor(0); doc.setLineWidth(0.15);
                    if (cb.checked) { doc.setFillColor(0); doc.rect(boxX, boxY, boxSize, boxSize, 'FD'); }
                    else { doc.rect(boxX, boxY, boxSize, boxSize, 'S'); }
                });
            }

            lines.forEach((lineText: string, idx: number) => {
                const lineY = startY + (idx * lineHeight);
                const textY = lineY + (fontSizeMm / 2) + 0.3; 
                if (styles.halign === 'justify') {
                    const lineWidth = doc.getTextWidth(lineText);
                    if (idx === lines.length - 1 || lineWidth < (maxWidth * 0.85)) {
                        doc.text(lineText, textX, textY, { align: 'left', baseline: 'middle' } as any);
                    } else {
                        doc.text([lineText, ""], textX, textY, { align: 'justify', maxWidth: maxWidth, baseline: 'middle' } as any);
                    }
                } else {
                    let finalX = textX;
                    if (styles.halign === 'center') finalX = cell.x + cell.width / 2;
                    else if (styles.halign === 'right') finalX = cell.x + cell.width - padRight;
                    doc.text(lineText, finalX, textY, { align: styles.halign as any, baseline: 'middle' } as any);
                }
            });
        }
    };

    const t1Body: RowInput[] = [];
    let totalGlobal = 0;
    data.itens.forEach(item => {
        const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
        totalGlobal += subtotal;
        const cotaStr = subtotal <= 80000 ? 'Exclusiva\nME/EPP' : 'Ampla\nConcorrência';
        t1Body.push([
            { content: item.item || '-', styles: { halign: 'center' } },
            { content: item.descricao || '', styles: { halign: 'justify' } },
            { content: item.codigoSimas || '-', styles: { halign: 'center' } },
            { content: item.unidade || '-', styles: { halign: 'center' } },
            { content: (item.quantidade || 0).toString(), styles: { halign: 'center' } },
            { content: formatCurrency(item.valorUnitario), styles: { halign: 'right' } },
            { content: formatCurrency(subtotal), styles: { halign: 'right' } },
            { content: cotaStr, styles: { halign: 'center', fontStyle: 'bold' } }
        ]);
    });

    autoTable(doc, {
        startY: currentY,
        head: [[{ content: '1. CONTRATAÇÃO (art. 6°, XXIII da Lei 14.133/21)', colSpan: 8, styles: sectionHeaderStyle }],
               ['Item', 'Descrição', 'SIMAS', 'Und', 'Qtd', 'V. Unit', 'V. Total', 'Cota']],
        body: [...t1Body, [{ content: 'VALOR GLOBAL ESTIMADO', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }, { content: formatCurrency(totalGlobal), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }]],
        theme: 'grid',
        styles: { fontSize: 8, lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15 }, 3: { cellWidth: 10 }, 4: { cellWidth: 10 }, 5: { cellWidth: 22 }, 6: { cellWidth: 22 }, 7: { cellWidth: 20 } },
        margin: { left: L_MARGIN, right: R_MARGIN },
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });

    const t2Body: RowInput[] = [];
    const pushHeader = (t: string) => t2Body.push([{ content: t, colSpan: 2, styles: sectionHeaderStyle }]);
    const pushRow = (q: string, a: string, j = false) => {
        t2Body.push([{ content: q, styles: { fillColor: t2Body.length % 2 === 0 ? colorWhiteLabel : colorGrayLabel, fontStyle: 'bold' } },
                     { content: a, styles: { fillColor: t2Body.length % 2 === 0 ? colorWhiteLabel : colorGrayLabel, halign: j ? 'justify' : 'left' } }]);
    };

    pushHeader('2. AGRUPAMENTO (art. 40, §§ 2° e 3° da Lei 14.133/21)');
    pushRow('JUSTIFICATIVA', data.justificativaAgrupamento || 'Não se aplica.', true);
    pushHeader('3. SOLUÇÃO (art. 6°, XXIII, c da Lei 14.133/21)');
    pushRow('3.1. MOTIVO', data.motivoContratacao || '-', true);
    pushHeader('4. NATUREZA (art. 6°, XXIII, a da Lei 14.133/21)');
    pushRow('4.1. TIPO', `[${data.naturezaBem === 'comum' ? 'X' : ' '}] Comum.   [${data.naturezaBem === 'especial' ? 'X' : ' '}] Especial.`);
    pushHeader('7. REQUISITOS (arts. 67 a 70 da Lei 14.133/21)');
    pushRow('7.1. JURÍDICA', translateOptions(data.habilitacaoJuridica, mapJuridica), true);
    pushRow('7.2. FISCAL', translateOptions(data.habilitacaoFiscal, mapFiscal), true);
    pushRow('7.4. TÉCNICA', `[${data.habilitacaoTecnicaExigida === 'sim' ? 'X' : ' '}] Sim. Justificativa: ${data.habilitacaoTecnicaPorque || '-'}\n[${data.habilitacaoTecnicaExigida === 'nao' ? 'X' : ' '}] Não.`, true);

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        body: t2Body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: { top: 1.2, right: 3, bottom: 1.2, left: 1.2 } },
        columnStyles: { 0: { cellWidth: 40 } },
        margin: { left: L_MARGIN, right: R_MARGIN, bottom: MARGIN_BOTTOM },
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });

    // ASSINATURAS E DATA
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY > PAGE_HEIGHT - 60) { doc.addPage(); finalY = MARGIN_TOP + 10; }

    // Data à direita sem negrito (Item 3)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - R_MARGIN, finalY, { align: 'right' });

    finalY += 25;
    // Linha fina e discreta (Item 5)
    const sigX = PAGE_WIDTH / 2;
    doc.setLineWidth(0.05); doc.setDrawColor(180);
    doc.line(sigX - 40, finalY, sigX + 40, finalY);

    // Nome (só guerra em negrito) - Cargo (em negrito) (Item 1 e 2)
    const nameNormal = (data.nome || '').replace(data.nomeGuerra || '', '').trim();
    const nameBold = data.nomeGuerra ? ` ${data.nomeGuerra}` : '';
    const cargoBold = ` - ${data.cargo || ''}`;

    doc.setFontSize(10);
    const w1 = doc.getTextWidth(nameNormal);
    doc.setFont('helvetica', 'bold');
    const w2 = doc.getTextWidth(nameBold);
    const w3 = doc.getTextWidth(cargoBold);
    let startX = sigX - ((w1 + w2 + w3) / 2);

    doc.setFont('helvetica', 'normal'); doc.text(nameNormal, startX, finalY + 5);
    startX += w1;
    doc.setFont('helvetica', 'bold'); doc.text(nameBold, startX, finalY + 5);
    startX += w2;
    doc.text(cargoBold, startX, finalY + 5);

    if (data.funcao) {
        doc.setFont('helvetica', 'normal');
        doc.text(data.funcao, sigX, finalY + 10, { align: 'center' });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        else { doc.setFontSize(8); doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - R_MARGIN, PAGE_HEIGHT - 10, { align: 'right' }); }
    }
};

const sectionHeaderStyle = {
    fillColor: [31, 78, 121] as [number, number, number],
    textColor: 255 as any,
    halign: 'center' as const,
    fontStyle: 'bold' as const,
    fontSize: 10
};