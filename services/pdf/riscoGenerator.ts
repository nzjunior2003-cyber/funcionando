
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RiscoData } from '../../types';
import { 
    drawDocumentHeader, 
    drawFormattedSignature, 
    formatDate, 
    COLOR_HEADER_BG, 
    ITEM_GRAY_BG,
    checkPageBreak
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } from './pdfConstants';

export const generateRiscoPdf = (doc: jsPDF, data: RiscoData) => {
    let finalY = drawDocumentHeader(doc, 'ANÁLISE DE RISCO', `PAE Nº ${data.pae || '...'}`);

    if (data.riscos && data.riscos.length > 0) {
        data.riscos.forEach((risco, index) => {
            autoTable(doc, {
                theme: 'grid',
                startY: finalY,
                margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
                styles: { fontSize: 10, cellPadding: 3 },
                body: [
                    [{ content: `RISCO ${index + 1}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: COLOR_HEADER_BG, textColor: 255, halign: 'center' } }],
                    [{ content: 'Descrição:', styles: { fontStyle: 'bold', cellWidth: 40 } }, risco.descricao || ''],
                    [{ content: 'Probabilidade:', styles: { fontStyle: 'bold' } }, (risco.probabilidade || '').toUpperCase()],
                    [{ content: 'Impacto:', styles: { fontStyle: 'bold' } }, (risco.impacto || '').toUpperCase()],
                    [{ content: 'Dano Potencial:', styles: { fontStyle: 'bold' } }, risco.dano || ''],
                    [{ content: 'AÇÃO PREVENTIVA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: ITEM_GRAY_BG, halign: 'center' } }],
                    [{ content: 'Ação:', styles: { fontStyle: 'bold' } }, risco.prevDesc || ''],
                    [{ content: 'Responsável:', styles: { fontStyle: 'bold' } }, risco.prevResp || ''],
                    [{ content: 'AÇÃO DE CONTINGÊNCIA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: ITEM_GRAY_BG, halign: 'center' } }],
                    [{ content: 'Ação:', styles: { fontStyle: 'bold' } }, risco.contDesc || ''],
                    [{ content: 'Responsável:', styles: { fontStyle: 'bold' } }, risco.contResp || ''],
                ]
            });
            // @ts-ignore
            finalY = doc.lastAutoTable.finalY + 10;
            
            if (finalY > PAGE_HEIGHT - 60 && index < data.riscos.length - 1) {
                doc.addPage();
                finalY = MARGIN_TOP;
            }
        });
    } else {
         doc.text("(Nenhum risco adicionado)", PAGE_WIDTH / 2, finalY, { align: 'center' });
         finalY += 20;
    }

    doc.text(`${data.cidade || 'Belém'}, ${formatDate(data.data)}.`, PAGE_WIDTH / 2, finalY + 10, { align: 'center' });
    finalY = checkPageBreak(doc, finalY, 40);
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao, PAGE_WIDTH / 2, finalY + 30);
};
