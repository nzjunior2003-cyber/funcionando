import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData } from '../../../types';
import { formatDate, setDefaultFont, drawFormattedSignature, formatValue, drawInstitutionalHeader, drawInstitutionalFooter } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const nomesFontesCurto: Record<string, string> = {
    simas: 'SIMAS', nfe: 'Nota Fiscal', pncp: 'PNCP', siteEspecializado: 'Mídia Especializada',
    contratacaoSimilar: 'Similar', direta: 'Pesquisa Direta', preco_ata_srp: 'Ata SRP'
};

export const generateOrcamentoAditivoPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);

    const isAta = data.subTipoAditivo === 'ata';

    const addPage = (h: number) => { if (y + h > PAGE_HEIGHT - MARGIN_BOTTOM) { doc.addPage(); y = MARGIN_TOP; } };

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
        if (isAta && g.numeroAtaAditivo) desc += `\n(Ata Origem: ${g.numeroAtaAditivo})`;

        return [
            { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } },
            desc, g.codigoSimas || '-', g.unidade, g.quantidadeTotal
        ];
    });
    autoTable(doc, {
        startY: y, theme: 'grid', head: [['Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd']], body: s1Body,
        headStyles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, halign: 'center', valign: 'middle' },
        columnStyles: { 0: { cellWidth: 15 }, 1: { halign: 'left' } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }
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
    autoTable(doc, { startY: y, body: [[data.justificativaAusenciaFonte?.trim() || 'Não se aplica.']], theme: 'grid', styles: { fontSize: 9, lineColor: 0, lineWidth: 0.1 }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('4 - JUSTIFICATIVAS DA PESQUISA DIRETA COM FORNECEDORES', '(art. 2º, VIII, e art. 4º, V e §2º, do Decreto Estadual nº 2.734/2022)');
    const isDir = data.fontesPesquisa.length === 1 && data.fontesPesquisa.includes('direta');
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
    autoTable(doc, { startY: y, body: s4b, theme: 'grid', styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 45 } }, margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT } });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('5 - METODOLOGIA DA ESTIMATIVA DE PREÇO', '(art. 2º, V, e art. 5º do Decreto Estadual nº 2.734/2022)');
    const met = data.metodologia || 'media';
    const bMenor = met === 'menor' ? '[ X ]' : '[   ]';
    const bMedia = met === 'media' ? '[ X ]' : '[   ]';
    const bMediana = met === 'mediana' ? '[ X ]' : '[   ]';

    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }, styles: { fontSize: 9, halign: 'center', lineColor: 0, lineWidth: 0.1 },
        body: [[
            { content: `${bMenor} Menor preço\n(mercado restrito)`, styles: { fontStyle: met === 'menor' ? 'bold' : 'normal' } },
            { content: `${bMedia} Média\n(preços semelhantes)`, styles: { fontStyle: met === 'media' ? 'bold' : 'normal' } },
            { content: `${bMediana} Mediana\n(preços com grande variação)`, styles: { fontStyle: met === 'mediana' ? 'bold' : 'normal' } }
        ]]
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    drawHeader('6 - RESULTADO DA PESQUISA', '(art. 2º, IV, VI e VII, do Decreto Estadual nº 2.734/2022)');
    
    const precosValidosTodos = data.itemGroups.map(g => (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false));
    const maxPrecos = Math.max(...precosValidosTodos.map(p => p.length), 1);

    const s6b: any[] = [];
    data.itemGroups.forEach(g => {
        const p = (data.precosEncontrados[g.id] || []).filter(x => data.precosIncluidos[x.id] !== false);
        const row: any[] = [{ content: g.itemTR, styles: { halign: 'center', valign: 'middle' } }];

        if (p.length === 0) {
            row.push({ content: 'Nenhum preço inserido.', colSpan: maxPrecos, styles: { halign: 'center', fontStyle: 'italic', valign: 'middle' } });
        } else {
            for (let i = 0; i < maxPrecos; i++) {
                if (p[i]) {
                    const sourceName = nomesFontesCurto[p[i].source] || p[i].source;
                    row.push({ content: `${formatValue(p[i].value, g.tipoValor)}\n(${sourceName})`, styles: { halign: 'center', valign: 'middle' } });
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
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
        columnStyles: { 0: { cellWidth: 15 } }
    });
    y = (doc as any).lastAutoTable.finalY;

    const desc = data.houveDescarte;
    const bDescSim = desc === 'sim' ? '[ X ]' : '[   ]';
    const bDescNao = desc === 'nao' ? '[ X ]' : '[   ]';

    autoTable(doc, {
        startY: y, theme: 'grid', margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }, styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
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

    const qcb: any[] = [];
    data.itemGroups.forEach(g => {
        const valMercado = Number(g.estimativaUnitaria) || 0;
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100);
        const adotado = vUnitReajustado;

        let descInfo = g.descricao;
        if (isAta && g.numeroAtaAditivo) descInfo += `\n(Ata: ${g.numeroAtaAditivo})`;

        qcb.push([
            { content: g.itemTR, styles: { halign: 'center' } },
            descInfo,
            { content: valMercado > 0 ? formatValue(valMercado, g.tipoValor) : '-', styles: { halign: 'center' } },
            { content: formatValue(vUnitReajustado, g.tipoValor), styles: { halign: 'center' } },
            { content: formatValue(adotado, g.tipoValor), styles: { halign: 'center', fontStyle: 'bold' } }
        ]);
    });

    autoTable(doc, {
        startY: y,
        head: [['Item', 'Descrição', 'Valor de Mercado', colValorReferencia, 'Preço Adotado']],
        body: qcb,
        theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' },
        styles: { fontSize: 8, valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { halign: 'left' }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 }, 4: { cellWidth: 25 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }
    });
    y = (doc as any).lastAutoTable.finalY + 12;

    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    
    const tituloAlteracao = isAta ? 'PREÇO ESTIMADO DA ALTERAÇÃO DA ATA' : 'PREÇO ESTIMADO DA ALTERAÇÃO CONTRATUAL';
    doc.text(tituloAlteracao, PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;
    
    let somaItens = 0;
    const aditB: any[] = [];
    
    const colAditivoValorUnit = isAta
        ? 'Valor Unit. Ata'
        : (data.haveraReajuste === 'sim' && data.porcentagemReajuste
            ? 'Valor Unit. (c/ reajuste)'
            : 'Valor Unit. (s/ reajuste)');

    data.itemGroups.forEach(g => {
        const pctReajuste = data.haveraReajuste === 'sim' ? (Number(data.porcentagemReajuste) || 0) : 0;
        const vUnitContrato = Number(g.valorUnitarioContrato) || 0;
        const vUnitReajustado = vUnitContrato * (1 + pctReajuste / 100);
        
        const pctAditivo = Number(g.aditivoPercentual) || 0;
        const qtdAditivo = Number(g.aditivoQuantidade) || 0;
        const vAditivo = Number(g.aditivoValorTotal) || 0;
        
        somaItens += vAditivo;

        let descInfo = g.descricao;
        if (isAta && g.numeroAtaAditivo) descInfo += `\n(Ata: ${g.numeroAtaAditivo})`;

        aditB.push([
            { content: g.itemTR, styles: { halign: 'center' } },
            descInfo,
            { content: `${pctAditivo.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}%`, styles: { halign: 'center' } },
            { content: formatValue(vUnitReajustado, g.tipoValor), styles: { halign: 'center' } },
            { content: qtdAditivo.toLocaleString('pt-BR', {maximumFractionDigits: 4}), styles: { halign: 'center' } },
            { content: formatValue(vAditivo, g.tipoValor), styles: { halign: 'right', fontStyle: 'bold' } }
        ]);
    });

    if (data.aditivoTempo === 'sim') {
        const isMensal = data.aditivoTempoUnidade === 'meses';
        const labelPeriodoBase = isMensal ? 'VALOR MENSAL' : 'VALOR ANUAL';
        
        aditB.push([
            { content: labelPeriodoBase, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: formatValue(somaItens, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }
        ]);
        
        const qtdTempo = Number(data.aditivoTempoQuantidade) || 1;
        
        aditB.push([
            { content: 'PERÍODO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
            { content: `${qtdTempo} ${data.aditivoTempoUnidade || 'meses'}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } }
        ]);
        
        const totalGeral = somaItens * qtdTempo;
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: formatValue(totalGeral, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } }
        ]);
    } else {
        aditB.push([
            { content: 'TOTAL DO ADITIVO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } },
            { content: formatValue(somaItens, 'moeda'), styles: { halign: 'right', fontStyle: 'bold', fillColor: BLUE, textColor: 255 } }
        ]);
    }
    
    autoTable(doc, {
        startY: y, 
        head: [['Item', 'Descrição', 'Aditivo (%)', colAditivoValorUnit, 'Qtd Aditivo', 'Valor Aditivo']], 
        body: aditB, 
        theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' }, 
        styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 12 }, 1: { halign: 'left' } }, 
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Assinaturas Verticalizadas e Centralizadas
    addPage(50);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' }); 
    
    const sigX = PAGE_WIDTH / 2;
    
    y += 30;
    drawFormattedSignature(doc, data.assinante1Nome, data.assinante1NomeGuerra, data.assinante1Cargo, data.assinante1Funcao, sigX, y);
    
    if (data.assinante2Nome) {
        y += 15;
        addPage(40);
        y += 25;
        drawFormattedSignature(doc, data.assinante2Nome, data.assinante2NomeGuerra, data.assinante2Cargo, data.assinante2Funcao, sigX, y);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    doc.setPage(totalPages);
    drawInstitutionalFooter(doc, data.setor || '', totalPages, totalPages);
};