
import jsPDF from 'jspdf';
import { DocumentType } from '../types';
import { setDefaultFont } from './pdf/pdfUtils';

// Importar os geradores individuais
import { generateDfdPdf } from './pdf/dfdGenerator';
import { generateEtpPdf } from './pdf/etpGenerator';
import { generateRiscoPdf } from './pdf/riscoGenerator';
import { generateOrcamentoPdf } from './pdf/orcamentoGenerator';
import { generateTrBensPdf } from './pdf/trBensGenerator';

export const generatePdf = (type: DocumentType, data: any): { success: boolean, error?: string } => {
  try {
    const doc = new jsPDF();
    setDefaultFont(doc);
    
    switch (type) {
      case DocumentType.DFD:
        generateDfdPdf(doc, data);
        break;
      case DocumentType.ETP:
        generateEtpPdf(doc, data);
        break;
      case DocumentType.RISCO:
        generateRiscoPdf(doc, data);
        break;
      case DocumentType.ORCAMENTO:
        generateOrcamentoPdf(doc, data);
        break;
      case DocumentType.TR_BENS:
        generateTrBensPdf(doc, data);
        break;
      default:
        return { success: false, error: 'Tipo de documento não suportado.' };
    }
    
    doc.save(`${type.toUpperCase()}_CBMPA_${Date.now()}.pdf`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    return { success: false, error: String(error) };
  }
};
