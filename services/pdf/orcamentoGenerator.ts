import jsPDF from 'jspdf';
import { OrcamentoData } from '../../types';
import { generateOrcamentoLicitacaoPdf } from './orcamento/licitacao';

export const generateOrcamentoPdf = (doc: jsPDF, data: OrcamentoData) => {
    // Redireciona a missão obrigatoriamente para o nosso arquivo blindado
    generateOrcamentoLicitacaoPdf(doc, data);
};