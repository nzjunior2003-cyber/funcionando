import jsPDF from 'jspdf';
import { PAGE_HEIGHT, PAGE_WIDTH, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, TEXT_WIDTH } from './pdfConstants';
import { logoCBMPABase64, distintivoQCGBase64 } from '../../assets/logoBase64';

// --- Constantes de Cores e Estilo ---
export const COLOR_HEADER_BG = '#2B4C7E';
export const COLOR_HEADER_TXT = '#FFFFFF';
export const TABLE_HEADER_YELLOW = '#FCE69D';
export const ITEM_GRAY_BG = '#F0F0F0';

// --- Funções de Formatação ---

/**
 * Quebra um texto longo em pedaços que preenchem, cada um, uma página
 * inteira (ou quase) de uma coluna de tabela — medindo de verdade, com o
 * próprio jsPDF, quantas linhas o texto ocupa na largura/fonte informadas,
 * em vez de chutar um número fixo de caracteres (que erra pra mais ou pra
 * menos dependendo da largura da coluna e do tamanho da fonte de cada
 * tabela, podendo tanto estourar uma página quanto fragmentar sem
 * necessidade dentro de uma mesma página).
 *
 * Por quê isso existe: nas tabelas do ETP e do TR de Bens, cada linha usa
 * `rowPageBreak: 'avoid'` pra impedir que o jsPDF corte uma linha ao meio
 * entre duas páginas (isso causava duplicação de texto com os renderizadores
 * customizados de justificado/checkbox). O efeito colateral é que uma
 * resposta de texto MUITO longa vira um bloco "tudo ou nada": se não cabe
 * inteira no que sobrou da página atual, a linha inteira pula pra próxima
 * página, desperdiçando todo aquele espaço em branco. Quebrando o texto em
 * pedaços do tamanho de uma página ANTES de montar a linha da tabela, cada
 * pedaço vira sua própria linha — no pior caso, só o pedaço que não coube
 * pula, não o texto inteiro, e nenhum pedaço fica menor do que precisa.
 *
 * @param doc Instância do jsPDF (usada só pra medir o texto com a fonte atual).
 * @param text Texto completo a quebrar.
 * @param cellWidthMm Largura real (em mm) da coluna onde esse texto será desenhado, já descontado o padding.
 * @param fontSize Tamanho da fonte (em pt) usada nessa célula.
 * @param lineHeightFactor Mesmo fator usado pelos renderizadores customizados (padrão 1.15).
 */
export const splitLongText = (
    doc: jsPDF,
    text: string,
    cellWidthMm: number,
    fontSize: number,
    lineHeightFactor: number = 1.15
): string[] => {
    const trimmed = (text || '').trim();
    if (!trimmed) return [trimmed];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    const allLines: string[] = doc.splitTextToSize(trimmed, cellWidthMm);

    const fontSizeMm = (fontSize * 25.4) / 72;
    const lineHeight = fontSizeMm * lineHeightFactor;
    const usableHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
    // 85% da altura útil: a primeira ocorrência de uma linha longa quase
    // sempre começa mais abaixo do topo da página (depois de outras
    // perguntas já respondidas antes dela), então uma margem de segurança
    // evita estourar o fim da página mesmo nesse caso mais comum.
    const maxLinesPerChunk = Math.max(1, Math.floor((usableHeight * 0.85) / lineHeight));

    if (allLines.length <= maxLinesPerChunk) return [trimmed];

    const chunks: string[] = [];
    for (let i = 0; i < allLines.length; i += maxLinesPerChunk) {
        chunks.push(allLines.slice(i, i + maxLinesPerChunk).join('\n'));
    }
    return chunks;
};

/**
 * Processa o corpo inteiro de uma tabela (um array de linhas, no formato de
 * `body` do jspdf-autotable) e quebra, em linhas extras, qualquer célula de
 * texto justificado longa demais pra caber de uma vez — usada pelo ETP e
 * pelo TR de Bens, que montam a tabela inteira num array antes de uma única
 * chamada a `autoTable`.
 *
 * Diferente de só chamar `splitLongText` em cada célula isoladamente, esta
 * função SIMULA a posição vertical (currentY) percorrendo a tabela inteira,
 * linha por linha, replicando o jeito como o autoTable realmente desenha
 * (cada linha empurra currentY; quando uma linha não cabe mais no que
 * sobrou da página — o que `rowPageBreak: 'avoid'` já faz pra qualquer
 * linha — o currentY "reinicia" no topo de uma nova página). Isso é o que
 * permite saber, bem na hora de uma célula de texto longo específica,
 * quanto de espaço REALMENTE sobra na página ali (que pode ser bem menos
 * que uma página inteira) — sem isso, uma resposta de tamanho médio que não
 * seja grande o bastante pra precisar de várias páginas, mas que também não
 * caiba no restinho de espaço que sobrou, continuaria pulando inteira e
 * desperdiçando esse restinho (o mesmo bug que motivou essa função).
 *
 * @param doc Instância do jsPDF.
 * @param rows O array de linhas já montado (cada linha é um array de células).
 * @param opts.startY Posição Y onde a tabela começa a ser desenhada.
 * @param opts.fontSize Tamanho de fonte usado pelas células de texto.
 * @param opts.getCellWidthMm Dado uma célula, devolve a largura real (mm, já sem padding horizontal) que ela ocupa — varia conforme o layout de colunas de cada tabela.
 * @param opts.lineHeightFactor Mesmo fator usado pelos renderizadores customizados (padrão 1.15).
 * @param opts.cellPaddingV Padding vertical total (top+bottom) de cada célula (padrão 2.4mm).
 */
export const expandLongTextRows = (
    doc: jsPDF,
    rows: any[],
    opts: {
        startY: number;
        fontSize: number;
        getCellWidthMm: (cell: any) => number;
        lineHeightFactor?: number;
        cellPaddingV?: number;
    }
): any[] => {
    const { startY, fontSize, getCellWidthMm, lineHeightFactor = 1.15, cellPaddingV = 2.4 } = opts;
    const fontSizeMm = (fontSize * 25.4) / 72;
    const lineHeight = fontSizeMm * lineHeightFactor;
    const usableBottom = PAGE_HEIGHT - MARGIN_BOTTOM;
    const maxLinesFullPage = Math.max(1, Math.floor(((PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) * 0.85) / lineHeight));

    const estimateRowHeight = (row: any[]): number => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        let maxHeight = lineHeight + cellPaddingV;
        row.forEach((c: any) => {
            const txt = c && typeof c === 'object' ? c.content : c;
            if (typeof txt !== 'string' || !txt) return;
            const width = Math.max(getCellWidthMm(c), 10);
            const lines = doc.splitTextToSize(txt, width);
            const h = lines.length * lineHeight + cellPaddingV;
            if (h > maxHeight) maxHeight = h;
        });
        return maxHeight;
    };

    const expanded: any[] = [];
    let currentY = startY;
    // Cada linha processada antes da atual carrega um pouco de erro de
    // estimativa (nosso cálculo de altura é só uma aproximação do que o
    // autoTable realmente desenha) — e esse erro se acumula ao longo do
    // documento. Quanto mais linhas já passaram, maior a chance de
    // `currentY` estar bem desviado da posição real, então a margem de
    // segurança cresce com a quantidade de linhas já processadas (ver
    // `safetyMargin` mais abaixo), em vez de ser um valor fixo só.
    let rowsProcessed = 0;

    rows.forEach(row => {
        if (!Array.isArray(row)) { expanded.push(row); return; }
        rowsProcessed++;
        // Não mexe em linhas com rowSpan — quebrá-las aqui bagunçaria o
        // encaixe com a(s) linha(s) seguinte(s) que completam o rowSpan.
        if (row.some((c: any) => c && typeof c === 'object' && c.rowSpan)) {
            expanded.push(row);
            const h = estimateRowHeight(row);
            currentY = (currentY + h > usableBottom) ? MARGIN_TOP + h : currentY + h;
            return;
        }
        // Acha a célula de texto justificado (a resposta) desta linha, se houver.
        let longIdx = -1;
        for (let i = row.length - 1; i >= 0; i--) {
            const c = row[i];
            const txt = c && typeof c === 'object' ? c.content : c;
            if (c && typeof c === 'object' && c.styles?.halign === 'justify' && typeof txt === 'string' && txt.trim()) {
                longIdx = i;
                break;
            }
        }
        if (longIdx === -1) {
            const h = estimateRowHeight(row);
            currentY = (currentY + h > usableBottom) ? MARGIN_TOP + h : currentY + h;
            expanded.push(row);
            return;
        }

        const cell = row[longIdx];
        const estimatedWidth = Math.max(getCellWidthMm(cell), 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        const allLines: string[] = doc.splitTextToSize(String(cell.content).trim(), estimatedWidth);
        const rowHeight = allLines.length * lineHeight + cellPaddingV;
        const remaining = usableBottom - currentY;
        // Margem de segurança: nossa estimativa de altura/posição é uma
        // aproximação do que o autoTable realmente calcula por dentro, e o
        // desvio entre o que simulamos e o que o autoTable realmente
        // desenha vai se acumulando conforme o documento cresce (cada
        // linha anterior contribui um pouco de erro). Por isso a margem
        // tem uma parte fixa (~5 linhas) mais uma parte que CRESCE com a
        // quantidade de linhas já processadas (`rowsProcessed`) — quanto
        // mais seções vieram antes da célula de texto longo atual, maior
        // o desvio acumulado esperado, e maior a margem de segurança
        // precisa ser pra absorver esse desvio e evitar que
        // ele volte a causar o bug original (o texto inteiro pulando pra
        // próxima página com um espaço enorme em branco na anterior).
        const safetyMargin = 5 * lineHeight + rowsProcessed * 3;

        if (rowHeight <= remaining - safetyMargin) {
            // Cabe inteiro no que sobrou da página atual: não precisa
            // quebrar em pedaços. Mantém o conteúdo ORIGINAL sem
            // reconstruir via join — evita qualquer efeito colateral no
            // motor de justificado por causa de quebras de linha
            // artificiais que não existiam antes.
            expanded.push(row);
            currentY = currentY + rowHeight;
            return;
        }

        // Não coube no que sobrou da página atual: quebra em pedaços — o
        // primeiro do tamanho do que sobra agora (ou pula pra página nova
        // se não sobrar quase nada), os seguintes do tamanho de uma página.
        //
        // Importante: o corte é feito no TEXTO ORIGINAL (por posição de
        // caractere), nunca reconstruindo a partir das linhas já quebradas
        // por `allLines` — usar `allLines.join('\n')` carimbaria quebras de
        // linha na largura que NÓS estimamos (que pode não bater com a
        // largura real da coluna calculada pelo autoTable), fazendo o motor
        // de desenho (que respeita essas quebras como fixas, sem redistribuir
        // o texto) cortar linhas curtas demais no meio do parágrafo. Cortando
        // o texto original por caractere, cada pedaço preserva toda a
        // formatação (inclusive parágrafos) e continua sendo re-quebrado em
        // linhas pelo motor de desenho, na largura real, na hora de desenhar.
        const original = String(cell.content).trim();

        // Estima a posição (em caracteres) do texto original correspondente
        // ao fim da N-ésima linha, somando o tamanho das linhas já quebradas
        // (cada uma delas é uma substring do texto original).
        const charOffsetForLine = (n: number): number => {
            let total = 0;
            for (let i = 0; i < n && i < allLines.length; i++) total += allLines[i].length + 1; // +1 do espaço/quebra entre as linhas
            return total;
        };

        // Corta o texto original na posição estimada, ajustando pra trás até
        // o fim de um parágrafo (linha em branco), senão até o fim de uma
        // frase, senão até uma quebra de palavra — nunca no meio de uma
        // palavra.
        const findCut = (text: string, approxOffset: number): number => {
            if (approxOffset >= text.length) return text.length;
            let cut = text.lastIndexOf('\n\n', approxOffset);
            if (cut < approxOffset * 0.5) cut = text.lastIndexOf('. ', approxOffset);
            if (cut < approxOffset * 0.5) cut = text.lastIndexOf(' ', approxOffset);
            if (cut <= 0) cut = approxOffset;
            else if (text[cut] === ' ' || text[cut] === '.') cut += 1; // inclui o espaço/ponto no pedaço atual
            return cut;
        };

        let firstChunkLines = Math.floor((remaining - safetyMargin - cellPaddingV) / lineHeight);
        if (firstChunkLines < 2) firstChunkLines = 0; // não compensa um pedacinho de 1 linha só — pula tudo pra próxima página

        const pedacos: string[] = [];
        let charIdx = 0;
        let lineIdx = 0;
        if (firstChunkLines > 0) {
            const cut = findCut(original, charOffsetForLine(firstChunkLines));
            pedacos.push(original.slice(charIdx, cut).trim());
            charIdx = cut;
            lineIdx = firstChunkLines;
        }
        while (charIdx < original.length) {
            lineIdx += maxLinesFullPage;
            const cut = findCut(original, charOffsetForLine(lineIdx));
            const chunk = original.slice(charIdx, cut).trim();
            if (!chunk) break; // evita loop infinito se o corte não avançar
            pedacos.push(chunk);
            charIdx = cut;
        }
        if (pedacos.length === 0) pedacos.push(original);

        expanded.push(row.map((c: any, i: number) => i === longIdx ? { ...cell, content: pedacos[0] } : c));

        // Pedaços seguintes: mantém todas as colunas da linha original
        // (incluindo a da pergunta/rótulo), só que em branco — a coluna
        // continua presente e com a mesma largura por toda a extensão do
        // texto, sem repetir o rótulo.
        for (let i = 1; i < pedacos.length; i++) {
            expanded.push(row.map((c: any, idx2: number) => {
                if (idx2 === longIdx) return { ...cell, content: pedacos[i] };
                return (c && typeof c === 'object') ? { ...c, content: '' } : '';
            }));
        }

        // Atualiza a posição simulada: se o primeiro pedaço coube na página
        // atual, a próxima linha continua logo depois dele; senão, o
        // primeiro pedaço já É o 1º pedaço de uma página nova. Pedaço(s)
        // seguinte(s), se houver, sempre começam numa página nova (cheia).
        const heightOf = (texto: string) => {
            const linhas = doc.splitTextToSize(texto, estimatedWidth);
            return linhas.length * lineHeight + cellPaddingV;
        };
        if (pedacos.length === 1) {
            const h = heightOf(pedacos[0]);
            currentY = firstChunkLines > 0 ? currentY + h : MARGIN_TOP + h;
        } else {
            currentY = MARGIN_TOP + heightOf(pedacos[pedacos.length - 1]);
        }
    });

    return expanded;
};

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

// --- Sanitização de Texto Colado ---

/**
 * Remove artefatos comuns de texto colado de outras fontes (Word, sites, PDFs)
 * que quebram a quebra de linha do jsPDF: espaços não separáveis (NBSP),
 * caracteres de largura zero, hífen suave, e espaços/tabs duplicados.
 * Preserva quebras de parágrafo (\n).
 */
export const sanitizeText = (text: string | undefined | null): string => {
    if (!text) return '';
    return text
        .replace(/\r\n?/g, '\n')
        .replace(/[   ]/g, ' ')
        .replace(/[​‌‍﻿]/g, '')
        .replace(/­/g, '')
        .replace(/[ \t]+/g, ' ')
        .split('\n')
        .map(line => line.trim())
        .join('\n');
};

/**
 * Desenha texto justificado parágrafo a parágrafo, sem esticar a última linha
 * de cada parágrafo (o "esticamento" nativo do jsPDF deixa frases curtas com
 * espaçamento gigante entre palavras). Sanitiza o texto antes de desenhar.
 */
export const drawJustifiedText = (
    doc: jsPDF,
    text: string | undefined | null,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 7
): number => {
    const clean = sanitizeText(text);
    let cursorY = y;
    clean.split('\n').forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        cursorY = checkPageBreak(doc, cursorY, lines.length * lineHeight);
        lines.forEach((line: string, idx: number) => {
            const isLast = idx === lines.length - 1;
            if (isLast) {
                doc.text(line, x, cursorY);
            } else {
                // Nunca deixa a largura passada ao jsPDF ficar menor que a largura real
                // da linha — evita que ele quebre essa linha de novo por conta própria
                // (com uma altura de linha diferente da nossa) quando a linha está bem
                // no limite da largura da coluna.
                const safeMaxWidth = Math.max(maxWidth, doc.getTextWidth(line) + 0.1);
                doc.text([line, ""], x, cursorY, { align: 'justify', maxWidth: safeMaxWidth } as any);
            }
            cursorY += lineHeight;
        });
    });
    return cursorY;
};

/**
 * Hooks de jspdf-autotable (willDrawCell + didDrawCell) que fazem qualquer
 * célula marcada com `styles: { halign: 'justify' }` ser desenhada
 * parágrafo a parágrafo, sanitizada, e sem esticar a última linha de cada
 * parágrafo — mesmo motor usado no ETP, reaproveitável em qualquer gerador.
 *
 * IMPORTANTE: o hook que zera `cell.text` tem que ser willDrawCell, não
 * didParseCell. autoTable calcula a altura da linha a partir de
 * `cell.text.length` logo depois de didParseCell — se a gente zerar o
 * texto ali, a linha fica curta demais e o texto (desenhado depois, em
 * didDrawCell, com base no texto sanitizado de verdade) vaza para fora da
 * célula. willDrawCell roda depois que a altura já foi calculada com o
 * texto original, então zerar ali é seguro.
 *
 * Uso: espalhar os hooks retornados nas opções do autoTable(). Se o gerador
 * já tiver seus próprios willDrawCell/didDrawCell (ex: para desenhar
 * checkboxes customizados), chame os dois dentro de uma função combinada —
 * eles nunca disputam a mesma célula, pois este hook só age em células com
 * halign 'justify'.
 */
export const createJustifiedCellHooks = (doc: jsPDF) => {
    const willDrawCell = (hookData: any) => {
        if (hookData.section !== 'body') return;
        const cell = hookData.cell;
        if (cell.styles.halign === 'justify' && cell.raw) {
            const rawText = typeof cell.raw === 'object' && cell.raw !== null ? (cell.raw as any).content : cell.raw;
            if (typeof rawText === 'string') {
                (cell as any).customJustifyText = sanitizeText(rawText);
                cell.text = [];
            }
        }
    };

    const didDrawCell = (hookData: any) => {
        if (hookData.section !== 'body') return;
        const cell = hookData.cell;
        const text = (cell as any).customJustifyText;
        if (!text) return;

        const styles = cell.styles as any;
        const fontSizeMm = (styles.fontSize * 25.4) / 72;
        const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15);
        const padTop = typeof styles.cellPadding === 'number' ? styles.cellPadding : styles.cellPadding?.top ?? 1.2;
        const padLeft = typeof styles.cellPadding === 'number' ? styles.cellPadding : styles.cellPadding?.left ?? 1.2;
        const padRight = typeof styles.cellPadding === 'number' ? styles.cellPadding : styles.cellPadding?.right ?? 1.2;
        const textX = cell.x + padLeft;
        const maxWidth = cell.width - padLeft - padRight;

        doc.setFont(styles.font, styles.fontStyle);
        doc.setFontSize(styles.fontSize);
        if (Array.isArray(styles.textColor)) {
            doc.setTextColor(styles.textColor[0], styles.textColor[1], styles.textColor[2]);
        } else {
            doc.setTextColor(styles.textColor ?? 0);
        }

        const paragraphs = text.split('\n');
        const allLines: { text: string, isLastOfParagraph: boolean }[] = [];
        paragraphs.forEach((p: string) => {
            const pLines = doc.splitTextToSize(p, maxWidth);
            if (pLines && pLines.length > 0) {
                pLines.forEach((l: string, idx: number) => {
                    allLines.push({ text: l, isLastOfParagraph: idx === pLines.length - 1 });
                });
            } else {
                allLines.push({ text: '', isLastOfParagraph: true });
            }
        });

        const totalTextHeight = allLines.length * lineHeight;
        let startY = cell.y + padTop;
        if (styles.valign === 'middle') {
            startY = cell.y + (cell.height - totalTextHeight) / 2;
        }

        allLines.forEach((lineInfo, idx) => {
            const lineY = startY + (idx * lineHeight);
            const textY = lineY + (fontSizeMm / 2) + 0.3;
            if (!lineInfo.text) return;
            if (lineInfo.isLastOfParagraph) {
                doc.text(lineInfo.text, textX, textY, { align: 'left', baseline: 'middle' } as any);
            } else {
                // Nunca deixa a largura passada ao jsPDF ficar menor que a largura real
                // da linha — evita que ele quebre essa linha de novo por conta própria
                // quando ela está bem no limite da largura da coluna.
                const safeMaxWidth = Math.max(maxWidth, doc.getTextWidth(lineInfo.text) + 0.1);
                doc.text([lineInfo.text, ""], textX, textY, { align: 'justify', maxWidth: safeMaxWidth, baseline: 'middle' } as any);
            }
        });
    };

    return { willDrawCell, didDrawCell };
};

/**
 * Hooks de jspdf-autotable (willDrawCell + didDrawCell) que transformam
 * marcadores de texto "[X]" / "[  ]" dentro do conteúdo de uma célula em
 * caixas de seleção desenhadas de verdade — preenchidas de preto quando
 * marcadas, com contorno quando não —, mesmo estilo já usado no TR de Bens
 * e no ETP. Ao contrário de createJustifiedCellHooks, este hook NÃO assume
 * o controle total do desenho do texto: ele só troca o marcador por um
 * espaço em branco (pra abrir lugar pro desenho da caixa) e deixa o motor
 * padrão do autoTable desenhar o texto normalmente.
 */
export const createCheckboxCellHooks = (doc: jsPDF) => {
    const willDrawCell = (hookData: any) => {
        if (hookData.section !== 'body') return;
        const cell = hookData.cell;
        if (!cell.text || !Array.isArray(cell.text)) return;

        const modifiedText = [...cell.text];
        const boxes: { lineIndex: number; checked: boolean; textBefore: string }[] = [];

        for (let i = 0; i < modifiedText.length; i++) {
            let line = modifiedText[i];
            let searchIdx = 0;
            while (true) {
                const openIdx = line.indexOf('[', searchIdx);
                if (openIdx === -1) break;
                const closeIdx = line.indexOf(']', openIdx);
                if (closeIdx === -1) break;

                const inside = line.substring(openIdx + 1, closeIdx);
                if (inside.trim() === 'X' || inside.trim() === '') {
                    const checked = inside.includes('X');
                    const textBefore = line.substring(0, openIdx);
                    boxes.push({ lineIndex: i, checked, textBefore });
                    line = line.substring(0, openIdx) + '   ' + line.substring(closeIdx + 1);
                    searchIdx = openIdx + 3;
                } else {
                    searchIdx = closeIdx + 1;
                }
            }
            modifiedText[i] = line;
        }

        if (boxes.length > 0) {
            cell.text = modifiedText;
            (cell as any)._checkboxLines = modifiedText;
            (cell as any)._checkboxes = boxes;
        }
    };

    const didDrawCell = (hookData: any) => {
        if (hookData.section !== 'body') return;
        const cell = hookData.cell;
        const boxes = (cell as any)._checkboxes;
        if (!boxes || boxes.length === 0) return;

        const styles = cell.styles as any;
        const fontSizeMm = (styles.fontSize * 25.4) / 72;
        const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15);
        const padTop = typeof styles.cellPadding === 'number' ? styles.cellPadding : styles.cellPadding?.top ?? 1.2;
        const padLeft = typeof styles.cellPadding === 'number' ? styles.cellPadding : styles.cellPadding?.left ?? 1.2;
        const textX = cell.x + padLeft;
        const lines: string[] = (cell as any)._checkboxLines || [];

        const textHeight = lines.length * lineHeight;
        let startY = cell.y + padTop;
        if (styles.valign === 'middle') {
            startY = cell.y + (cell.height - textHeight) / 2;
        }

        doc.setFont(styles.font, styles.fontStyle);
        doc.setFontSize(styles.fontSize);

        boxes.forEach(cb => {
            const lineY = startY + (cb.lineIndex * lineHeight);
            const boxSize = 2.1;

            let lineStartX = textX;
            if (styles.halign === 'center') {
                const fullLineWidth = doc.getTextWidth(lines[cb.lineIndex] || '');
                lineStartX = cell.x + (cell.width - fullLineWidth) / 2;
            } else if (styles.halign === 'right') {
                const fullLineWidth = doc.getTextWidth(lines[cb.lineIndex] || '');
                lineStartX = cell.x + cell.width - padLeft - fullLineWidth;
            }

            const boxX = lineStartX + doc.getTextWidth(cb.textBefore);
            const boxY = lineY + ((fontSizeMm - boxSize) / 2);

            doc.setDrawColor(0);
            doc.setLineWidth(0.15);
            if (cb.checked) {
                doc.setFillColor(0, 0, 0);
                doc.rect(boxX, boxY, boxSize, boxSize, 'FD');
            } else {
                doc.rect(boxX, boxY, boxSize, boxSize, 'S');
            }
        });
    };

    return { willDrawCell, didDrawCell };
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
    doc.setDrawColor(0);
    if (checked) {
        doc.setFillColor(0, 0, 0);
        doc.rect(x, y - size + 0.5, size, size, 'FD');
    } else {
        doc.rect(x, y - size + 0.5, size, size, 'S');
    }


    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(label, TEXT_WIDTH - 10);
    doc.text(lines, x + size + 2, y);
    
    return y + (lines.length * 6);
};

export const drawInstitutionalHeader = (doc: jsPDF, setor: string, title: string, subtitle?: string) => {
    const colorRedFooter: [number, number, number] = [192, 57, 43];
    
    // --- INSERÇÃO DO LOGOTIPO PRINCIPAL (CABEÇALHO) ---
    try {
        if (logoCBMPABase64) {
             doc.addImage(logoCBMPABase64, 'PNG', MARGIN_LEFT, 16.5, 28, 12);
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
    
    doc.text(setor?.toUpperCase() || "SETOR", PAGE_WIDTH / 2, 30, { align: 'center' });

    doc.setFontSize(10);
    doc.text(title.toUpperCase(), PAGE_WIDTH / 2, 45, { align: 'center' });
    doc.setTextColor(0);

    if (subtitle) {
        doc.setFontSize(9);
        doc.text(subtitle, PAGE_WIDTH / 2, 50, { align: 'center' });
        return 55;
    }
    return 55;
};

export const drawInstitutionalFooter = (doc: jsPDF, setor: string, pageNum: number, totalPages: number) => {
    // Subimos o eixo Y mais um pouquinho para acomodar as 4 linhas perfeitamente
    const footY = PAGE_HEIGHT - 28; 
    
    const logoWidth = 12;
    const logoHeight = 14;
    let textStartX = MARGIN_LEFT; 

    // --- INSERÇÃO DO DISTINTIVO NO RODAPÉ ---
    try {
        // Trava de segurança para checar se o Base64 é válido
        if (distintivoQCGBase64 && distintivoQCGBase64.length > 100) {
             // Desenha o distintivo na margem esquerda
             doc.addImage(distintivoQCGBase64, 'PNG', MARGIN_LEFT, footY - 2, logoWidth, logoHeight);
             
             // Empurra o início do texto para a direita
             textStartX = MARGIN_LEFT + logoWidth + 4; 
        }
    } catch (error) {
        console.error("Erro ao carregar o distintivo no rodapé:", error);
    }
    // ---------------------------------------

    doc.setFontSize(7);
    // Uma dica: um tom de cinza (80,80,80) deixa o rodapé mais suave e elegante que o preto puro (0)
    doc.setTextColor(80, 80, 80); 
    
    // --- APLICA O ITÁLICO PARA TODO O BLOCO DE TEXTO DO RODAPÉ ---
    doc.setFont('helvetica', 'italic');
    
    // LINHA 1 (Corpo de Bombeiros vem primeiro)
    doc.text(`Corpo de Bombeiros Militar do Pará`, textStartX, footY, { align: 'left' });
    
    // LINHA 2 (Diretoria vem em seguida)
    doc.text(`Diretoria de Apoio Logístico`, textStartX, footY + 3, { align: 'left' });

    // LINHA 3 (Endereço)
    doc.text(`Endereço: Av Júlio César, 3000, Val-de-Cans - Marambaia`, textStartX, footY + 6, { align: 'left' });

    // LINHA 4 (CEP)
    doc.text(`CEP: 66615-055`, textStartX, footY + 9, { align: 'left' });

    // LINHA 5 (Contatos)
    doc.text(`www.bombeiros.pa.gov.br | e-mail: sipcdal@gmail.com`, textStartX, footY + 12, { align: 'left' });
      
    // --- TRAVA DE SEGURANÇA ---
    // Reseta a fonte para 'normal' antes de imprimir a página e finalizar.
    // Isso impede que a próxima página do PDF ou outras tabelas fiquem em itálico por acidente!
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0); // Volta o texto para preto padrão
    
    // Número da página alinhado à direita
    doc.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, footY + 12, { align: 'right' });
};

export const drawDocumentHeader = (doc: jsPDF, title: string, subTitle?: string, metaInfo?: string) => {
    let y = MARGIN_TOP;
    
    try {
        if (logoCBMPABase64) {
             doc.addImage(logoCBMPABase64, 'PNG', MARGIN_LEFT, y - 2, 30, 12);
        }
    } catch (error) {
        console.error("Erro ao carregar o logotipo no drawDocumentHeader:", error);
    }

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

    return Math.max(y + 20, 45);
};

export const drawSignature = (doc: jsPDF, name: string, cargo: string, x: number, y: number) => {
    y = checkPageBreak(doc, y, 30);
    doc.setFont('helvetica', 'normal');
    
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

    const nameStr = (n || '').trim();
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
    const wCargo = cargoStr ? (() => { doc.setFont('helvetica', 'bold'); return doc.getTextWidth(cargoStr); })() : 0;

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
        doc.setFont('helvetica', 'bold');
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