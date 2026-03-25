import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData } from '../../../types';
import { formatDate, setDefaultFont, formatValue, drawInstitutionalHeader, drawInstitutionalFooter } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const SAFE_BOTTOM_MARGIN = 45; 

export const generateOrcamentoLicitacaoPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);

    const addPage = (h: number) => { if (y + h > PAGE_HEIGHT - SAFE_BOTTOM_MARGIN) { doc.addPage(); y = MARGIN_TOP; } };

    const drawHeader = (title: string, sub: string) => {
        doc.setFont('helvetica', 'bold'); 
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(title, USABLE_WIDTH - 4);
        const titleHeight = lines.length * 4;
        const subHeight = sub ? 4 : 0;
        const totalTextHeight = titleHeight + subHeight;
        const paddingVertical = 8; 
        const h = totalTextHeight + paddingVertical; 
        
        addPage(h + 10);
        
        doc.setFillColor(...BLUE); 
        doc.rect(MARGIN_LEFT, y, USABLE_WIDTH, h, 'FD');
        const startY = y + (paddingVertical / 2) + 3;
        
        doc.setTextColor(255); 
        doc.text(lines, PAGE_WIDTH / 2, startY, { align: 'center' });
        
        if (sub) {
            doc.setFont('helvetica', 'normal'); 
            doc.setFontSize(8);
            doc.text(sub, PAGE_WIDTH / 2, startY + titleHeight, { align: 'center' });
        }
        
        doc.setTextColor(0); 
        y += h;
    };

    const checkboxHook = (data: any) => {
        if (data.cell.raw && data.cell.raw.hasCheckboxes) {
            const states = data.cell.raw.checkboxStates;
            let startX = data.cell.x + 3;
            
            if (data.cell.styles.halign === 'center') {
                const firstLine = data.cell.text[0] || '';
                doc.setFont('helvetica', data.cell.styles.fontStyle);
                doc.setFontSize(data.cell.styles.fontSize);
                const textWidth = doc.getTextWidth(firstLine);
                startX = data.cell.x + (data.cell.width / 2) - (textWidth / 2) - 4;
            }

            const startY = data.cell.y + data.cell.padding('top') + 1.2; 
            const lineHeight = data.cell.styles.fontSize * 0.352777 * 1.15;
            
            states.forEach((isChecked: boolean, i: number) => {
                const rectY = startY + (i * lineHeight);
                doc.setLineWidth(0.2);
                doc.rect(startX, rectY, 3, 3); 
                if (isChecked) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('X', startX + 0.6, rectY + 2.3);
                    doc.setFont('helvetica', 'normal');
                }
            });
        }
    };

    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    // Sec 1
    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    
    const s1Body: any[] = [];
    s1Body.push([
        { content: 'Item', styles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Descrição', styles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Código\nSIMAS', styles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Und', styles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
        { content: 'Qtd', styles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' } }
    ]);

    data.itemGroups.forEach(g => {
        s1Body.push([
            { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } }, 
            { content: g.descricao, styles: { halign: 'left', valign: 'middle' } },
            { content: g.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } }, 
            { content: g.unidade, styles: { halign: 'center', valign: 'middle' } }, 
            { content: (g.quantidadeTotal || 0).toString(), styles: { halign: 'center', valign: 'middle' } }
        ]);
    });

    autoTable(doc, {
        startY: y, 
        theme: 'grid', 
        body: s1Body, 
        rowPageBreak: 'avoid', 
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 15 }, 2: { cellWidth: 25 }, 3: { cellWidth: 15 }, 4: { cellWidth: 15 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
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
        doc.setLineWidth(0.2);
        doc.rect(cx, cy - 3, 3, 3);
        if (data.fontesPesquisa.includes(f[0])) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 0.6, cy - 0.7); doc.setFont('helvetica', 'normal'); }
        doc.setFontSize(9); doc.text(f[1], cx + 5, cy);
    });
    y += 22;

    // Sec 3
    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    autoTable(doc, { startY: y, body: [[data.justificativaAusenciaFonte?.trim() || 'Não se aplica.']], theme: 'grid', rowPageBreak: 'avoid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN } });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 4
    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.length === 1 && data.fontesPesquisa.includes('direta');
    const s4b: any[] = [[
        { content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left' } },
        { content: `      Sim\n      Não`, hasCheckboxes: true, checkboxStates: [isDir, !isDir], styles: { halign: 'left' } },
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
                { content: f.nome, styles: { halign: 'center' } }, 
                { content: `      Sim\n      Não`, hasCheckboxes: true, checkboxStates: [f.requisitos === 'sim', f.requisitos === 'nao'], styles: { halign: 'left' } }
            ]);
        });
    }
    autoTable(doc, { 
        startY: y, body: s4b, theme: 'grid', rowPageBreak: 'avoid', 
        styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, 
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } }, 
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        didDrawCell: checkboxHook 
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 5
    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia;
    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, rowPageBreak: 'avoid', styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: 'Menor preço\n(mercado restrito)', hasCheckboxes: true, checkboxStates: [met === 'menor'], styles: { fontStyle: met === 'menor' ? 'bold' : 'normal', halign: 'center' } },
            { content: 'Média\n(preços semelhantes)', hasCheckboxes: true, checkboxStates: [met === 'media'], styles: { fontStyle: met === 'media' ? 'bold' : 'normal', halign: 'center' } },
            { content: 'Mediana\n(preços com grande variação)', hasCheckboxes: true, checkboxStates: [met === 'mediana'], styles: { fontStyle: met === 'mediana' ? 'bold' : 'normal', halign: 'center' } }
        ]],
        didDrawCell: checkboxHook 
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 6
    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    
    let maxPrices = 1;
    data.itemGroups.forEach(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        if (p.length > maxPrices) maxPrices = p.length;
    });

    const s6Head = [[
        { content: 'Item', rowSpan: 1, styles: { halign: 'center', valign: 'middle', cellWidth: 15 } },
        { content: 'Preços Encontrados e Fontes', colSpan: maxPrices, styles: { halign: 'center', valign: 'middle' } }
    ]];

    const s6b: any[] = [];
    data.itemGroups.forEach(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        
        const priceCells = p.map(x => {
            let sourceName = x.source;
            if(sourceName === 'simas') sourceName = 'SIMAS';
            else if(sourceName === 'pncp') sourceName = 'PNCP';
            else if(sourceName === 'siteEspecializado') sourceName = 'Mídia Esp.';
            else if(sourceName === 'contratacaoSimilar') sourceName = 'Contrat. Similar';
            else if(sourceName === 'nfe') sourceName = 'Nota Fiscal';
            else if(sourceName === 'direta') sourceName = 'Fornecedor';
            else if(sourceName === 'preco_ata_srp') sourceName = 'ATA SRP';

            return `${formatValue(x.value, g.tipoValor)}\n(${sourceName})`;
        });

        while(priceCells.length < maxPrices) {
            priceCells.push('-');
        }

        s6b.push([ 
            { content: g.itemTR, styles: { halign: 'center', valign: 'middle' } }, 
            ...priceCells.map(c => ({ content: c, styles: { halign: 'center', valign: 'middle' } })) 
        ]);
    });

    autoTable(doc, { 
        startY: y, head: s6Head, body: s6b, theme: 'grid', rowPageBreak: 'avoid', 
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, 
        styles: { fontSize: 8, lineColor: 0, lineWidth: 0.1, halign: 'center' }, 
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN } 
    });
    y = (doc as any).lastAutoTable.finalY;

    const desc = data.houveDescarte;
    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, rowPageBreak: 'avoid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: 'HOUVE DESCARTE DE\nPREÇO?', styles: { fillColor: LBLUE, fontStyle: 'bold', halign: 'center', cellWidth: 40 } },
            { content: `      Sim.\n      Não.`, hasCheckboxes: true, checkboxStates: [desc === 'sim', desc === 'nao'], styles: { cellWidth: 30, halign: 'left' } },
            { content: `Justificativa: ${desc === 'sim' ? data.justificativaDescarte : 'Não se aplica.'}` }
        ]],
        didDrawCell: checkboxHook
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Tabela Final com a lógica matemática infalível para AMPLA e ME/EPP
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PREÇO ESTIMADO DE MERCADO', PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let total = 0;
    const fb: any[] = [];
    let seqItem = 1; 

    data.itemGroups.forEach(g => {
        const est = Number(g.estimativaUnitaria) || 0;
        const qtdTotal = Number(g.quantidadeTotal) || 0;
        const totalLinha = est * qtdTotal; 
        total += totalLinha;
        
        const cotasValidas = g.cotas?.filter(c => Number(c.quantidade) > 0);

        if (cotasValidas && cotasValidas.length > 0) {
            // Descobre qual cota possui a maior quantidade de todas para aquele item
            const maxQtd = Math.max(...cotasValidas.map(c => Number(c.quantidade) || 0));

            cotasValidas.forEach((c) => {
                const cQtd = Number(c.quantidade) || 0;
                
                // Se a cota tiver a quantidade máxima estipulada, ela é automaticamente "AMPLA"
                let label = (cQtd === maxQtd) ? 'AMPLA' : 'ME/EPP';
                
                // Medida de segurança: se existir apenas uma cota válida, ela é absoluta (AMPLA)
                if (cotasValidas.length === 1) {
                    label = 'AMPLA';
                }

                fb.push([
                    seqItem.toString(), 
                    { content: g.descricao, styles: { halign: 'left', valign: 'middle' } }, 
                    label, 
                    formatValue(est, g.tipoValor), 
                    cQtd, 
                    formatValue(cQtd * est, g.tipoValor)
                ]);
                seqItem++; 
            });
        } else {
            let cotaLabel = 'AMPLA'; 
            fb.push([
                seqItem.toString(), 
                { content: g.descricao, styles: { halign: 'left', valign: 'middle' } }, 
                cotaLabel, 
                formatValue(est, g.tipoValor), 
                qtdTotal, 
                formatValue(totalLinha, g.tipoValor)
            ]);
            seqItem++;
        }
    });
    
    fb.push([{ content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }, { content: formatValue(total, 'moeda'), styles: { fontStyle: 'bold', fillColor: YELLOW } }]);
    
    autoTable(doc, {
        startY: y, head: [['Item', 'Descrição', 'AMPLA OU\nME/EPP', 'Valor Unit.', 'Qtd', 'Total']], body: fb, theme: 'grid', rowPageBreak: 'avoid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 15 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    const drawSignatureLocal = (nome: string, cargo: string, funcao: string, xPos: number, yPos: number) => {
        if (!nome) return;
        
        doc.setLineWidth(0.2); 
        doc.line(xPos - 55, yPos, xPos + 55, yPos);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const nomeCargo = cargo ? `${nome} - ${cargo}` : nome;
        doc.text(nomeCargo, xPos, yPos + 4, { align: 'center' });
        
        if (funcao) {
            doc.setFont('helvetica', 'normal');
            doc.text(funcao, xPos, yPos + 8, { align: 'center' });
        }
    };

    addPage(40);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    y += 35; 
    
    const centerX = PAGE_WIDTH / 2; 

    // Rede de segurança para pegar o "Vol. Civil" mesmo quando a tela esquecer de avisar que ele foi selecionado
    const cargo1 = data.assinante1Cargo || data.assinante1NomeGuerra || (data.assinante1Nome ? 'Vol. Civil' : '');
    const cargo2 = data.assinante2Cargo || data.assinante2NomeGuerra || '';

    drawSignatureLocal(data.assinante1Nome, cargo1, data.assinante1Funcao, centerX, y);
    
    if (data.assinante2Nome) {
        y += 45; 
        addPage(30); 
        drawSignatureLocal(data.assinante2Nome, cargo2, data.assinante2Funcao, centerX, y);
    }

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