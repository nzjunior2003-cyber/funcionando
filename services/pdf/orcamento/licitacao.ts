import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData } from '../../../types';
import { formatDate, setDefaultFont, formatValue, drawInstitutionalHeader, drawInstitutionalFooter } from '../pdfUtils';
import { PAGE_WIDTH, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export const generateOrcamentoLicitacaoPdf = (doc: jsPDF, data: OrcamentoData) => {
    
    // --- FUNÇÕES DE BLINDAGEM EMBUTIDAS (Isto evita o ReferenceError) ---
    const getFonteName = (p: any) => {
        if (!p) return 'Pesquisa';
        let f = p.fonte || p.origem || p.tipo || p.tipoFonte || p.fornecedor || p.nomeFornecedor || p.nome || p.id || '';
        if (typeof f !== 'string') f = String(f);
        const val = f.toLowerCase().trim();
        
        if (val === 'simas' || val.includes('simas')) return 'SIMAS';
        if (val === 'pncp' || val.includes('pncp')) return 'PNCP';
        if (val.includes('nfe') || val.includes('nota') || val.includes('fiscal')) return 'Nota Fiscal';
        if (val.includes('site') || val.includes('mídia') || val.includes('midia') || val.includes('especializada')) return 'Mídia Especializada';
        if (val.includes('similar') || val.includes('contrata')) return 'Contratação Similar';
        if (val.includes('direta') || val === 'fornecedor') return 'Pesquisa Direta';
        
        if (f && f.trim() !== '' && f !== 'undefined' && f !== '[object Object]') {
            return f.length > 20 ? f.substring(0, 17) + '...' : f;
        }
        return 'Pesquisa';
    };

    const customDrawSignature = (doc: jsPDF, nome: string, guerra: string, cargo: string, funcao: string, x: number, y: number) => {
        const lineLength = 80;
        doc.setDrawColor(0); 
        doc.setLineWidth(0.1); 
        doc.line(x - lineLength / 2, y, x + lineLength / 2, y);
        doc.setFont('helvetica', 'normal');
        
        const textNome = (nome || '') + (guerra ? ` - ${guerra}` : '');
        const textCargo = cargo ? ` - ${cargo}` : '';
        
        doc.setFontSize(10);
        const wNome = doc.getTextWidth(textNome);
        doc.setFontSize(8);
        const wCargo = textCargo ? doc.getTextWidth(textCargo) : 0;
        
        const totalW = wNome + wCargo;
        const startX = x - (totalW / 2);
        
        doc.setFontSize(10);
        doc.text(textNome, startX, y + 4);
        
        if (textCargo) {
            doc.setFontSize(8);
            doc.text(textCargo, startX + wNome, y + 4);
        }
        if (funcao) {
            doc.setFontSize(8);
            doc.text(funcao, x, y + 8, { align: 'center' });
        }
    };
    // ----------------------------------------------------------------------

    const pageHeight = doc.internal.pageSize.getHeight();
    let y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);
    setDefaultFont(doc);

    const drawSafeTable = (options: any): number => {
        let startY = options.startY || y;
        if (startY > pageHeight - 40) {
            doc.addPage();
            startY = 30; 
        }
        options.startY = startY;
        options.margin = { top: 30, bottom: 40, left: MARGIN_LEFT, right: MARGIN_RIGHT };
        options.pageBreak = 'auto';
        options.rowPageBreak = 'avoid'; 
        
        autoTable(doc, options);
        return Math.round((doc as any).lastAutoTable.finalY);
    };

    const addPage = (h: number) => { 
        if (y + h > pageHeight - 40) { 
            doc.addPage(); 
            y = 30; 
        } 
    };

    const drawHeader = (title: string, sub: string) => {
        doc.setFont('helvetica', 'bold'); 
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(title, USABLE_WIDTH - 4);
        const titleHeight = lines.length * 4;
        const subHeight = sub ? 4 : 0;
        const h = titleHeight + subHeight + 8; 
        
        addPage(h + 15);
        doc.setFillColor(...BLUE); 
        doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, h, 'FD');
        const startY = y + 7;
        doc.setTextColor(255); 
        doc.text(lines, PAGE_WIDTH / 2, startY, { align: 'center' });
        
        if (sub) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(sub, PAGE_WIDTH / 2, startY + titleHeight, { align: 'center' });
        }
        doc.setTextColor(0); 
        y += h;
    };

    // Sec 1
    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const s1Head = [['Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd']];
    const s1Body: any[] = [];
    data.itemGroups.forEach(g => {
        s1Body.push([
            { content: g.itemTR.toString(), styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } }, 
            { content: g.descricao, styles: { halign: 'left', valign: 'middle' } }, 
            { content: g.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } }, 
            { content: g.unidade, styles: { halign: 'center', valign: 'middle' } }, 
            { content: (g.quantidadeTotal || 0).toString(), styles: { halign: 'center', valign: 'middle' } }
        ]);
    });
    y = drawSafeTable({ startY: y, theme: 'grid', head: s1Head, body: s1Body, headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1 }, columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 22 }, 3: { cellWidth: 15 }, 4: { cellWidth: 15 } } });
    y += 8;

    // Sec 2
    drawHeader('2 - FONTES CONSULTADAS PARA A PESQUISA DE PREÇO', '(art. 2º, III, e art. 4º do Decreto Estadual nº 2.734/2022)');
    addPage(30); y += 4;
    const fMap = [['simas', 'SIMAS (banco referencial de preço).'], ['nfe', 'Base nacional de notas fiscais eletrônicas.'], ['pncp', 'Portal Nacional de Compras Públicas (PNCP).'], ['siteEspecializado', 'Mídia especializada.'], ['contratacaoSimilar', 'Contratações similares feitas pela administração pública.'], ['direta', 'Pesquisa direta com fornecedores.']];
    fMap.forEach((f, i) => {
        const isR = i % 2 !== 0; const cx = MARGIN_LEFT + (isR ? USABLE_WIDTH / 2 : 0); const cy = y + Math.floor(i / 2) * 6;
        doc.rect(cx, cy - 3, 4, 4);
        if (data.fontesPesquisa.includes(f[0])) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 1, cy + 0.5); doc.setFont('helvetica', 'normal'); }
        doc.setFontSize(9); doc.text(f[1], cx + 5, cy);
    });
    y += 22;

    // Sec 3
    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    y = drawSafeTable({ startY: y, body: [[{ content: data.justificativaAusenciaFonte?.trim() || 'Não se aplica.', styles: { valign: 'middle' } }]], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 } });
    y += 8;

    // Sec 4
    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.length === 1 && data.fontesPesquisa.includes('direta');
    const s4b: any[] = [[
        { content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left', valign: 'middle' } },
        { content: ' ', styles: { halign: 'center', valign: 'middle' } }, 
        { content: `Justificativa: ${isDir ? (data.justificativaPesquisaDireta || 'Não se aplica.') : 'Não se aplica.'}`, styles: { halign: 'left', valign: 'middle' } }
    ]];
    const rowIndex4_3 = 1 + (data.fornecedoresDiretos?.length || 0);

    if (isDir && data.fornecedoresDiretos?.length) {
        data.fornecedoresDiretos.forEach((f, i) => {
            s4b.push([
                { content: i === 0 ? '4.2 – QUAIS AS RAZÕES DA ESCOLHA DOS FORNECEDORES COTADOS?' : ' ', styles: { valign: 'middle' } },
                { content: f.nome, styles: { halign: 'center', valign: 'middle' } }, 
                { content: `Justificativa: ${f.justificativa}`, styles: { valign: 'middle' } }
            ]);
        });
        data.fornecedoresDiretos.forEach((f, i) => {
            s4b.push([
                { content: i === 0 ? '4.3 - AS PROPOSTAS FORMAIS CONTÊM OS REQUISITOS?' : ' ', styles: { valign: 'middle' } },
                { content: f.nome, styles: { halign: 'center', valign: 'middle' } }, 
                { content: ' ', styles: { halign: 'center', valign: 'middle' } } 
            ]);
        });
    }

    y = drawSafeTable({
        startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } },
        didDrawCell: (cellData) => {
            if (cellData.section === 'body') {
                if (cellData.row.index === 0 && cellData.column.index === 1) {
                    const cx = cellData.cell.x + cellData.cell.width / 2 - 6; const cy = cellData.cell.y + cellData.cell.height / 2;
                    doc.setDrawColor(0); doc.setLineWidth(0.1);
                    doc.rect(cx, cy - 4.5, 3, 3);
                    if (isDir) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy - 2); doc.setFont('helvetica', 'normal'); }
                    doc.text('Sim', cx + 5, cy - 2);
                    doc.rect(cx, cy + 1.5, 3, 3);
                    if (!isDir) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 4); doc.setFont('helvetica', 'normal'); }
                    doc.text('Não', cx + 5, cy + 4);
                }
                if (isDir && data.fornecedoresDiretos?.length && cellData.row.index >= rowIndex4_3 && cellData.column.index === 2) {
                    const fIndex = cellData.row.index - rowIndex4_3; const reqSim = data.fornecedoresDiretos[fIndex].requisitos === 'sim';
                    const cx = cellData.cell.x + cellData.cell.width / 2 - 6; const cy = cellData.cell.y + cellData.cell.height / 2;
                    doc.setDrawColor(0); doc.setLineWidth(0.1);
                    doc.rect(cx, cy - 4.5, 3, 3);
                    if (reqSim) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy - 2); doc.setFont('helvetica', 'normal'); }
                    doc.text('Sim', cx + 5, cy - 2);
                    doc.rect(cx, cy + 1.5, 3, 3);
                    if (!reqSim) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 4); doc.setFont('helvetica', 'normal'); }
                    doc.text('Não', cx + 5, cy + 4);
                }
            }
        }
    });
    y += 8;

    // Sec 5 
    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia;
    y = drawSafeTable({
        startY: y, theme: 'grid', styles: { fontSize: 9, halign: 'left', lineColor: 0, lineWidth: 0.1 },
        body: [[ { content: ' ', styles: { minCellHeight: 12 } }, { content: ' ', styles: { minCellHeight: 12 } }, { content: ' ' } ]],
        didDrawCell: (cellData) => {
            if (cellData.section === 'body') {
                const cx = cellData.cell.x + 4; const cy = cellData.cell.y + cellData.cell.height / 2;
                doc.setDrawColor(0); doc.setLineWidth(0.1); doc.rect(cx, cy - 2.5, 3, 3); doc.setFontSize(9); doc.setTextColor(0);
                if (cellData.column.index === 0) {
                    if (met === 'menor') { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 0); doc.setFont('helvetica', 'normal'); }
                    doc.text('Menor preço\n(mercado restrito)', cx + 5, cy + 0);
                }
                if (cellData.column.index === 1) {
                    if (met === 'media') { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 0); doc.setFont('helvetica', 'normal'); }
                    doc.text('Média\n(preços semelhantes)', cx + 5, cy + 0);
                }
                if (cellData.column.index === 2) {
                    if (met === 'mediana') { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 0); doc.setFont('helvetica', 'normal'); }
                    doc.text('Mediana\n(preços com grande variação)', cx + 5, cy + 0);
                }
            }
        }
    });
    y += 8;

    // Sec 6
    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    const maxPrecos = Math.max(...data.itemGroups.map(g => (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false).length), 1);
    
    const s6Head = [
        { content: 'Item', styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }, 
        { content: 'Preços Encontrados', colSpan: maxPrecos, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
    ];
    
    const s6ColStyles: any = { 0: { cellWidth: 15, halign: 'center' } };
    for(let i = 1; i <= maxPrecos; i++) { s6ColStyles[i] = { cellWidth: 'auto', halign: 'center' }; }
    
    const s6b: any[] = [];
    data.itemGroups.forEach(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        const row: any[] = [{ content: g.itemTR.toString(), styles: { halign: 'center', valign: 'middle' } }];
        for(let i = 0; i < maxPrecos; i++) {
            if (p[i]) {
                const fname = getFonteName(p[i]);
                row.push({ content: `${formatValue(p[i].value, g.tipoValor)}\n(${fname})`, styles: { halign: 'center', valign: 'middle' } });
            } else {
                row.push({ content: '-', styles: { halign: 'center', valign: 'middle' } });
            }
        }
        s6b.push(row);
    });
    y = drawSafeTable({ startY: y, head: [s6Head], body: s6b, theme: 'grid', headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, styles: { fontSize: 7, lineColor: 0, lineWidth: 0.1, halign: 'center' }, columnStyles: s6ColStyles });
    y += 4;

    const desc = data.houveDescarte;
    y = drawSafeTable({
        startY: y, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: 'HOUVE DESCARTE DE\nPREÇO?', styles: { fillColor: LBLUE, fontStyle: 'bold', halign: 'center', cellWidth: 40, valign: 'middle' } },
            { content: ' ', styles: { cellWidth: 30, valign: 'middle' } }, 
            { content: `Justificativa: ${desc === 'sim' ? data.justificativaDescarte : 'Não se aplica.'}`, styles: { valign: 'middle' } }
        ]],
        didDrawCell: (cellData) => {
            if (cellData.section === 'body' && cellData.column.index === 1) {
                const cx = cellData.cell.x + 6; const cy = cellData.cell.y + cellData.cell.height / 2;
                doc.setDrawColor(0); doc.setLineWidth(0.1); doc.rect(cx, cy - 4.5, 3, 3);
                if (desc === 'sim') { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy - 2); doc.setFont('helvetica', 'normal'); }
                doc.text('Sim.', cx + 5, cy - 2);
                doc.rect(cx, cy + 1.5, 3, 3);
                if (desc === 'nao') { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.5, cy + 4); doc.setFont('helvetica', 'normal'); }
                doc.text('Não.', cx + 5, cy + 4);
            }
        }
    });
    y += 12;

    // TABELA FINAL
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PREÇO ESTIMADO DE MERCADO', PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let total = 0; let seqCounter = 1; const fb: any[] = [];
    data.itemGroups.forEach(g => {
        const totalLinha = g.estimativaUnitaria * (g.quantidadeTotal || 0); total += totalLinha;
        const cotasValidas = g.cotas?.filter(c => c.quantidade && c.quantidade > 0);
        
        if (cotasValidas && cotasValidas.length > 0) {
            cotasValidas.forEach((c, index) => {
                let labelCota = 'AMPLA';
                const cId = String(c.id).toLowerCase();
                
                if (cId.includes('meepp') || cId.includes('me_epp') || cId.includes('reservada') || cId.includes('me-epp')) {
                    labelCota = 'ME/EPP';
                } else if (cId.includes('ampla') || cId.includes('principal')) {
                    labelCota = 'AMPLA';
                } else {
                    if (cotasValidas.length > 1) {
                        labelCota = index === 0 ? 'AMPLA' : 'ME/EPP';
                    } else {
                        labelCota = (g.estimativaUnitaria * g.quantidadeTotal <= 80000) ? 'ME/EPP' : 'AMPLA';
                    }
                }

                fb.push([
                    { content: (seqCounter++).toString(), styles: { fillColor: [255,255,255], valign: 'middle', halign: 'center' } },
                    { content: `${g.descricao} (Cota ${labelCota})`, styles: { valign: 'middle', halign: 'left' } },
                    { content: labelCota, styles: { valign: 'middle', halign: 'center' } },
                    { content: formatValue(g.estimativaUnitaria, g.tipoValor), styles: { valign: 'middle', halign: 'center' } },
                    { content: c.quantidade?.toString() || '0', styles: { valign: 'middle', halign: 'center' } },
                    { content: formatValue(c.quantidade * g.estimativaUnitaria, g.tipoValor), styles: { valign: 'middle', halign: 'center' } }
                ]);
            });
        } else {
            const labelCota = (g.estimativaUnitaria * g.quantidadeTotal <= 80000) ? 'ME/EPP' : 'AMPLA';
            
            fb.push([
                { content: (seqCounter++).toString(), styles: { fillColor: [255,255,255], valign: 'middle', halign: 'center' } }, 
                { content: `${g.descricao} (Cota ${labelCota})`, styles: { valign: 'middle', halign: 'left' } }, 
                { content: labelCota, styles: { valign: 'middle', halign: 'center' } }, 
                { content: formatValue(g.estimativaUnitaria, g.tipoValor), styles: { valign: 'middle', halign: 'center' } }, 
                { content: (g.quantidadeTotal || 0).toString(), styles: { valign: 'middle', halign: 'center' } }, 
                { content: formatValue(totalLinha, g.tipoValor), styles: { valign: 'middle', halign: 'center' } }
            ]);
        }
    });
    
    fb.push([{ content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW, valign: 'middle' } }, { content: formatValue(total, 'moeda'), styles: { fontStyle: 'bold', fillColor: YELLOW, halign: 'center', valign: 'middle' } }]);
    
    y = drawSafeTable({ startY: y, head: [['Item', 'Descrição', 'AMPLA OU\nME/EPP', 'Valor Unit.', 'Qtd', 'Total']], body: fb, theme: 'grid', headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 }, columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 'auto', halign: 'left' }, 2: { cellWidth: 20 }, 3: { cellWidth: 24 }, 4: { cellWidth: 14 }, 5: { cellWidth: 24 } } });
    y += 10;

    // Assinaturas
    const spaceRequired = data.assinante2Nome ? 80 : 30; 
    if (y + spaceRequired > pageHeight - 40) {
        doc.addPage();
        y = 30; 
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    y += 35; 
    
    const centerX = PAGE_WIDTH / 2;
    customDrawSignature(doc, data.assinante1Nome, data.assinante1NomeGuerra, data.assinante1Cargo, data.assinante1Funcao, centerX, y);
    
    if (data.assinante2Nome) {
        y += 50; 
        customDrawSignature(doc, data.assinante2Nome, data.assinante2NomeGuerra, data.assinante2Cargo, data.assinante2Funcao, centerX, y);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
    }
};