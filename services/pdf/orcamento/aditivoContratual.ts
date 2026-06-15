import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData } from '../../../types';
import { formatDate, setDefaultFont, formatValue, drawInstitutionalHeader, drawInstitutionalFooter } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const ZEBRA_BLUE: [number, number, number] = [244, 249, 255];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const SAFE_BOTTOM_MARGIN = 45;

const nomesFontesCurto: Record<string, string> = {
    simas: 'SIMAS', nfe: 'Nota Fiscal', pncp: 'PNCP', siteEspecializado: 'Mídia Esp.',
    contratacaoSimilar: 'Similar', direta: 'Pesquisa Direta', preco_ata_srp: 'Ata SRP'
};

export const generateOrcamentoAditivoPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);
    const isAta = data.subTipoAditivo === 'ata';

    const addPage = (h: number) => { if (y + h > PAGE_HEIGHT - SAFE_BOTTOM_MARGIN) { doc.addPage(); y = MARGIN_TOP; } };

    const drawHeader = (title: string, sub: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        const lines = doc.splitTextToSize(title, USABLE_WIDTH - 4);
        const h = lines.length * 4 + (sub ? 5 : 0) + 6;
        addPage(h + 10);
        doc.setFillColor(...BLUE); doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, h, 'FD');
        
        const centerY = y + (h / 2);
        doc.setTextColor(255);
        if (sub) {
            const titleY = centerY - 1.5 - ((lines.length - 1) * 2);
            doc.text(lines, PAGE_WIDTH / 2, titleY, { align: 'center', baseline: 'middle' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(sub, PAGE_WIDTH / 2, centerY + 2.5 + ((lines.length - 1) * 2), { align: 'center', baseline: 'middle' });
        } else {
            const titleY = centerY - ((lines.length - 1) * 2);
            doc.text(lines, PAGE_WIDTH / 2, titleY, { align: 'center', baseline: 'middle' });
        }
        doc.setTextColor(0); y += h;
    };

    // MOTOR PREMIUM DE ASSINATURA HÍBRIDA CENTRALIZADA
    const drawHybridSignature = (nomeCompleto: string, nomeGuerra: string, cargo: string, funcao: string, xPos: number, yPos: number) => {
        if (!nomeCompleto) return;
        doc.setLineWidth(0.1); doc.setDrawColor(120);
        doc.line(xPos - 40, yPos, xPos + 40, yPos);
        
        const fullName = (nomeCompleto || '').trim();
        const guerra = (nomeGuerra || '').trim();
        const cargoTexto = (cargo || '').trim();
        
        doc.setFontSize(10);
        const idx = guerra ? fullName.toLowerCase().indexOf(guerra.toLowerCase()) : -1;
        
        let before = '', boldPart = '', after = '';
        if (idx >= 0) {
            before = fullName.slice(0, idx);
            boldPart = fullName.slice(idx, idx + guerra.length);
            after = fullName.slice(idx + guerra.length);
        } else { before = fullName; }

        const parts: { text: string; bold: boolean }[] = [];
        if (before) parts.push({ text: before, bold: false });
        if (boldPart) parts.push({ text: boldPart, bold: true });
        if (after) parts.push({ text: after, bold: false });
        if (cargoTexto) parts.push({ text: ` - ${cargoTexto}`, bold: true });

        const widths = parts.map(p => { doc.setFont('helvetica', p.bold ? 'bold' : 'normal'); return doc.getTextWidth(p.text); });
        const totalW = widths.reduce((a, b) => a + b, 0);
        let startX = xPos - (totalW / 2);

        parts.forEach((p, i) => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            doc.text(p.text, startX, yPos + 5);
            startX += widths[i];
        });

        if (funcao) {
            doc.setFont('helvetica', 'normal');
            doc.text(funcao, xPos, yPos + 10, { align: 'center' });
        }
    };

    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    // Seção 1
    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const s1Body: any[] = data.itemGroups.map((g) => {
        let desc = g.descricao;
        if (isAta && (g as any).numeroAtaAditivo) desc += `\n(Ata Origem: ${(g as any).numeroAtaAditivo})`;
        return [ { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center' } }, desc, g.codigoSimas || '-', g.unidade, g.quantidadeTotal ];
    });
    autoTable(doc, {
        startY: y, theme: 'grid', head: [['Item', 'Descrição', 'Código SIMAS', 'Und', 'Qtd']], body: s1Body,
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, halign: 'center', valign: 'middle' },
        columnStyles: { 0: { cellWidth: 15 }, 1: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Seção 2
    drawHeader('2 - FONTES CONSULTADAS PARA A PESQUISA DE PREÇO', '(art. 2º, III, e art. 4º do Decreto Estadual nº 2.734/2022)');
    y += 4;
    fMap.forEach((f, i) => {
        const isR = i % 2 !== 0; const cx = MARGIN_LEFT + (isR ? USABLE_WIDTH / 2 : 0); const cy = y + Math.floor(i / 2) * 6;
        doc.rect(cx, cy - 3, 4, 4);
        if (data.fontesPesquisa.includes(f[0])) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 1, cy + 0.5); doc.setFont('helvetica', 'normal'); }
        doc.setFontSize(9); doc.text(f[1], cx + 5, cy);
    });
    y += 22;

    // Seção 3
    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    autoTable(doc, { startY: y, body: [[data.justificativaAusenciaFonte?.trim() || 'Não se aplica.']], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Seção 4
    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.length === 1 && data.fontesPesquisa.includes('direta');
    const s4b: any[] = [[
        { content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left' } },
        { content: `${isDir ? '[ X ]' : '[   ]'} Sim\n${!isDir ? '[ X ]' : '[   ]'} Não`, styles: { halign: 'center' } },
        { content: `Justificativa: ${isDir ? (data.justificativaPesquisaDireta || 'Não se aplica.') : 'Não se aplica.'}`, styles: { halign: 'left' } }
    ]];
    autoTable(doc, { startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Seção 5
    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia || 'media';
    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: `${met === 'menor' ? '[ X ]' : '[   ]'} Menor preço\n(mercado restrito)` },
            { content: `${met === 'media' ? '[ X ]' : '[   ]'} Média\n(preços semelhantes)` },
            { content: `${met === 'mediana' ? '[ X ]' : '[   ]'} Mediana\n(preços com grande variação)` }
        ]]
    });
    y = (doc as any).lastAutoTable.hidden ? y : (doc as any).lastAutoTable.finalY + 8;

    // Seção 6
    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    const precosValidosTodos = data.itemGroups.map(g => (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false));
    const maxPrecos = Math.max(...precosValidosTodos.map(p => p.length), 1);
    const s6b: any[] = data.itemGroups.map(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        const row: any[] = [{ content: g.itemTR, styles: { halign: 'center' } }];
        for (let i = 0; i < maxPrecos; i++) {
            row.push(p[i] ? `${formatValue(p[i].value, g.tipoValor)}\n(${nomesFontesCurto[p[i].source] || p[i].source})` : '-');
        }
        return row;
    });
    autoTable(doc, { startY: y, head: [[{ content: 'Item' }, { content: 'Preços Encontrados', colSpan: maxPrecos }]], body: s6b, theme: 'grid', headStyles: { fillColor: YELLOW, textColor: 0 }, styles: { fontSize: 8, halign: 'center' }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }, columnStyles: { 0: { cellWidth: 15 } } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Quadro Comparativo
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const tituloQuadro = isAta ? 'QUADRO COMPARATIVO - ADITIVO À ATA DE REGISTRO DE PREÇOS' : `QUADRO COMPARATIVO - ADITIVO CONTRATUAL`;
    doc.text(tituloQuadro, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;

    const qcb = data.itemGroups.map(g => [
        { content: g.itemTR, styles: { halign: 'center' } }, g.descricao,
        formatValue(g.estimativaUnitaria, g.tipoValor), formatValue(g.valorUnitarioContrato, g.tipoValor), formatValue(g.valorUnitarioContrato, g.tipoValor)
    ]);
    autoTable(doc, { startY: y, head: [['Item', 'Descrição', 'Valor Mercado', 'Valor Origem', 'Preço Adotado']], body: qcb, theme: 'grid', headStyles: { fillColor: YELLOW, textColor: 0 }, styles: { fontSize: 8 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Tabela Final de Preço Estimado do Aditivo
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PREÇO ESTIMADO DA ALTERAÇÃO CONTRATUAL', PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let totalMensalCentavos = 0;
    let totalGlobalPeriodoCentavos = 0;
    const aditB: any[] = [];
    
    const temPeriodoValido = data.itemGroups.some(g => (g as any).periodoContratacao && (g as any).periodoContratacao.trim() !== '');
    const stringPeriodoGlobal = (data.itemGroups.find(g => (g as any).periodoContratacao) as any)?.periodoContratacao || '';
    const colAditivoFinal = temPeriodoValido ? 'Total no Período' : 'Valor Aditivo';

    data.itemGroups.forEach(g => {
        const est = Math.round((Number(g.valorUnitarioContrato) || 0) * 100) / 100;
        const multiplier = getPeriodMultiplier(g);
        const qtdAdit = Number((g as any).aditivoQuantidade) || 0;
        
        const totalMensalLinha = Math.round(est * qtdAdit * 100) / 100;
        const totalGlobalLinha = Math.round(est * qtdAdit * multiplier * 100) / 100;
        
        totalMensalCentavos += Math.round(totalMensalLinha * 100);
        totalGlobalPeriodoCentavos += Math.round(totalGlobalLinha * 100);

        aditB.push([
            { content: g.itemTR, styles: { halign: 'center' } },
            (g as any).periodoContratacao ? `${g.descricao}\n(Período: ${(g as any).periodoContratacao})` : g.descricao,
            `${(Number((g as any).aditivoPercentual) || 0).toFixed(2)}%`,
            formatValue(est, g.tipoValor),
            qtdAdit,
            formatValue(temPeriodoValido ? totalGlobalLinha : totalMensalLinha, g.tipoValor)
        ]);
    });

    // Inserção das Linhas Intermediárias e Cores Solicitadas
    if (temPeriodoValido) {
        aditB.push([
            { content: 'TOTAL ADITIVO MENSAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: LBLUE } },
            { content: formatValue(totalMensalCentavos / 100, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: LBLUE } }
        ]);
        aditB.push([
            { content: `TOTAL DO ADITIVO PARA O PERÍODO (${stringPeriodoGlobal})`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: formatValue(totalGlobalPeriodoCentavos / 100, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }
        ]);
    } else {
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: formatValue(totalMensalCentavos / 100, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }
        ]);
    }
    
    autoTable(doc, {
        startY: y, head: [['Item', 'Descrição', 'Aditivo (%)', 'V. Unit.', 'Qtd Aditivo', colAditivoFinal]], body: aditB, theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, styles: { fontSize: 8, halign: 'center', valign: 'middle' },
        columnStyles: { 1: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 15;

    // Seção de Assinaturas Híbridas
    addPage(50);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    
    y += 25;
    const centerX = PAGE_WIDTH / 2;
    drawHybridSignature(data.assinante1Nome, data.assinante1NomeGuerra || '', data.assinante1Cargo, data.assinante1Funcao, centerX, y);
    if (data.assinante2Nome) {
        drawHybridSignature(data.assinante2Nome, data.assinante2NomeGuerra || '', data.assinante2Cargo, data.assinante2Funcao, centerX, y + 45);
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawInstitutionalFooter(doc, data.setor || '', i, totalPages); }
};