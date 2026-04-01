import jsPDF from 'jspdf';
import { OrcamentoData } from '../types';

// Importando os "trabalhadores" de cada tipo de orçamento
import { generateOrcamentoLicitacaoPdf } from './orcamento/licitacao';
import { generateOrcamentoAdesaoAtaPdf } from './orcamento/adesaoAta';
import { generateOrcamentoAditivoPdf } from './orcamento/aditivoContratual';
// (Se depois você quiser importar a dispensa e o credenciamento, é só adicionar aqui)

export const generateOrcamentoPdf = (doc: jsPDF, data: OrcamentoData) => {
    // O verdadeiro Guarda de Trânsito:
    switch (data.tipoOrcamento) {
        case 'adesao_ata':
            generateOrcamentoAdesaoAtaPdf(doc, data);
            break;
            
        case 'aditivo_contratual':
            generateOrcamentoAditivoPdf(doc, data);
            break;
            
        case 'licitacao':
        default:
            // Por padrão, joga para a licitação (onde estava o "fantasma")
            generateOrcamentoLicitacaoPdf(doc, data);
            break;
    }
};