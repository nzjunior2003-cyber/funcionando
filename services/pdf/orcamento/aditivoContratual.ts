import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData, OrcamentoItemGroup } from '../../../types';
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
    simas: 'SIMAS', nfe: 'Nota Fiscal', pncp: 'PNCP', siteEspecializado: 'Mídia Especializada',
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

    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const s1Body: any[] = data.itemGroups.map((g) => {
        let desc = g.descricao;
        // Blindagem com (g as any)
        if (isAta && (g as any).numeroAtaAditivo) desc += `\n(Ata Origem: ${(g as any).numeroAtaAditivo})`;

        return [
            { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } },
            desc, g.codigoSimas || '-', g.unidade, g.quantidadeTotal
        ];
    });
    autoTable(doc, {
        startY: y, theme: 'grid', head: [['Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd']], body: s1Body,
        headStyles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        columnStyles: { 0: { cellWidth: 15 }, 1: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

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

    drawHeader('3 - JUSTIFICATIVA DA AUSÊNCIA DE PESQUISA DE PREÇO NO SIMAS, PORTAL NACIONAL DE\nCOMPRAS PÚBLICAS OU EM CONTRATAÇÕES SIMILARES', '(art. 4°, §1°, do Decreto Estadual nº 2.734/2022)');
    autoTable(doc, { startY: y, body: [[data.justificativaAusenciaFonte?.trim() || 'Não se aplica.']], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN } });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.includes('direta');
    const boxDirSim = isDir ? '[ X ]' : '[   ]';
    const boxDirNao = !isDir ? '[ X ]' : '[   ]';

    const s4b: any[] = [[
        { content: '4.1 - É CABÍVEL A UTILIZAÇÃO DA\nPESQUISA DIRETA COM FORNECEDORES?', styles: { halign: 'left' } },
        { content: `${boxDirSim} Sim\n${boxDirNao} Não`, styles: { halign: 'center' } },
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
            const boxReqSim = f.requisitos === 'sim' ? '[ X ]' : '[   ]';
            const boxReqNao = f.requisitos === 'nao' ? '[ X ]' : '[   ]';
            s4b.push([
                i === 0 ? { content: '4.3 - AS PROPOSTAS FORMAIS CONTÊM OS REQUISITOS?', rowSpan: data.fornecedoresDiretos.length } : '',
                { content: f.nome, styles: { halign: 'center' } }, { content: `${boxReqSim} Sim\n${boxReqNao} Não`, styles: { halign: 'center' } }
            ]);
        });
    }
    autoTable(doc, { startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, alternateRowStyles: { fillColor: ZEBRA_BLUE }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN } });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia || 'media';
    const bMenor = met === 'menor' ? '[ X ]' : '[   ]';
    const bMedia = met === 'media' ? '[ X ]' : '[   ]';
    const bMediana = met === 'mediana' ? '[ X ]' : '[   ]';

    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: `${bMenor} Menor preço\n(mercado restrito)`, styles: { fontStyle: met === 'menor' ? 'bold' : 'normal' } },
            { content: `${bMedia} Média\n(preços semelhantes)`, styles: { fontStyle: met === 'media' ? 'bold' : 'normal' } },
            { content: `${bMediana} Mediana\n(preços com grande variação)`, styles: { fontStyle: met === 'mediana' ? 'bold' : 'normal' } }
        ]]
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    
    const checkedSources = data.fontesPesquisa || [];
    const processedItems = data.itemGroups.map(g => {
        let pArray = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        
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
                    
                    if (!rawVal || rawVal.trim() === '') {
                        row.push({ content: `-\n(${sourceName})`, styles: { halign: 'center', valign: 'middle' } });
                    } else {
                        const isPercent = rawVal.includes('%') || g.tipoValor === 'percentual' || g.descricao.toLowerCase().includes('taxa');
                        const numValue = Number(rawVal.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
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
        head: [[{ content: 'Item', styles: { halign: 'center', valign: 'middle' } }, { content: 'Preços Encontrados', colSpan: maxPrecos, styles: { halign: 'center' } }]], 
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
    const bDescSim = desc === 'sim' ? '[ X ]' : '[   ]';
    const bDescNao = desc === 'nao' ? '[ X ]' : '[   ]';

    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }, styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: 'HOUVE DESCARTE DE\nPREÇO?', styles: { fillColor: LBLUE, fontStyle: 'bold', halign: 'center', cellWidth: 40 } },
            { content: `${bDescSim} Sim.\n${bDescNao} Não.`, styles: { cellWidth: 30, halign: 'center' } },
            { content: `Justificativa: ${desc === 'sim' ? data.justificativaDescarte : 'Não se aplica.'}` }
        ]]
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    
    const tituloQuadro = isAta 
        ? 'QUADRO COMPARATIVO - ADITIVO À ATA DE REGISTRO DE PREÇOS' 
        : `QUADRO COMPARATIVO - ADITIVO CONTRATUAL - CONTRATO ${data.numeroContrato || 'NNNN'}/${data.anoContrato || 'AAAA'}`;
        
    doc.text(tituloQuadro, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;

    let colValorReferencia = isAta ? 'Valor Unitário da Ata' : 'Valor Unitário Contrato';
    if (!isAta) {
        if (data.haveraReajuste === 'sim' && data.porcentagemReajuste) {
            colValorReferencia = `Valor Unitário com\nReajuste ${data.porcentagemReajuste}%`;
        } else {
            colValorReferencia = `Valor Unitário Contrato\n(s/ reajuste)`;
        }
    }

    const isTaxaItem = (g: OrcamentoItemGroup) => g.tipoValor === 'percentual' || g.descricao.toLowerCase().includes('taxa');

    const qcb: any[] = [];
    data.itemGroups.forEach(g => {
        const valMercado = Number(g.estimativaUnitaria) || 0;
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100);
        const adotado = vUnitReajustado;

        let descInfo = g.descricao;
        // Blindagem do as any
        if (isAta && (g as any).numeroAtaAditivo) descInfo += `\n(Ata: ${(g as any).numeroAtaAditivo})`;

        const renderBaseVal = (v: number) => g.tipoValor === 'percentual' 
            ? `${v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%` 
            : formatValue(v, 'moeda');

        const renderMercadoVal = (v: number) => isTaxaItem(g)
            ? `${v.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`
            : formatValue(v, 'moeda');

        qcb.push([
            { content: g.itemTR, styles: { halign: 'center' } },
            descInfo,
            { content: valMercado !== 0 ? renderMercadoVal(valMercado) : '-', styles: { halign: 'center' } },
            { content: renderBaseVal(vUnitReajustado), styles: { halign: 'center' } },
            { content: renderBaseVal(adotado), styles: { halign: 'center', fontStyle: 'bold' } }
        ]);
    });

    autoTable(doc, {
        startY: y,
        head: [['Item', 'Descrição', 'Valor de Mercado', colValorReferencia, 'Preço Adotado']],
        body: qcb,
        theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' },
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { halign: 'left' }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    
    const tituloAlteracao = isAta ? 'PREÇO ESTIMADO DA ALTERAÇÃO DA ATA' : 'PREÇO ESTIMADO DA ALTERAÇÃO CONTRATUAL';
    doc.text(tituloAlteracao, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let somaItensCentavos = 0;
    
    let temTaxaGlobal = false; 
    let taxaReferenciaGlobal = 0; 
    
    const aditB: any[] = [];
    
    const colAditivoValorUnit = isAta
        ? 'Valor Unit. Ata'
        : (data.haveraReajuste === 'sim' && data.porcentagemReajuste
            ? 'Valor Unit. (c/ reajuste)'
            : 'Valor Unit. (s/ reajuste)');

    data.itemGroups.forEach(g => {
        const gAny = g as any; // Blindagem geral para o item

        const itemTaxa = isTaxaItem(g);
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100);
        
        if (itemTaxa) {
            temTaxaGlobal = true;
            taxaReferenciaGlobal = vUnitReajustado;
        }

        const pctAditivo = Number(gAny.aditivoPercentual) || 0;
        const qtdAditivo = Number(gAny.aditivoQuantidade) || 0;

        const vAditivo = Math.round((Number(gAny.aditivoValorTotal || 0)) * 100) / 100; 
        somaItensCentavos += Math.round(vAditivo * 100);

        let descInfo = g.descricao;
        if (isAta && gAny.numeroAtaAditivo) descInfo += `\n(Ata: ${gAny.numeroAtaAditivo})`;

        const valUnitRender = g.tipoValor === 'percentual' 
            ? `${vUnitReajustado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`
            : formatValue(vUnitReajustado, 'moeda');

        const valAditivoRender = itemTaxa
            ? `${pctAditivo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`
            : formatValue(vAditivo, 'moeda');

        const novoVGlobalRender = itemTaxa 
            ? `${vUnitReajustado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`
            : formatValue(vAditivo + (qtdAditivo * vUnitReajustado), 'moeda');

        aditB.push([
            { content: g.itemTR, styles: { halign: 'center' } },
            descInfo,
            { content: `${pctAditivo.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 4})}%`, styles: { halign: 'center' } },
            { content: valUnitRender, styles: { halign: 'center' } },
            { content: qtdAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 4}), styles: { halign: 'center' } },
            { content: valAditivoRender, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: novoVGlobalRender, styles: { halign: 'right', fontStyle: 'bold' } }
        ]);
    });

    const somaItens = somaItensCentavos / 100;

    const renderTotalFinal = (valorMoeda: number) => {
        if (temTaxaGlobal) {
            return `${taxaReferenciaGlobal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 4})}%`;
        }
        return formatValue(valorMoeda, 'moeda'); 
    };

    if (data.aditivoTempo === 'sim') {
        const isMensal = data.aditivoTempoUnidade === 'meses';
        const labelPeriodoBase = isMensal ? 'VALOR MENSAL' : 'VALOR ANUAL';
        
        aditB.push([
            { content: labelPeriodoBase, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: renderTotalFinal(somaItens), styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } } 
        ]);
        
        const qtdTempo = Number(data.aditivoTempoQuantidade) || 1;
        
        aditB.push([
            { content: 'PERÍODO', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: `${qtdTempo} ${data.aditivoTempoUnidade || 'meses'}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }
        ]);
        
        const totalGeralMoeda = Number((somaItens * qtdTempo).toFixed(2));
        
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: renderTotalFinal(totalGeralMoeda), styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } } 
        ]);
    } else {
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: renderTotalFinal(somaItens), styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } }
        ]);
    }
    
    autoTable(doc, {
        startY: y, 
        head: [['Item', 'Descrição', 'Aditivo (%)', colAditivoValorUnit, 'Qtd Aditivo', 'Valor Aditivo', 'Novo V. Global']], 
        body: aditB, 
        theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, 
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { halign: 'left' } }, 
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // MOTOR HÍBRIDO DE ASSINATURAS CENTRALIZADAS
    const drawSignatureLocal = (nomeCompleto: string, nomeGuerra: string, cargo: string, funcao: string, xPos: number, yPos: number) => {
        if (!nomeCompleto) return;
        
        doc.setLineWidth(0.1);
        doc.setDrawColor(120, 120, 120);
        doc.line(xPos - 40, yPos, xPos + 40, yPos);
        
        const fullName = (nomeCompleto || '').trim();
        const guerra = (nomeGuerra || '').trim();
        const cargoTexto = (cargo || '').trim();
        
        doc.setFontSize(10);
        const idx = guerra ? fullName.toLowerCase().indexOf(guerra.toLowerCase()) : -1;
        
        let before = '', boldGuerra = '', after = '';
        if (idx >= 0) {
            before = fullName.slice(0, idx);
            boldGuerra = fullName.slice(idx, idx + guerra.length);
            after = fullName.slice(idx + guerra.length);
        } else {
            before = fullName;
        }

        const parts: { text: string; bold: boolean }[] = [];
        if (before) parts.push({ text: before, bold: false });
        if (boldGuerra) parts.push({ text: boldGuerra, bold: true });
        if (after) parts.push({ text: after, bold: false });
        if (cargoTexto) parts.push({ text: ` - ${cargoTexto}`, bold: true });

        const widths = parts.map(p => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            return doc.getTextWidth(p.text);
        });

        const totalW = widths.reduce((acc, w) => acc + w, 0);
        let currentX = xPos - (totalW / 2);

        parts.forEach((p, i) => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            doc.text(p.text, currentX, yPos + 5);
            currentX += widths[i];
        });

        if (funcao) {
            doc.setFont('helvetica', 'normal');
            doc.text(funcao, xPos, yPos + 10, { align: 'center' });
        }
    };

    addPage(50);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    
    const sigX = PAGE_WIDTH / 2;
    
    y += 30;
    
    // Blindagem também na chamada da assinatura
    const dataAny = data as any;
    drawSignatureLocal(data.assinante1Nome, dataAny.assinante1NomeGuerra || '', data.assinante1Cargo, data.assinante1Funcao, sigX, y);
    
    if (data.assinante2Nome) {
        y += 15;
        addPage(40);
        y += 25;
        drawSignatureLocal(data.assinante2Nome, dataAny.assinante2NomeGuerra || '', data.assinante2Cargo, data.assinante2Funcao, sigX, y);
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