import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { OrcamentoData, OrcamentoItemGroup } from '../../../types';
import { formatDate, setDefaultFont, drawFormattedSignature, formatValue, drawInstitutionalHeader, drawInstitutionalFooter } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export const generateOrcamentoLicitacaoPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);

    const addPage = (h: number) => { if (y + h > PAGE_HEIGHT - MARGIN_BOTTOM) { doc.addPage(); y = MARGIN_TOP; } };

    const drawHeader = (title: string, sub: string) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        const lines = doc.splitTextToSize(title, USABLE_WIDTH - 4);
        const h = lines.length * 4 + (sub ? 5 : 0) + 5;
        addPage(h + 10);
        doc.setFillColor(...BLUE); doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, h, 'FD');
        doc.setTextColor(255); doc.text(lines, PAGE_WIDTH / 2, y + 4, { align: 'center' });
        if (sub) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(sub, PAGE_WIDTH / 2, y + lines.length * 4 + 4, { align: 'center' });
        }
        doc.setTextColor(0); y += h;
    };

    // Header
    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    // Sec 1
    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const s1Body = data.itemGroups.map((g, i) => {
        const row: any[] = [];
        if (i === 0) row.push({ content: 'O QUE SERÁ\nPESQUISADO?', rowSpan: data.itemGroups.length, styles: { valign: 'middle', halign: 'right', fillColor: [255,255,255] } });
        row.push({ content: g.itemTR, styles: { fillColor: GRAY } }, g.descricao, g.codigoSimas || '-', g.unidade, g.quantidadeTotal);
        return row;
    });
    autoTable(doc, {
        startY: y, theme: 'grid', head: [['', 'Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd']], body: s1Body,
        headStyles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, halign: 'center', valign: 'middle' },
        columnStyles: { 0: { cellWidth: 35 }, 2: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
        didParseCell: (d) => { if (d.section === 'head' && d.column.index === 0) d.cell.styles.fillColor = [255,255,255]; }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 2
    drawHeader('2 - FONTES CONSULTADAS PARA A PESQUISA DE PREÇO', '(art. 2º, III, e art. 4º do Decreto Estadual nº 2.734/2022)');
    const fMap = [
        ['simas', 'SIMAS (banco referencial de preço).'], ['nfe', 'Base nacional de notas fiscais eletrônicas.'],
        ['pncp', 'Portal Nacional de Compras Públicas (PNCP).'], ['siteEspecializado', 'Mídia especializada.'],
        ['contratacaoSimilar', 'Contratações similares feitas pela administração pública.'], ['direta', 'Pesquisa direta com fornecedores.']
    ];
    y += 4;
    fMap.forEach((f, i) => {
        const isR = i % 2 !== 0; const cx = MARGIN_LEFT + (isR ? USABLE_WIDTH / 2 : 0); const cy = y + Math.floor(i / 2) * 6;
        doc.rect(cx, cy - 3, 4, 4);
        if (data.fontesPesquisa.includes(f[0])) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 1, cy + 0.5); doc.setFont('helvetica', 'normal'); }
        doc.setFontSize(9); doc.text(f[1], cx + 5, cy);
    });
    y += 22;

    // Sec 3
    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    autoTable(doc, { startY: y, body: [[data.justificativaAusenciaFonte?.trim() || 'Não se aplica.']], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 4
    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.length === 1 && data.fontesPesquisa.includes('direta');
    const s4b: any[] = [[
        { content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left' } },
        { content: `[ ${isDir ? 'X' : ' '} ] Sim\n[ ${!isDir ? 'X' : ' '} ] Não`, styles: { halign: 'center' } },
        { content: `Justificativa: ${isDir ? (data.justificativaPesquisaDireta || 'Não se aplica.') : 'Não se aplica.'}`, styles: { halign: 'left' } }
    ]];
    if (isDir && data.fornecedoresDiretos?.length) {
        data.fornecedoresDiretos.forEach((f, i) => {
            s4b.push([
                i === 0 ? { content: '4.2 – QUAIS AS RAZÕES DA ESCOLHA DOS FORNECEDORES COTADOS?', rowSpan: data.fornecedoresDiretos.length } : '',
                { content: f.nome, styles: { halign: 'center' } }, { content: `Justificativa: ${f.justificativa}` }
            ]);
        });
        data.fornecedoresDiretos.forEach((f, i) => {
            s4b.push([
                i === 0 ? { content: '4.3 - AS PROPOSTAS FORMAIS CONTÊM OS REQUISITOS?', rowSpan: data.fornecedoresDiretos.length } : '',
                { content: f.nome, styles: { halign: 'center' } }, { content: `[ ${f.requisitos === 'sim' ? 'X' : ' '} ] Sim\n[ ${f.requisitos === 'nao' ? 'X' : ' '} ] Não`, styles: { halign: 'center' } }
            ]);
        });
    }
    autoTable(doc, { startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 5
    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia;
    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }, styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: `[ ${met === 'menor' ? 'X' : ' '} ] Menor preço\n(mercado restrito)`, styles: { fontStyle: met === 'menor' ? 'bold' : 'normal' } },
            { content: `[ ${met === 'media' ? 'X' : ' '} ] Média\n(preços semelhantes)`, styles: { fontStyle: met === 'media' ? 'bold' : 'normal' } },
            { content: `[ ${met === 'mediana' ? 'X' : ' '} ] Mediana\n(preços com grande variação)`, styles: { fontStyle: met === 'mediana' ? 'bold' : 'normal' } }
        ]]
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 6
    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    const s6b: any[] = [];
    data.itemGroups.forEach(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        s6b.push([{ content: g.itemTR, styles: { halign: 'center' } }, p.length ? p.map(x => formatValue(x.value, g.tipoValor)).join(' | ') : '-']);
    });
    autoTable(doc, { startY: y, head: [['Item', 'Preços Encontrados']], body: s6b, theme: 'grid', headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, styles: { fontSize: 8, lineColor: 0, lineWidth: 0.1, halign: 'center' }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY;

    const desc = data.houveDescarte;
    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }, styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: 'HOUVE DESCARTE DE\nPREÇO?', styles: { fillColor: LBLUE, fontStyle: 'bold', halign: 'center', cellWidth: 40 } },
            { content: `[ ${desc === 'sim' ? 'X' : ' '} ] Sim.\n[ ${desc === 'nao' ? 'X' : ' '} ] Não.`, styles: { cellWidth: 30 } },
            { content: `Justificativa: ${desc === 'sim' ? data.justificativaDescarte : 'Não se aplica.'}` }
        ]]
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Final Table
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PREÇO ESTIMADO DE MERCADO', PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let total = 0;
    const fb: any[] = [];
    data.itemGroups.forEach(g => {
        const t = g.estimativaUnitaria * g.quantidadeTotal; total += t;
        if (g.cotas?.length) {
            g.cotas.forEach((c, i) => {
                fb.push([
                    i === 0 ? { content: g.itemTR, styles: { fillColor: GRAY } } : '',
                    i === 0 ? g.descricao : '',
                    c.id === 'cota_ampla' ? 'AMPLA' : 'ME/EPP',
                    formatValue(g.estimativaUnitaria, g.tipoValor), c.quantidade, formatValue(c.quantidade * g.estimativaUnitaria, g.tipoValor)
                ]);
            });
        } else {
            fb.push([{ content: g.itemTR, styles: { fillColor: GRAY } }, g.descricao, 'AMPLA', formatValue(g.estimativaUnitaria, g.tipoValor), g.quantidadeTotal, formatValue(t, g.tipoValor)]);
        }
    });
    fb.push([{ content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }, { content: formatValue(total, 'moeda'), styles: { fontStyle: 'bold', fillColor: YELLOW } }]);
    
    autoTable(doc, {
        startY: y, head: [['Item', 'Descrição', 'AMPLA OU\nME/EPP', 'Valor Unit.', 'Qtd', 'Total']], body: fb, theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 1: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Footer
    addPage(30);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); y += 20;
    
    const sig1X = MARGIN_LEFT + USABLE_WIDTH / 4; const sig2X = MARGIN_LEFT + USABLE_WIDTH * 0.75;
    drawFormattedSignature(doc, data.assinante1Nome, data.assinante1NomeGuerra, data.assinante1Cargo, data.assinante1Funcao, sig1X, y);
    if (data.assinante2Nome) drawFormattedSignature(doc, data.assinante2Nome, data.assinante2NomeGuerra, data.assinante2Cargo, data.assinante2Funcao, sig2X, y);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
    }
};
