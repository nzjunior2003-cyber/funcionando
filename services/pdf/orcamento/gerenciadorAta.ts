import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrcamentoData } from '../../../types';
import { formatDate, setDefaultFont, drawFormattedSignature, formatValue, drawInstitutionalHeader, drawInstitutionalFooter, createJustifiedCellHooks } from '../pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from '../pdfConstants';

const BLUE: [number, number, number] = [31, 78, 121];
const YELLOW: [number, number, number] = [252, 230, 157];
const GRAY: [number, number, number] = [240, 240, 240];
const LBLUE: [number, number, number] = [207, 226, 243];
const ZEBRA_BLUE: [number, number, number] = [244, 249, 255];
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const SAFE_BOTTOM_MARGIN = 45; // Margem de segurança para o rodapé

// Orçamento Estimado do Gerenciador/Partícipe da Ata de Registro de Preços:
// os preços já estão registrados na ata, então não há pesquisa de preço. O número de cada item
// é o que foi digitado no formulário (o mesmo da ata) e cada item traz a quantidade registrada
// na ata e a quantidade solicitada.
export const generateOrcamentoGerenciadorAtaPdf = (doc: jsPDF, data: OrcamentoData) => {
    let y = MARGIN_TOP;
    setDefaultFont(doc);

    const addPage = (h: number) => { if (y + h > PAGE_HEIGHT - SAFE_BOTTOM_MARGIN) { doc.addPage(); y = MARGIN_TOP; } };

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

    const { willDrawCell: justifyWillDrawCell, didDrawCell: justifyDrawCell } = createJustifiedCellHooks(doc);

    // Itens na ordem do número digitado (o da ata), não na ordem em que foram cadastrados.
    const itens = [...(data.itemGroups || [])].sort((a, b) =>
        String(a.itemTR ?? '').localeCompare(String(b.itemTR ?? ''), undefined, { numeric: true }));

    y = drawInstitutionalHeader(doc, data.setor || '', 'ORÇAMENTO ESTIMADO', `PAE n° ${data.pae || 'NNNN'}`);

    // Dados da ata (própria ou partícipe)
    const numAta = data.numeroAta || 'NNN';
    const anoAta = data.anoAta || 'AAAA';
    const textoAta = data.participacaoAta === 'participe'
        ? `ARP nº ${numAta}/${anoAta} — Órgão gerenciador: ${data.orgaoAta || 'ÓRGÃO'}/${data.estadoAta || 'UF'} — participação como partícipe`
        : `ARP nº ${numAta}/${anoAta} — ata própria (órgão gerenciador: CBMPA)`;
    const fornecedor = (data.fornecedorAta || '').trim();
    const linhasAta: any[] = [[{ content: textoAta, styles: { halign: 'center', fontStyle: 'bold', fillColor: LBLUE } }]];
    if (fornecedor) linhasAta.push([{ content: `Fornecedor registrado na ata: ${fornecedor}`, styles: { halign: 'center', fontStyle: 'bold', fillColor: LBLUE } }]);
    autoTable(doc, {
        startY: y,
        body: linhasAta,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2.5, lineColor: 0, lineWidth: 0.1 },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Sec 1
    drawHeader('1 - DESCRIÇÃO DA CONTRATAÇÃO', '(art. 2º, I, do Decreto Estadual nº 2.734/2022)');
    const qtdFmt = (v: any) => (v === undefined || v === null || v === '' ? '-' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 }));
    autoTable(doc, {
        startY: y,
        theme: 'grid',
        head: [['Item', 'Descrição', 'Código\nSIMAS', 'Und', 'Qtd\nRegistrada', 'Qtd\nSolicitada']],
        body: itens.map(g => [
            { content: g.itemTR, styles: { fillColor: GRAY, halign: 'center', valign: 'middle' } },
            { content: g.descricao, styles: { halign: 'justify', valign: 'middle' } },
            { content: g.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } },
            { content: g.unidade || '-', styles: { halign: 'center', valign: 'middle' } },
            { content: qtdFmt((g as any).quantidadeRegistrada), styles: { halign: 'center', valign: 'middle' } },
            { content: qtdFmt(g.quantidadeTotal), styles: { halign: 'center', valign: 'middle' } }
        ]),
        headStyles: { fillColor: YELLOW, textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        columnStyles: { 0: { cellWidth: 14 }, 2: { cellWidth: 24 }, 3: { cellWidth: 14 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: justifyWillDrawCell,
        didDrawCell: justifyDrawCell
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Quadro de preços (valor registrado na ata x quantidade solicitada)
    addPage(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('PREÇO ESTIMADO (PREÇOS REGISTRADOS NA ATA)', PAGE_WIDTH / 2, y, { align: 'center' }); y += 6;

    let totalCentavos = 0;
    const fb: any[] = itens.map(g => {
        const est = Math.round((Number(g.estimativaUnitaria) || 0) * 100) / 100;
        const qtdSolicitada = Number(g.quantidadeTotal) || 0;
        const totalItem = Math.round(est * qtdSolicitada * 100) / 100;
        totalCentavos += Math.round(totalItem * 100);
        return [
            { content: g.itemTR, styles: { fillColor: GRAY } },
            { content: g.descricao, styles: { halign: 'justify' } },
            formatValue(est, g.tipoValor),
            qtdFmt((g as any).quantidadeRegistrada),
            qtdFmt(g.quantidadeTotal),
            formatValue(totalItem, g.tipoValor)
        ];
    });
    fb.push([
        { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: YELLOW } },
        { content: formatValue(totalCentavos / 100, 'moeda'), styles: { fontStyle: 'bold', fillColor: YELLOW } }
    ]);
    autoTable(doc, {
        startY: y,
        head: [['Item', 'Descrição', 'Valor Unit.\nRegistrado', 'Qtd\nRegistrada', 'Qtd\nSolicitada', 'Total']],
        body: fb,
        theme: 'grid',
        headStyles: { fillColor: YELLOW, textColor: 0, halign: 'center', valign: 'middle' },
        styles: { fontSize: 8, halign: 'center', valign: 'middle', lineColor: 0, lineWidth: 0.1 },
        alternateRowStyles: { fillColor: ZEBRA_BLUE },
        columnStyles: { 0: { cellWidth: 14 }, 2: { minCellWidth: 28 }, 3: { cellWidth: 22 }, 4: { cellWidth: 22 }, 5: { minCellWidth: 32 } },
        margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, bottom: SAFE_BOTTOM_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: justifyWillDrawCell,
        didDrawCell: justifyDrawCell
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Assinaturas: mantém o espaço "ideal" quando cabe; senão usa o compacto (mínimo de 24 mm acima
    // de cada linha, 34 mm entre assinantes) antes de pular de página — data e assinaturas sempre juntas.
    const hasSig2 = !!data.assinante2Nome;
    const idealGapAfterDate = 35, compactGapAfterDate = 24;
    const idealGapEntreAssinantes = 45, compactGapEntreAssinantes = 34;
    const sigLineHeight = 15;
    const idealHeight = idealGapAfterDate + sigLineHeight + (hasSig2 ? idealGapEntreAssinantes + sigLineHeight : 0);
    const compactHeight = compactGapAfterDate + sigLineHeight + (hasSig2 ? compactGapEntreAssinantes + sigLineHeight : 0);
    const remaining = (PAGE_HEIGHT - SAFE_BOTTOM_MARGIN) - y;

    let gapAfterDate = idealGapAfterDate;
    let gapEntreAssinantes = idealGapEntreAssinantes;
    if (remaining < idealHeight) {
        if (remaining >= compactHeight) {
            gapAfterDate = compactGapAfterDate;
            gapEntreAssinantes = compactGapEntreAssinantes;
        } else {
            doc.addPage();
            y = MARGIN_TOP;
        }
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
    y += gapAfterDate;

    const centerX = PAGE_WIDTH / 2;
    if (data.assinante1Nome) {
        drawFormattedSignature(doc, data.assinante1Nome, data.assinante1NomeGuerra, data.assinante1Cargo, data.assinante1Funcao, centerX, y, !!data.assinadoPae);
    }
    if (data.assinante2Nome) {
        y += gapEntreAssinantes;
        drawFormattedSignature(doc, data.assinante2Nome, data.assinante2NomeGuerra, data.assinante2Cargo, data.assinante2Funcao, centerX, y, !!data.assinadoPae);
    }

    // Rodapé institucional apenas na última página, com numeração em todas
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
