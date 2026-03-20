import jsPDF from 'jspdf';
import { DfdData } from '../../types';
import { 
    drawInstitutionalHeader, // <-- Importação do cabeçalho novo
    drawInstitutionalFooter, // <-- Importação do rodapé novo
    checkPageBreak, 
    drawFormattedSignature, 
    formatDate, 
    setDefaultFont,
    drawCheckbox
} from './pdfUtils';
import { PAGE_WIDTH, TEXT_WIDTH, MARGIN_LEFT } from './pdfConstants';

/**
 * Retorna o artigo correto (À/Ao) baseado no nome da unidade.
 */
const getArticleForUnit = (unit: string): string => {
    if (!unit) return 'À';
    const lower = unit.trim().toLowerCase();
    const feminineKeywords = ['diretoria', 'seção', 'divisão', 'coordenação', 'companhia', 'comissão'];
    const masculineKeywords = ['centro', 'comando', 'almoxarifado', 'setor', 'grupamento', 'departamento', 'estado-maior'];

    // Verifica por palavras-chave
    if (feminineKeywords.some(k => lower.startsWith(k))) return 'À';
    if (masculineKeywords.some(k => lower.startsWith(k))) return 'Ao';

    // Heurística baseada na última letra da primeira palavra
    const firstWord = lower.split(' ')[0];
    if (firstWord.endsWith('a')) return 'À';
    
    return 'Ao';
};

export const generateDfdPdf = (doc: jsPDF, data: DfdData) => {
    // 1. Cabeçalho Institucional Padronizado
    // Nota: Como o formulário do DFD ainda não tem o campo "setor", estou passando uma string vazia ''.
    // O pdfUtils vai automaticamente usar a palavra "SETOR" no lugar.
    let yPos = drawInstitutionalHeader(doc, '', 'DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA');
    
    setDefaultFont(doc);
    
    // 2. Memorando
    doc.setFont('helvetica', 'normal');
    doc.text(`Memorando nº ${data.numeroMemo || 'xxx'}/${data.ano || '2024'}`, MARGIN_LEFT, yPos);
    yPos += 15;
    
    // 3. Destinatário com Concordância
    doc.setFont('helvetica', 'bold');
    const unitName = data.unidade || '... (unidade de compras do órgão)';
    const article = getArticleForUnit(unitName);
    doc.text(`${article} ${unitName},`, MARGIN_LEFT, yPos);
    yPos += 12;

    // 4. Parágrafos com Redação Padrão do Modelo
    doc.setFont('helvetica', 'normal');
    
    // Parágrafo 1: Problema
    const p1 = `Solicito que seja providenciada a solução para ${data.problema || '... (expor o problema a ser solucionado)'}.`;
    let lines = doc.splitTextToSize(p1, TEXT_WIDTH);
    yPos = checkPageBreak(doc, yPos, lines.length * 7);
    doc.text(lines, MARGIN_LEFT, yPos, { align: 'justify', maxWidth: TEXT_WIDTH });
    yPos += (lines.length * 7);

    // Parágrafo 2: Quantitativo
    const p2 = `Estimo que o quantitativo necessário é de ${data.quantitativo || '... (indicar a quantidade x periodicidade)'}.`;
    lines = doc.splitTextToSize(p2, TEXT_WIDTH);
    yPos = checkPageBreak(doc, yPos, lines.length * 7);
    doc.text(lines, MARGIN_LEFT, yPos, { align: 'justify', maxWidth: TEXT_WIDTH });
    yPos += (lines.length * 7);

    // Parágrafo 3: Prazo e Justificativa
    const formattedPrazo = data.prazo ? new Date(data.prazo + 'T00:00:00').toLocaleDateString('pt-BR') : '...';
    const p3 = `Informo que a aquisição deve ser feita até ${formattedPrazo} (indicar prazo para o término do processo de compra), considerando que ${data.justificativaPrazo || '... (justificar o prazo indicado)'}.`;
    lines = doc.splitTextToSize(p3, TEXT_WIDTH);
    yPos = checkPageBreak(doc, yPos, lines.length * 7);
    doc.text(lines, MARGIN_LEFT, yPos, { align: 'justify', maxWidth: TEXT_WIDTH });
    yPos += (lines.length * 10);

    // 5. Seção PCA com Checkboxes (Nativos, sem tabela)
    doc.text('Por fim, ressalto que:', MARGIN_LEFT, yPos);
    yPos += 8;

    yPos = drawCheckbox(doc, MARGIN_LEFT + 2, yPos, 'a contratação pretendida está prevista no Plano de Contratações Anual deste exercício.', data.statusPCA === 'sim');
    yPos += 2;
    yPos = drawCheckbox(doc, MARGIN_LEFT + 2, yPos, 'a contratação pretendida não está prevista no Plano de Contratações Anual deste exercício.', data.statusPCA === 'nao');
    yPos += 2;
    yPos = drawCheckbox(doc, MARGIN_LEFT + 2, yPos, 'ainda não há Plano de Contratações Anual aprovado para este exercício.', data.statusPCA === 'inexistente');

    // 6. Data e Local Centralizado
    yPos += 20;
    yPos = checkPageBreak(doc, yPos, 10);
    const dateLine = `${data.cidade || 'Cidade'} (PA), ${formatDate(data.data)}.`;
    doc.text(dateLine, PAGE_WIDTH / 2, yPos, { align: 'center' });
    
    // 7. Bloco de Assinatura
    yPos += 20;
    yPos = checkPageBreak(doc, yPos, 30);
    drawFormattedSignature(doc, data.nome, data.nomeGuerra, data.cargo, data.funcao || 'matrícula', PAGE_WIDTH / 2, yPos);

    // 8. CARIMBO DE RODAPÉ (NOVO)
    // Isso vai passar por todas as páginas geradas e colocar o rodapé preto padronizado a 2cm da borda.
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawInstitutionalFooter(doc, '', i, totalPages);
    }
};