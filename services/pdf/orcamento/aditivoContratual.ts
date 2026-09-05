import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData, OrcamentoItemGroup } from '../../../types';
import { formatDate, setDefaultFont, formatValue, drawInstitutionalHeader, drawInstitutionalFooter, createJustifiedCellHooks } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const ZEBRA_BLUE: [number, number, number] = [244, 249, 255]; 
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const SAFE_BOTTOM_MARGIN = 45; 

const nomesFontesCurto: Record<string, string> = {
    simas: 'SIMAS', nfe: 'Nota Fiscal', pncp: 'PNCP', siteEspecializado: 'Mídia Especializada',
    contratacaoSimilar: 'Similar', direta: 'Pesquisa Direta', preco_ata_srp: 'Ata SRP'
};

export const generateOrcamentoAditivoPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);
    const { willDrawCell: justifyWillDrawCell, didDrawCell: justifyDrawCell } = createJustifiedCellHooks(doc);

    const isAta = data.subTipoAditivo === 'ata';
    
    const isTaxaItem = (g: any) => g.tipoValor === 'percentual' || String(g.descricao || '').toLowerCase().includes('taxa');

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

    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const s1Body: any[] = (data.itemGroups || []).map((g) => {
        let desc = g.descricao || '';
        if (isAta && (g as any).numeroAtaAditivo) desc += `\n(Ata Origem: ${(g as any).numeroAtaAditivo})`;

        return [
            { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } },
            { content: desc, styles: { halign: 'justify' } }, g.codigoSimas || '-', g.unidade || '-', g.quantidadeTotal
        ];
    });
    autoTable(doc, {
        startY: y, theme: 'grid', head: [['Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd']], body: s1Body,
        headStyles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        columnStyles: { 0: { cellWidth: 15 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: justifyWillDrawCell,
        didDrawCell: justifyDrawCell
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('2 - FONTES CONSULTADAS PARA A PESQUISA DE PREÇO', '(art. 2º, III, e art. 4º do Decreto Estadual nº 2.734/2022)');
    const fMap = [['simas', 'SIMAS (banco referencial de preço).'], ['nfe', 'Base nacional de notas fiscais eletrônicas.'], ['pncp', 'Portal Nacional de Compras Públicas (PNCP).'], ['siteEspecializado', 'Mídia especializada.'], ['contratacaoSimilar', 'Contratações similares feitas pela administração pública.'], ['direta', 'Pesquisa direta com fornecedores.']];
    y += 4;
    fMap.forEach((f, i) => {
        const isR = i % 2 !== 0; const cx = MARGIN_LEFT + (isR ? USABLE_WIDTH / 2 : 0); const cy = y + Math.floor(i / 2) * 6;
        doc.rect(cx, cy - 3, 4, 4);
        if ((data.fontesPesquisa || []).includes(f[0])) { doc.setFont('helvetica', 'bold'); doc.text('X', cx + 1, cy + 0.5); doc.setFont('helvetica', 'normal'); }
        doc.setFontSize(9); doc.text(f[1], cx + 5, cy);
    });
    y += 22;

    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    autoTable(doc, { startY: y, body: [[{ content: data.justificativaAusenciaFonte?.trim() || 'Não se aplica.', styles: { halign: 'justify' } }]], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, rowPageBreak: 'avoid', willDrawCell: justifyWillDrawCell, didDrawCell: justifyDrawCell });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = (data.fontesPesquisa || []).includes('direta');
    const s4b: any[] = [[{ content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left' } }, { content: `${isDir ? '[ X ]' : '[   ]'} Sim\n${!isDir ? '[ X ]' : '[   ]'} Não`, styles: { halign: 'center' } }, { content: `Justificativa: ${isDir ? (data.justificativaPesquisaDireta || 'Não se aplica.') : 'Não se aplica.'}`, styles: { halign: 'justify' } }]];
    autoTable(doc, { startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } }, rowPageBreak: 'avoid', willDrawCell: justifyWillDrawCell, didDrawCell: justifyDrawCell });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia || 'media';
    autoTable(doc, { startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 }, body: [[{ content: `${met === 'menor' ? '[ X ]' : '[   ]'} Menor preço\n(mercado restrito)`, styles: { fontStyle: met === 'menor' ? 'bold' : 'normal' } }, { content: `${met === 'media' ? '[ X ]' : '[   ]'} Média\n(preços semelhantes)`, styles: { fontStyle: met === 'media' ? 'bold' : 'normal' } }, { content: `${met === 'mediana' ? '[ X ]' : '[   ]'} Mediana\n(preços com grande variação)`, styles: { fontStyle: met === 'mediana' ? 'bold' : 'normal' } }]] });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    
    // RESTAURAÇÃO DAS COLUNAS DINÂMICAS E NOMES DAS FONTES
    const checkedSources = data.fontesPesquisa || [];
    const processedItems = (data.itemGroups || []).map(g => {
        let pArray = (data.precosEncontrados?.[g.id] || []).filter(x => data.precosIncluidos?.[x.id] !== false);
        
        const sourcesPresent = new Set(pArray.map(p => p.source));
        checkedSources.forEach(src => {
            if (!sourcesPresent.has(src)) {
                pArray.push({ id: `dummy-${src}`, source: src, value: '' });
            }
        });
        return { g, pArray };
    });

    const maxPrecos = Math.max(...processedItems.map(x => x.pArray.length), 1);

    const s6b: any[] = [];
    processedItems.forEach(({ g, pArray }) => {
        const row: any[] = [{ content: g.itemTR, styles: { halign: 'center', valign: 'middle' } }];

        if (pArray.length === 0) {
            row.push({ content: 'Nenhum preço inserido.', colSpan: maxPrecos, styles: { halign: 'center', fontStyle: 'italic', valign: 'middle' } });
        } else {
            for (let i = 0; i < maxPrecos; i++) {
                if (pArray[i]) {
                    const sourceName = nomesFontesCurto[pArray[i].source] || pArray[i].source;
                    const rawVal = pArray[i].value;
                    
                    if (!rawVal || String(rawVal).trim() === '') {
                        row.push({ content: `-\n(${sourceName})`, styles: { halign: 'center', valign: 'middle' } });
                    } else {
                        const isPercent = String(rawVal).includes('%') || isTaxaItem(g);
                        const numValue = Number(String(rawVal).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
                        const valRender = isPercent ? `${numValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` : formatValue(numValue, 'moeda');
                        row.push({ content: `${valRender}\n(${sourceName})`, styles: { halign: 'center', valign: 'middle' } });
                    }
                } else {
                    row.push({ content: '-', styles: { halign: 'center', valign: 'middle' } });
                }
            }
        }
        s6b.push(row);
    });

    autoTable(doc, { 
        startY: y, 
        head: [[{ content: 'Item', styles: { halign: 'center', valign: 'middle' } }, { content: 'Preços Encontrados e Fontes', colSpan: maxPrecos, styles: { halign: 'center' } }]], 
        body: s6b, 
        theme: 'grid', 
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center' }, 
        styles: { fontSize: 8, lineColor: 0, lineWidth: 0.1, halign: 'center' }, 
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        columnStyles: { 0: { cellWidth: 15 } }
    });
    y = (doc as any).lastAutoTable.finalY;

    const desc = data.houveDescarte;
    autoTable(doc, { startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, body: [[{ content: 'HOUVE DESCARTE DE\nPREÇO?', styles: { fillColor: LBLUE, fontStyle: 'bold', halign: 'center', cellWidth: 40 } }, { content: `${desc === 'sim' ? '[ X ]' : '[   ]'} Sim.\n${desc === 'nao' ? '[ X ]' : '[   ]'} Não.`, styles: { cellWidth: 30, halign: 'center' } }, { content: `Justificativa: ${desc === 'sim' ? data.justificativaDescarte : 'Não se aplica.'}`, styles: { halign: 'justify' } }]], rowPageBreak: 'avoid', willDrawCell: justifyWillDrawCell, didDrawCell: justifyDrawCell });
    y = (doc as any).lastAutoTable.finalY + 12;

    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const tituloQuadro = isAta ? 'QUADRO COMPARATIVO - ADITIVO À ATA DE REGISTRO DE PREÇOS' : `QUADRO COMPARATIVO - ADITIVO CONTRATUAL - CONTRATO ${data.numeroContrato || 'NNNN'}/${data.anoContrato || 'AAAA'}`;
    doc.text(tituloQuadro, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;

    let colValorReferencia = isAta ? 'Valor Unitário da Ata' : 'Valor Unitário Contrato';
    if (!isAta) {
        if (data.haveraReajuste === 'sim' && data.porcentagemReajuste) colValorReferencia = `Valor Unitário com\nReajuste ${data.porcentagemReajuste}%`;
        else colValorReferencia = `Valor Unitário Contrato\n(s/ reajuste)`;
    }

    const qcb = (data.itemGroups || []).map(g => {
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        const vUnitReajustado = Math.round((vUnitContrato * (1 + pctReajuste / 100)) * 100) / 100;
        let descInfo = g.descricao || '';
        if (isAta && (g as any).numeroAtaAditivo) descInfo += `\n(Ata: ${(g as any).numeroAtaAditivo})`;

        const renderBaseVal = (v: number) => g.tipoValor === 'percentual' ? `${v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` : formatValue(v, 'moeda');
        const renderMercadoVal = (v: number) => isTaxaItem(g) ? `${v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` : formatValue(v, 'moeda');
        const mercadoValue = Number(g.estimativaUnitaria);
        const mercadoDisplay = Number.isFinite(mercadoValue) ? renderMercadoVal(mercadoValue) : '-';

        return [
            { content: g.itemTR, styles: { halign: 'center' } }, { content: descInfo, styles: { halign: 'justify' } },
            { content: mercadoDisplay, styles: { halign: 'center' } },
            { content: renderBaseVal(vUnitReajustado), styles: { halign: 'center' } },
            { content: renderBaseVal(vUnitReajustado), styles: { halign: 'center', fontStyle: 'bold' } }
        ];
    });

    autoTable(doc, {
        startY: y, head: [['Item', 'Descrição', 'Valor de Mercado', colValorReferencia, 'Preço Adotado']], body: qcb, theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, alternateRowStyles: { fillColor: ZEBRA_BLUE },
        styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: justifyWillDrawCell,
        didDrawCell: justifyDrawCell
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    // Tabela Final Preço Estimado Aditivo
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const tituloAlteracao = isAta ? 'PREÇO ESTIMADO DA ALTERAÇÃO DA ATA' : 'PREÇO ESTIMADO DA ALTERAÇÃO CONTRATUAL';
    doc.text(tituloAlteracao, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let somaMensalCentavos = 0;
    let somaPeriodoCentavos = 0;
    let temTaxaGlobal = false; 
    let taxaReferenciaGlobal = 0; 
    
    const isAditivoTempo = data.aditivoTempo === 'sim';
    const aditB: any[] = [];
    const colAditivoValorUnit = isAta ? 'Valor Unit. Ata' : (data.haveraReajuste === 'sim' && data.porcentagemReajuste ? 'Valor Unit. (c/ reajuste)' : 'Valor Unit. (s/ reajuste)');

    (data.itemGroups || []).forEach(g => {
        const gAny = g as any;
        const itemTaxa = isTaxaItem(g);
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        
        const vUnitReajustado = Math.round((vUnitContrato * (1 + pctReajuste / 100)) * 100) / 100;
        
        if (itemTaxa) { temTaxaGlobal = true; taxaReferenciaGlobal = vUnitReajustado; }

        const pctAditivo = Number(gAny.aditivoPercentual) || 0;
        const qtdAditivo = Number(gAny.aditivoQuantidade) || 0;

        const vAditivoMensal = Math.round((vUnitReajustado * qtdAditivo) * 100) / 100;
        const qtdTempo = isAditivoTempo ? (Number(data.aditivoTempoQuantidade) || 1) : 1;
        const vAditivoPeriodo = Math.round((vAditivoMensal * qtdTempo) * 100) / 100;

        somaMensalCentavos += Math.round(vAditivoMensal * 100);
        somaPeriodoCentavos += Math.round(vAditivoPeriodo * 100);

        let descInfo = g.descricao || '';
        if (isAta && gAny.numeroAtaAditivo) descInfo += `\n(Ata: ${gAny.numeroAtaAditivo})`;

        const valUnitRender = itemTaxa ? `${vUnitReajustado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` : formatValue(vUnitReajustado, 'moeda');
        const valAditivoMensalRender = formatValue(vAditivoMensal, 'moeda');
        const totalAditivoRender = itemTaxa ? '-' : formatValue(isAditivoTempo ? vAditivoPeriodo : vAditivoMensal, 'moeda');

        const row = [
            { content: g.itemTR, styles: { halign: 'center' } }, { content: descInfo, styles: { halign: 'justify' } },
            { content: `${pctAditivo.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 4})}%`, styles: { halign: 'center' } },
            { content: valUnitRender, styles: { halign: 'center' } },
            { content: qtdAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 4}), styles: { halign: 'center' } }
        ];

        if (isAditivoTempo) {
            row.push({ content: valAditivoMensalRender, styles: { halign: 'right', fontStyle: 'bold' } });
            row.push({ content: totalAditivoRender, styles: { halign: 'right', fontStyle: 'bold' } });
        } else {
            row.push({ content: totalAditivoRender, styles: { halign: 'right', fontStyle: 'bold' } });
        }

        aditB.push(row);
    });

    const somaMensalReais = somaMensalCentavos / 100;
    const somaPeriodoReais = somaPeriodoCentavos / 100;

    const temPeriodoValido = (data.itemGroups || []).some(g => (g as any).periodoContratacao && String((g as any).periodoContratacao).trim() !== '');
    const stringPeriodoGlobal = ((data.itemGroups || []).find(g => (g as any).periodoContratacao) as any)?.periodoContratacao || '';
    const renderTotalFinal = (valorMoeda: number) => temTaxaGlobal ? `${taxaReferenciaGlobal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` : formatValue(valorMoeda, 'moeda');

    if (isAditivoTempo) {
        const isMensal = data.aditivoTempoUnidade === 'meses';
        aditB.push([
            { content: isMensal ? 'VALOR MENSAL ADITIVADO' : 'VALOR ANUAL ADITIVADO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: renderTotalFinal(somaMensalReais), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } } 
        ]);
        aditB.push([
            { content: `TOTAL DO ADITIVO PARA O PERÍODO (${stringPeriodoGlobal})`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: renderTotalFinal(somaPeriodoReais), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } } 
        ]);
    } else {
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: renderTotalFinal(somaMensalReais), styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } }
        ]);
    }
    
    const aditivoHead = isAditivoTempo
        ? ['Item', 'Descrição', 'Aditivo (%)', colAditivoValorUnit, 'Qtd Aditivo', 'Aditivo Mensal', 'Total no Período']
        : ['Item', 'Descrição', 'Aditivo (%)', colAditivoValorUnit, 'Qtd Aditivo', 'Total do Aditivo'];

    autoTable(doc, {
        startY: y, head: [aditivoHead], body: aditB, theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, alternateRowStyles: { fillColor: ZEBRA_BLUE },
        styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: justifyWillDrawCell,
        didDrawCell: justifyDrawCell
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Assinaturas Híbridas
    // Reserva de uma só vez o espaço de data + assinatura(s), para elas nunca
    // ficarem separadas por uma quebra de página no meio.
    addPage(30 + 15 + (data.assinante2Nome ? 15 + 25 : 0));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    
    const sigX = PAGE_WIDTH / 2;
    y += 30;
    
    const drawSignatureLocal = (nomeCompleto: string, nomeGuerra: string, cargo: string, funcao: string, xPos: number, yPos: number) => {
        if (!nomeCompleto) return;
        doc.setLineWidth(0.1); doc.setDrawColor(120); doc.line(xPos - 40, yPos, xPos + 40, yPos);
        const fullName = (nomeCompleto || '').trim(); const guerra = (nomeGuerra || '').trim(); const cargoTexto = (cargo || '').trim();
        doc.setFontSize(10);
        const idx = guerra ? fullName.toLowerCase().indexOf(guerra.toLowerCase()) : -1;
        
        let before = '', boldGuerra = '', after = '';
        if (idx >= 0) {
            before = fullName.slice(0, idx); boldGuerra = fullName.slice(idx, idx + guerra.length); after = fullName.slice(idx + guerra.length);
        } else { before = fullName; }

        const parts = [{ text: before, bold: false }, { text: boldGuerra, bold: true }, { text: after, bold: false }, { text: ` - ${cargoTexto}`, bold: true }];
        const totalW = parts.reduce((acc, p) => { doc.setFont('helvetica', p.bold ? 'bold' : 'normal'); return acc + doc.getTextWidth(p.text); }, 0);
        let currentX = xPos - (totalW / 2);

        parts.forEach(p => { doc.setFont('helvetica', p.bold ? 'bold' : 'normal'); doc.text(p.text, currentX, yPos + 5); currentX += doc.getTextWidth(p.text); });
        if (funcao) { doc.setFont('helvetica', 'normal'); doc.text(funcao, xPos, yPos + 10, { align: 'center' }); }
    };

    const dataAny = data as any;
    drawSignatureLocal(data.assinante1Nome, dataAny.assinante1NomeGuerra || '', data.assinante1Cargo, data.assinante1Funcao, sigX, y);
    if (data.assinante2Nome) {
        y += 15; y += 25;
        drawSignatureLocal(data.assinante2Nome, dataAny.assinante2NomeGuerra || '', data.assinante2Cargo, data.assinante2Funcao, sigX, y);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        else { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: 'right' }); }
    }
};