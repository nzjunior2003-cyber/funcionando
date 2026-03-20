import jsPDF from 'jspdf';
import { PAGE_HEIGHT, PAGE_WIDTH, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, TEXT_WIDTH } from './pdfConstants';
import { logoCBMPABase64 } from '../../assets/logoBase64';

// --- Constantes de Cores e Estilo ---
export const COLOR_HEADER_BG = '#2B4C7E';
export const COLOR_HEADER_TXT = '#FFFFFF';
export const TABLE_HEADER_YELLOW = '#FCE69D';
export const ITEM_GRAY_BG = '#F0F0F0';

// --- Funções de Formatação ---

export const setDefaultFont = (doc: jsPDF) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
};

export const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    let num = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) : value;
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatValue = (value: number | string | undefined, tipoValor: 'moeda' | 'percentual' = 'moeda') => {
    if (value === undefined || value === null || value === '') return tipoValor === 'percentual' ? '0,00%' : 'R$ 0,00';
    let num = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) : value;
    if (isNaN(num)) return tipoValor === 'percentual' ? '0,00%' : 'R$ 0,00';
    
    if (tipoValor === 'percentual') {
        return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '...';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            return `${parts[2]} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
        }
        const date = new Date(dateString + 'T00:00:00');
        if (isNaN(date.getTime())) return '...';
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        return '...';
    }
};

// --- Controle de Quebra de Página ---

export const checkPageBreak = (doc: jsPDF, y: number, neededHeight: number = 0): number => {
    if (y + neededHeight > (PAGE_HEIGHT - MARGIN_BOTTOM)) {
        doc.addPage();
        return MARGIN_TOP;
    }
    return y;
};

// --- Elementos Visuais Padronizados ---

export const drawCheckbox = (doc: jsPDF, x: number, y: number, label: string, checked: boolean): number => {
    const size = 4;
    doc.setLineWidth(0.2);
    doc.rect(x, y - size + 0.5, size, size); // Desenha o quadrado
    if (checked) {
        doc.line(x, y - size + 0.5, x + size, y + 0.5); // X parte 1
        doc.line(x + size, y - size + 0.5, x, y + 0.5); // X parte 2
    }
    
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(label, TEXT_WIDTH - 10);
    doc.text(lines, x + size + 2, y);
    
    return y + (lines.length * 6);
};

export const drawInstitutionalHeader = (doc: jsPDF, setor: string, title: string, subtitle?: string) => {
    const colorRedFooter: [number, number, number] = [192, 57, 43];
    
    // --- NOVO: INSERÇÃO DOS LOGOTIPOS (CBMPA E DEFESA CIVIL) ---
    try {
        // Posição Y = 14 para centralizar com as linhas de texto.
        // Largura = 38 e Altura = 16 (Proporção correta para os dois brasões).
        if (logoCBMPABase64) {
             // Diminuí a largura para 30, a altura para 12 e desci o Y para 16.5 para centralizar na altura do texto
             doc.addImage(logoCBMPABase64, 'PNG', MARGIN_LEFT, 16.5, 30, 12);
        }
    } catch (error) {
        console.error("Erro ao carregar o logotipo no drawInstitutionalHeader:", error);
    }
    // ------------------------------------------------------

    // Quadro FL e Visto (Margem Direita)
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(PAGE_WIDTH - MARGIN_RIGHT - 30, 15, 30, 15);
    doc.line(PAGE_WIDTH - MARGIN_RIGHT - 30, 22.5, PAGE_WIDTH - MARGIN_RIGHT, 22.5);
    doc.setFontSize(7);
    doc.text("FL. Nº _______", PAGE_WIDTH - MARGIN_RIGHT - 28, 20);
    doc.text("Visto", PAGE_WIDTH - MARGIN_RIGHT - 18, 27, { align: 'center' });

   // Títulos Centralizados
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("CORPO DE BOMBEIROS MILITAR DO PARÁ E", PAGE_WIDTH / 2, 20, { align: 'center' });
    doc.text("COORDENADORIA ESTADUAL DE PROTEÇÃO E DEFESA CIVIL", PAGE_WIDTH / 2, 25, { align: 'center' });
       // Removi a linha 'doc.setTextColor(colorRedFooter...)' que deixava vermelho.
    // Como a cor padrão já é preta, basta imprimir o texto direto:
    doc.text(setor?.toUpperCase() || "SETOR", PAGE_WIDTH / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, 45, { align: 'center' });;

    doc.setFontSize(10);
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, 45, { align: 'center' });
    doc.setTextColor(0);

    doc.setFontSize(10);
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, 45, { align: 'center' });
    if (subtitle) {
        doc.setFontSize(9);
        doc.text(subtitle, PAGE_WIDTH / 2, 50, { align: 'center' });
        return 55;
    }
    return 55;
};

export const drawInstitutionalFooter = (doc: jsPDF, setor: string, pageNum: number, totalPages: number) => {
        const footY = PAGE_HEIGHT - 24; 
    
    doc.setFontSize(7);
    doc.setTextColor(0);
    
    doc.setFont('helvetica', 'bold');
        const nomeSetor = setor ? setor.toUpperCase() : 'SETOR';
    const line1 = `${nomeSetor} – CORPO DE BOMBEIROS MILITAR DO PARÁ`;
    doc.text(line1, PAGE_WIDTH / 2, footY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    const line2 = `Quartel do Comando-Geral – Av. Júlio César, nº 3000, Bairro: Marambaia, Belém-Pará, CEP 66.615-055.`;
    doc.text(line2, PAGE_WIDTH / 2, footY + 4, { align: 'center' });
      
    // Número da página alinhado à direita
    doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, footY + 4, { align: 'right' });
};

export const drawDocumentHeader = (doc: jsPDF, title: string, subTitle?: string, metaInfo?: string) => {
    let y = MARGIN_TOP;
    
    // --- NOVO: INSERÇÃO DOS LOGOTIPOS (CBMPA E DEFESA CIVIL) ---
    try {
        if (logoCBMPABase64) {
             doc.addImage(logoCBMPABase64, 'PNG', MARGIN_LEFT, y - 2, 30, 12);
        }
    } catch (error) {
        console.error("Erro ao carregar o logotipo no drawDocumentHeader:", error);
    }
    // ------------------------------------------------------

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
    
    if (subTitle) {
        y += 8;
        doc.setFontSize(11);
        doc.text(subTitle, PAGE_WIDTH / 2, y, { align: 'center' });
    }

    if (metaInfo) {
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text(metaInfo, PAGE_WIDTH / 2, y, { align: 'center' });
    }

    return Math.max(y + 20, 45); // Garante espaço suficiente abaixo da imagem
};

export const drawSignature = (doc: jsPDF, name: string, cargo: string, x: number, y: number) => {
    y = checkPageBreak(doc, y, 30);
    doc.setFont('helvetica', 'normal');
    // doc.text('(Assinatura)', x, y, { align: 'center' }); // Removed as per request
    
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text((name || 'NOME DO SERVIDOR').toUpperCase(), x, y, { align: 'center' });
    
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(cargo || 'Cargo e matrícula', x, y, { align: 'center' });
    
    return y;
};

export const drawFormattedSignature = (doc: jsPDF, n: string, ng: string, c: string, f: string, sx: number, y: number) => {
    doc.setDrawColor(0); 
    doc.setLineWidth(0.5); 
    doc.line(sx - 40, y, sx + 40, y);
    
    let cy = y + 5; 
    doc.setFontSize(10);
    
    const nameStr = n || '';
    const cargoStr = c ? ` - ${c}` : '';
    
    let pre = nameStr;
    let match = '';
    let post = '';
    
    if (ng && nameStr.toLowerCase().includes(ng.toLowerCase())) {
        const idx = nameStr.toLowerCase().indexOf(ng.toLowerCase());
        pre = nameStr.substring(0, idx);
        match = nameStr.substring(idx, idx + ng.length);
        post = nameStr.substring(idx + ng.length);
    }
    
    doc.setFont('helvetica', 'normal');
    const wPre = pre ? doc.getTextWidth(pre) : 0;
    const wPost = post ? doc.getTextWidth(post) : 0;
    const wCargo = cargoStr ? doc.getTextWidth(cargoStr) : 0;
    
    doc.setFont('helvetica', 'bold');
    const wMatch = match ? doc.getTextWidth(match) : 0;
    
    const totalWidth = wPre + wMatch + wPost + wCargo;
    let cx = sx - (totalWidth / 2);
    
    if (pre) {
        doc.setFont('helvetica', 'normal');
        doc.text(pre, cx, cy);
        cx += wPre;
    }
    if (match) {
        doc.setFont('helvetica', 'bold');
        doc.text(match, cx, cy);
        cx += wMatch;
    }
    if (post) {
        doc.setFont('helvetica', 'normal');
        doc.text(post, cx, cy);
        cx += wPost;
    }
    if (cargoStr) {
        doc.setFont('helvetica', 'normal');
        doc.text(cargoStr, cx, cy);
    }
    
    if (f) {
        cy += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(f, sx, cy, { align: 'center' });
    }
};

export const printField = (doc: jsPDF, label: string, value: string | undefined, y: number): number => {
    const safeValue = value || "..."; 
    doc.setFont('helvetica', 'normal');
    
    const text = `${label} ${safeValue}`;
    const lines = doc.splitTextToSize(text, TEXT_WIDTH);
    
    y = checkPageBreak(doc, y, lines.length * 6);
    doc.text(lines, MARGIN_LEFT, y);
    
    return y + (lines.length * 6);
};

export const printSection = (doc: jsPDF, title: string, content: string | undefined, y: number): number => {
    const safeContent = content || ""; 
    y = checkPageBreak(doc, y, 15);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), MARGIN_LEFT, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    
    if (safeContent) {
        const paragraphs = safeContent.split(/\n\n+/);
        paragraphs.forEach(p => {
            const lines = doc.splitTextToSize("   " + p, TEXT_WIDTH); 
            y = checkPageBreak(doc, y, lines.length * 6);
            doc.text(lines, MARGIN_LEFT, y, { align: 'justify' });
            y += (lines.length * 6);
        });
    }
    return y + 4;
};
