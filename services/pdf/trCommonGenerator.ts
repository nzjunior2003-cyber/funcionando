import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { TrCommonData } from '../../types';
import {
    formatDate,
    formatCurrency,
    setDefaultFont,
    drawInstitutionalHeader,
    drawInstitutionalFooter,
    sanitizeText,
    expandLongTextRows,
    drawPaeSignatureMark
} from './pdfUtils';
import { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_TOP, MARGIN_BOTTOM } from './pdfConstants';

// ============================================================================
// MOTOR COMPARTILHADO DOS TERMOS DE REFERÊNCIA (Bens, Serviços e futuros módulos)
// Cabeçalho, tabela de itens/grupos (Ampla x ME/EPP), tabela de seções e
// assinatura ficam aqui. Cada TR só informa o título e as linhas das seções.
// ============================================================================
// ============================================================================
// DICIONÁRIOS DE TRADUÇÃO (TEXTOS INTEGRAIS DA LEI 14.133/21)
// ============================================================================
export const mapJuridica: Record<string, string> = {
    '7.1.1': '7.1.1. Pessoa física: cédula de identidade (RG) ou documento equivalente que demonstre a capacidade civil;',
    '7.1.2': '7.1.2. Empresário individual: inscrição no Registro Público de Empresas Mercantis;',
    '7.1.3': '7.1.3. Microempreendedor Individual - MEI: Certificado da Condição de Microempreendedor Individual - CCMEI;',
    '7.1.4': '7.1.4. Sociedade empresária estrangeira: portaria de autorização de funcionamento no Brasil;',
    '7.1.5': '7.1.5. Sociedade simples: inscrição do ato constitutivo no Registro Civil de Pessoas Jurídicas;',
    '7.1.6': '7.1.6. Filial, sucursal ou agência: averbação do ato constitutivo da filial, sucursal ou agência;',
    '7.1.7': '7.1.7. Sociedade cooperativa: ata de fundação e estatuto social, com a ata da assembleia que o aprovou;',
    '7.1.8': '7.1.8. Agricultor familiar: Declaração de Aptidão ao Pronaf (DAP) ou Cadastro Nacional da Agricultura Familiar (CAF);',
    '7.1.9': '7.1.9. Produtor Rural: matrícula no CEI - Cadastro Específico do INSS;',
    '7.1.10': '7.1.10. Ato de autorização para o exercício da atividade, quando exigido por lei;',
    '7.1.11': '7.1.11. Documentos acompanhados de todas as alterações ou da consolidação respectiva.'
};

export const mapFiscal: Record<string, string> = {
    '7.2.1': '7.2.1. Prova de inscrição no CNPJ ou no CPF;',
    '7.2.2': '7.2.2. Prova de regularidade fiscal perante a Fazenda Nacional, Estadual e/ou Municipal do domicílio ou sede do licitante;',
    '7.2.3': '7.2.3. Prova de regularidade com o FGTS;',
    '7.2.4': '7.2.4. Prova de inexistência de débitos inadimplidos perante a Justiça do Trabalho (CNDT);',
    '7.2.5': '7.2.5. Prova de inscrição no cadastro de contribuintes Estadual ou Municipal, relativo ao domicílio ou sede do licitante;',
    '7.2.6': '7.2.6. Prova de regularidade com a Fazenda Estadual ou Municipal do domicílio ou sede do licitante;',
    '7.2.7': '7.2.7. Caso o fornecedor seja considerado isento dos tributos, comprovação mediante declaração da Fazenda respectiva;',
    '7.2.8': '7.2.8. MEI que pretenda auferir benefícios do tratamento diferenciado: comprovação da regularidade fiscal.'
};

export const mapEconomica: Record<string, string> = {
    '7.3.1': '7.3.1. Certidão negativa de insolvência civil expedida pelo distribuidor do domicílio ou sede;',
    '7.3.2': '7.3.2. Certidão negativa de falência expedida pelo distribuidor da sede do licitante;',
    '7.3.3': '7.3.3. Balanço patrimonial e demonstrações contábeis dos 2 (dois) últimos exercícios sociais;',
    '7.3.4': '7.3.4. Índices de Liquidez (LG, LC e SG) superiores a 1 (um);',
    '7.3.5': '7.3.5. Empresas criadas no exercício financeiro da licitação: apresentação do balanço de abertura;',
    '7.3.6': '7.3.6. Documentos limitar-se-ão ao último exercício no caso de fornecimento de bens para pronta entrega;',
    '7.3.7': '7.3.7. Documentos com base no limite definido pela RFB para pequenas e médias empresas;',
    '7.3.8': '7.3.8. Exigência de capital mínimo ou patrimônio líquido mínimo;',
    '7.3.9': '7.3.9. Balanço atestado por profissional habilitado.'
};

export const mapQualificacaoTecnica: Record<string, string> = {
    'ciencia': 'Declaração de que o licitante tomou conhecimento de todas as informações necessárias para o cumprimento das obrigações.',
    'registro': 'Apresentação de registro ou inscrição na entidade profissional competente.',
    'pessoal': 'Indicação do pessoal técnico, das instalações e do aparelhamento adequados e disponíveis para a execução.',
    'atestado': 'Atestado de capacidade técnica operacional (fornecimento de bens pertinentes e compatíveis em características e prazos).',
    'lei_especial': 'Cumprimento de outro requisito previsto em lei especial.',
    'nao_exigida': 'Não será exigida prova de qualificação técnica em razão da baixa complexidade da contratação.'
};

export const translateOptions = (selected: string[] | undefined, map: Record<string, string>) => {
    if (!selected || selected.length === 0) return 'Conforme Edital.';
    return selected.map(opt => `${map[opt] || opt}`).join('\n\n');
};

export interface TrPdfCtx {
    data: TrCommonData;
    radio: (selected: boolean) => string;
    pushHeader: (title: string) => void;
    pushRow: (q: string, a: string, justificado?: boolean) => void;
    pushFullRow: (content: string, justificado?: boolean) => void;
    numerosImpressos: Map<string, string[]>;
}

export interface TrPdfOptions {
    titulo: string;
    buildRows: (ctx: TrPdfCtx) => void;
}

export const generateTrPdf = (doc: jsPDF, data: TrCommonData, opts: TrPdfOptions) => {
    const L_MARGIN = 8;
    const R_MARGIN = 8;

    const colorBlueHeader: [number, number, number] = [31, 78, 121];
    const colorYellowHeader: [number, number, number] = [252, 230, 157];
    const colorGrayLabel: [number, number, number] = [242, 242, 242];
    const colorWhiteLabel: [number, number, number] = [255, 255, 255];
    
    setDefaultFont(doc);
    const radio = (selected: boolean) => selected ? '[X]' : '[  ]';
    
    let currentY = drawInstitutionalHeader(doc, data.setor || '', opts.titulo, `PAE nº ${data.pae || 'aaaa/nnnn'}`);
    currentY += 5;

    const advancedWillDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            if (!cell.text || !Array.isArray(cell.text)) return;
            
            (cell as any).checkboxes = [];
            let modifiedText = [...cell.text];
            
            for (let i = 0; i < modifiedText.length; i++) {
                let replacedLine = modifiedText[i];
                let searchIdx = 0;
                
                while(true) {
                    let openIdx = replacedLine.indexOf('[', searchIdx);
                    if (openIdx === -1) break;
                    let closeIdx = replacedLine.indexOf(']', openIdx);
                    if (closeIdx === -1) break;

                    let inside = replacedLine.substring(openIdx + 1, closeIdx);
                    
                    if (inside.trim() === 'X' || inside.trim() === '') {
                        let isChecked = inside.includes('X');
                        let textBefore = replacedLine.substring(0, openIdx);

                        (cell as any).checkboxes.push({
                            lineIndex: i,
                            checked: isChecked,
                            textBefore: textBefore
                        });

                        replacedLine = replacedLine.substring(0, openIdx) + '   ' + replacedLine.substring(closeIdx + 1);
                        searchIdx = openIdx + 3;
                    } else {
                        searchIdx = closeIdx + 1;
                    }
                }
                modifiedText[i] = replacedLine;
            }

            (cell as any)._myLines = modifiedText;
            cell.text = []; 
        }
    };

    const advancedDidDrawCell = (hookData: any) => {
        if (hookData.section === 'body') {
            const cell = hookData.cell;
            const styles = cell.styles;
            const fontSizeMm = (styles.fontSize * 25.4) / 72;
            const lineHeight = fontSizeMm * (styles.lineHeightFactor || 1.15); 
            
            let padTop = 1.2, padLeft = 1.2, padRight = 1.2;
            if (typeof styles.cellPadding === 'number') {
                padTop = padLeft = padRight = styles.cellPadding;
            } else if (styles.cellPadding) {
                padTop = (styles.cellPadding as any).top || 1.2;
                padLeft = (styles.cellPadding as any).left || 1.2;
                padRight = (styles.cellPadding as any).right || 1.2;
            }

            const textX = cell.x + padLeft;
            const maxWidth = cell.width - padLeft - padRight;

            doc.setFont(styles.font, styles.fontStyle);
            doc.setFontSize(styles.fontSize);

            const lines = (cell as any)._myLines;
            if (!lines || lines.length === 0) return;

            const textHeight = lines.length * lineHeight;
            let startY = cell.y + padTop;
            if (styles.valign === 'middle') {
                startY = cell.y + (cell.height - textHeight) / 2;
            }

            const checkboxes = (cell as any).checkboxes;
            if (checkboxes && checkboxes.length > 0) {
                checkboxes.forEach((cb: any) => {
                    const lineY = startY + (cb.lineIndex * lineHeight);
                    const boxSize = 2.1; 
                    const offsetX = doc.getTextWidth(cb.textBefore); 
                    const boxX = textX + offsetX; 
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
            }

            if (Array.isArray(styles.textColor)) {
                doc.setTextColor(styles.textColor[0], styles.textColor[1], styles.textColor[2]);
            } else {
                doc.setTextColor(styles.textColor as any);
            }

            lines.forEach((lineText: string, idx: number) => {
                const lineY = startY + (idx * lineHeight);
                const textY = lineY + (fontSizeMm / 2) + 0.3; 

                if (styles.halign === 'justify') {
                    const lineWidth = doc.getTextWidth(lineText);
                    const isLastLine = idx === lines.length - 1;
                    const isShortLine = lineWidth < (maxWidth * 0.85); 

                    if (isLastLine || isShortLine) {
                        doc.text(lineText, textX, textY, { align: 'left', baseline: 'middle' } as any);
                    } else {
                        // Garante que a largura passada ao jsPDF nunca seja menor que a
                        // largura real da linha — se ficarem quase iguais (linha bem no
                        // limite da coluna), o jsPDF pode quebrar essa linha de novo por
                        // conta própria dentro desta mesma chamada, usando uma altura de
                        // linha diferente da nossa e sobrepondo a linha seguinte.
                        const safeMaxWidth = Math.max(maxWidth, lineWidth + 0.1);
                        doc.text([lineText, ""], textX, textY, { align: 'justify', maxWidth: safeMaxWidth, baseline: 'middle' } as any);
                    }
                } else {
                    let finalX = textX;
                    if (styles.halign === 'center') finalX = cell.x + cell.width / 2;
                    else if (styles.halign === 'right') finalX = cell.x + cell.width - padRight;
                    
                    doc.text(lineText, finalX, textY, { align: styles.halign as any, baseline: 'middle' } as any);
                }
            });
        }
    };

    // Constantes da regra de rateio de cota ME/EPP (Lei 14.133/21, art. 48).
    // Ficam nomeadas (em vez de números soltos no meio do código, o que
    // chamamos de "magic numbers") pra qualquer pessoa lendo entender o
    // significado de cada valor sem precisar decorar a lei.
    const TETO_VALOR_LOTE = 4800000;   // Acima disso, a cota deixa de ser obrigatória (§2º).
    const LIMITE_SRP_COTA = 80000;     // Teto absoluto da cota ME/EPP quando o processo é SRP.
    const PERCENTUAL_COTA = 0.25;      // 25% é o percentual padrão de reserva (art. 48, III).

    // "SRP" = Sistema de Registro de Preços. No TR de Bens isso é identificado
    // pelas checkboxes de forma de contratação: Pregão p/ Registro de Preços
    // ou Adesão a uma Ata já existente — em ambos os casos a cota ME/EPP,
    // quando calculada em percentual, fica limitada a R$ 80.000,00.
    const isSRP = data.formaContratacao?.includes('pregao_rp') || data.formaContratacao?.includes('adesao_ata');

    type TrItem = TrCommonData['itens'][0];
    type Split = { qtdAmpla: number; qtdMeEpp: number };

    // Função pura: recebe os itens de UM grupo (ou um único item avulso,
    // tratado como "grupo de 1") e devolve quanto de cada item vai pra
    // Ampla Concorrência e quanto vai pra cota ME/EPP, seguindo a mesma
    // matemática já usada e validada no Orçamento Estimado
    // (components/OrcamentoForm.tsx, função processItems).
    const calcularSplit = (itens: TrItem[]) => {
        const valorTotal = itens.reduce(
            (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0
        );

        // O demandante pode decidir, com justificativa própria no processo,
        // não aplicar a reserva de cota ME/EPP mesmo quando a Lei preveria —
        // isso vem do checkbox do formulário. Segue o mesmo critério do
        // Orçamento Estimado: olha o valor do PRIMEIRO item do grupo, já que
        // o checkbox liga/desliga o campo em todos os itens do grupo juntos.
        const aplicarCotaMeEpp = itens[0]?.aplicarCotaMeEpp !== false;

        // Por padrão, sem nenhuma regra especial, 100% do item vai pra Ampla.
        // O Map guarda o resultado de cada item — vamos sobrescrever essas
        // entradas abaixo, conforme a faixa de valor em que o grupo se encaixa.
        const splits = new Map<TrItem, Split>();
        itens.forEach(it => splits.set(it, { qtdAmpla: Number(it.quantidade) || 0, qtdMeEpp: 0 }));

        let modo: 'ampla' | 'exclusiva' | 'dividida' = 'ampla';

        if (!aplicarCotaMeEpp) {
            // Demandante optou por não reservar cota (com justificativa no
            // processo) — mantém 100% Ampla Concorrência independentemente
            // da faixa de valor.
        } else if (valorTotal > 0 && valorTotal <= LIMITE_SRP_COTA) {
            // Art. 48, I: contratação de até R$ 80.000,00 é EXCLUSIVA para ME/EPP.
            modo = 'exclusiva';
            itens.forEach(it => splits.set(it, { qtdAmpla: 0, qtdMeEpp: Number(it.quantidade) || 0 }));
        } else if (valorTotal > LIMITE_SRP_COTA && valorTotal <= TETO_VALOR_LOTE) {
            // Faixa intermediária: reserva-se 25% do valor pra ME/EPP,
            // limitado a R$ 80.000,00 quando o processo é SRP.
            modo = 'dividida';
            let valorCota = valorTotal * PERCENTUAL_COTA;
            if (isSRP && valorCota > LIMITE_SRP_COTA) valorCota = LIMITE_SRP_COTA;
            const percentualEfetivo = valorCota / valorTotal;

            itens.forEach(it => {
                const qtdTotal = Number(it.quantidade) || 0;
                // Math.floor arredonda pra baixo: garante que a soma das cotas
                // de todos os itens do grupo nunca ultrapasse o percentual (ou
                // teto) calculado — o "resto" da divisão sobra pra Ampla.
                const qtdMeEpp = Math.floor(qtdTotal * percentualEfetivo);
                const qtdAmpla = qtdTotal - qtdMeEpp;
                splits.set(it, { qtdAmpla, qtdMeEpp });
            });
        }
        // Se valorTotal > TETO_VALOR_LOTE (ou for zero), mantém o padrão
        // "tudo Ampla" já setado acima — nada a fazer aqui.

        // Soma quanto em R$ cada categoria representa, pra alimentar as
        // linhas de total que aparecem no fim de cada grupo.
        let totalAmpla = 0, totalMeEpp = 0;
        itens.forEach(it => {
            const { qtdAmpla, qtdMeEpp } = splits.get(it)!;
            const valorUnit = Number(it.valorUnitario) || 0;
            totalAmpla += qtdAmpla * valorUnit;
            totalMeEpp += qtdMeEpp * valorUnit;
        });

        return { splits, modo, totalAmpla, totalMeEpp, totalGrupo: totalAmpla + totalMeEpp };
    };

    const t1Head: any[] = [];
    t1Head.push([{
        content: '1. O QUE SERÁ CONTRATADO?\n(art. 6°, XXIII, a e i, da Lei Federal nº 14.133/21)',
        colSpan: 8,
        styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold' }
    }]);

    // A coluna "Grupo" não existe mais — o nome do grupo agora vira uma
    // linha de título dentro da própria tabela (igual ao Orçamento Estimado),
    // então a tabela sempre tem 8 colunas, com ou sem agrupamento.
    const colNamesRow: any[] = [
        { content: 'Item', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Descrição', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Código SIMAS', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Und', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Qtd', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Unitário', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'V. Total', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } },
        { content: 'Concorrência', styles: { halign: 'center', valign: 'middle', fillColor: colorYellowHeader, fontStyle: 'bold' } }
    ];
    t1Head.push(colNamesRow);

    const t1Body: RowInput[] = [];
    let totalGlobal = 0;

    // Desenha as 1 ou 2 linhas de UM item (1 linha se ele for 100% de um tipo
    // só; 2 linhas — uma "Ampla" e uma "Cota Reservada" — se o valor do grupo
    // caiu na faixa que exige rateio).
    // No Pregão SRP os itens são renumerados em sequência única, atravessando os grupos.
    let seqItemRP = 0;
    const numerosImpressos = new Map<string, string[]>(); // id do item -> números impressos no PDF
    const pushItemRows = (item: TrItem, split: Split, modo: 'ampla' | 'exclusiva' | 'dividida' | 'cota') => {
        const pushRow = (qtd: number, label: string) => {
            if (qtd <= 0) return; // Não imprime linha "vazia" (ex.: cota 0 quando o rateio zerou o item).
            const valorPorcao = qtd * (Number(item.valorUnitario) || 0);
            const numeroImpresso = isPregaoRP ? String(++seqItemRP) : (item.item || '-');
            numerosImpressos.set(item.id, [...(numerosImpressos.get(item.id) || []), numeroImpresso]);
            t1Body.push([
                { content: numeroImpresso, styles: { halign: 'center', valign: 'middle' } },
                { content: sanitizeText(item.descricao), styles: { valign: 'middle', halign: 'justify', cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 1.5 } } },
                { content: item.codigoSimas || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: item.unidade || '-', styles: { halign: 'center', valign: 'middle' } },
                { content: qtd.toString(), styles: { halign: 'center', valign: 'middle' } },
                { content: formatCurrency(item.valorUnitario), styles: { halign: 'right', valign: 'middle' } },
                { content: formatCurrency(valorPorcao), styles: { halign: 'right', valign: 'middle' } },
                { content: label, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } }
            ]);
        };

        if (modo === 'exclusiva') {
            pushRow(split.qtdMeEpp, 'Exclusiva\nME/EPP');
        } else if (modo === 'cota') {
            pushRow(split.qtdMeEpp, 'Cota Reservada\nME/EPP');
        } else if (modo === 'ampla') {
            pushRow(split.qtdAmpla, 'Ampla\nConcorrência');
        } else {
            pushRow(split.qtdAmpla, 'Ampla\nConcorrência');
            pushRow(split.qtdMeEpp, 'Cota Reservada\nME/EPP');
        }
    };

    // Processa um grupo inteiro (ou um item avulso, como grupo de 1): soma no
    // total global, calcula o rateio e desenha as linhas de item. Devolve os
    // totais do grupo pra quem chamou decidir se desenha (ou não) as linhas
    // de subtotal — itens avulsos não têm subtotal próprio, só os grupos.
    const processarGrupo = (itens: TrItem[]) => {
        itens.forEach(it => { totalGlobal += (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0); });
        const { splits, modo, totalAmpla, totalMeEpp, totalGrupo } = calcularSplit(itens);
        itens.forEach(it => pushItemRows(it, splits.get(it)!, modo));
        return { totalAmpla, totalMeEpp, totalGrupo };
    };

    // Separa os itens em grupos (mesmo loteId) e avulsos (sem loteId),
    // preservando a ordem em que cada grupo apareceu pela primeira vez —
    // mesma estratégia usada no Orçamento Estimado (licitacao.ts).
    const ordemGrupos: string[] = [];
    const itensPorGrupo: Record<string, TrItem[]> = {};
    const avulsos: TrItem[] = [];

    data.itens.forEach(item => {
        if (item.loteId && item.loteId.trim() !== '') {
            if (!itensPorGrupo[item.loteId]) {
                itensPorGrupo[item.loteId] = [];
                ordemGrupos.push(item.loteId);
            }
            itensPorGrupo[item.loteId].push(item);
        } else {
            avulsos.push(item);
        }
    });

    // Pregão Eletrônico para Registro de Preços: o grupo que se divide em
    // Ampla + Cota ME/EPP vira DOIS grupos independentes, com numeração
    // sequencial em todo o documento e total próprio; a origem fica no título.
    const isPregaoRP = !!data.formaContratacao?.some(f => ['pregao', 'pregao_rp', 'dispensa_valor', 'dispensa_art75'].includes(f));
    let seqGrupo = 0;

    const tituloGrupo = (texto: string, fill: any, textColor: [number, number, number]): any[] => [{
        content: texto,
        colSpan: 8,
        styles: { fillColor: fill, textColor, fontStyle: 'bold', halign: 'left', valign: 'middle', cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } }
    }];
    const totalGrupoRow = (nome: string, valor: number): any[] => [
        { content: `TOTAL DO GRUPO ${nome}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorYellowHeader } },
        { content: formatCurrency(valor), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorYellowHeader } }
    ];

    // Pregão SRP: primeiro todos os grupos de Ampla Concorrência, depois os
    // de Cota Reservada / Exclusiva ME/EPP, com numeração contínua de grupos e itens.
    if (isPregaoRP) {
        const infos = ordemGrupos.map(loteId => {
            const itensGrupo = itensPorGrupo[loteId];
            itensGrupo.forEach(it => { totalGlobal += (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0); });
            return { loteId, itensGrupo, ...calcularSplit(itensGrupo) };
        });
        const origemDe = (loteId: string) => /^\s*(grupo|lote)\b/i.test(loteId) ? loteId.trim() : `Grupo ${loteId}`;

        infos.forEach(({ itensGrupo, splits, modo, totalAmpla }) => {
            if (modo === 'exclusiva') return;
            const n = String(++seqGrupo);
            t1Body.push(tituloGrupo(`GRUPO ${n} — AMPLA CONCORRÊNCIA`, colorBlueHeader, [255, 255, 255]));
            itensGrupo.forEach(it => pushItemRows(it, splits.get(it)!, 'ampla'));
            t1Body.push(totalGrupoRow(n, totalAmpla));
        });
        infos.forEach(({ loteId, itensGrupo, splits, modo, totalMeEpp }) => {
            if (modo === 'ampla') return;
            const n = String(++seqGrupo);
            const titulo = modo === 'exclusiva' ? `GRUPO ${n} — EXCLUSIVA ME/EPP (origem: ${origemDe(loteId)})` : `GRUPO ${n} — COTA RESERVADA ME/EPP (origem: ${origemDe(loteId)})`;
            t1Body.push(tituloGrupo(titulo, colorBlueHeader, [255, 255, 255]));
            itensGrupo.forEach(it => pushItemRows(it, splits.get(it)!, modo === 'exclusiva' ? 'exclusiva' : 'cota'));
            t1Body.push(totalGrupoRow(n, totalMeEpp));
        });
    }

    (isPregaoRP ? [] : ordemGrupos).forEach(loteId => {
        const itensGrupo = itensPorGrupo[loteId];

        // Linha de título do grupo, ocupando as 8 colunas — substitui a antiga
        // coluna "Grupo" que se repetia em toda linha de item.
        t1Body.push([{
            content: `GRUPO ${loteId}`,
            colSpan: 8,
            styles: { fillColor: colorBlueHeader, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', halign: 'left', valign: 'middle', cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } }
        }]);

        const { totalAmpla, totalMeEpp, totalGrupo } = processarGrupo(itensGrupo);

        // As 3 linhas de fechamento do grupo: quanto ficou em cada cota e o
        // total do grupo — igual ao padrão pedido, espelhando o Orçamento.
        t1Body.push([
            { content: 'TOTAL ME/EPP', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } },
            { content: formatCurrency(totalMeEpp), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }
        ]);
        t1Body.push([
            { content: 'TOTAL AMPLA CONCORRÊNCIA', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } },
            { content: formatCurrency(totalAmpla), colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: colorGrayLabel } }
        ]);
        t1Body.push(totalGrupoRow(loteId, totalGrupo));
    });

    // Itens avulsos (sem loteId) vêm depois de todos os grupos, sem título
    // nem subtotal — exatamente como já funcionava antes desta mudança.
    avulsos.forEach(item => processarGrupo([item]));

    t1Body.push([
        { content: 'VALOR GLOBAL ESTIMADO', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } },
        { content: formatCurrency(totalGlobal), colSpan: 3, styles: { fontStyle: 'bold', halign: 'right', valign: 'middle', fillColor: colorGrayLabel } }
    ]);

    // O título da seção é uma tabela própria (aparece só uma vez); a tabela de
    // itens repete apenas a linha com os nomes das colunas ao virar a página.
    // Garante espaço pro título + nomes das colunas + ao menos uma linha de item,
    // pra o título nunca ficar sozinho no fim de uma página.
    if (currentY + 60 > PAGE_HEIGHT - MARGIN_BOTTOM) {
        doc.addPage();
        currentY = MARGIN_TOP;
    }
    autoTable(doc, {
        startY: currentY,
        body: [t1Head[0]],
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0 },
        margin: { left: L_MARGIN, right: R_MARGIN },
        rowPageBreak: 'avoid'
    });
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY,
        head: [t1Head[1]],
        body: t1Body,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: [0,0,0], lineWidth: 0.1, textColor: 0 },
        columnStyles: {
            0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 15 }, 3: { cellWidth: 10 },
            4: { cellWidth: 10 }, 5: { cellWidth: 28 }, 6: { cellWidth: 30 }, 7: { cellWidth: 22 }
        },
        margin: { left: L_MARGIN, right: R_MARGIN },
        rowPageBreak: 'avoid',
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 6;

    const t2Body: RowInput[] = [];
    let isZebra = false;

    const pushHeader = (title: string) => {
        t2Body.push([{ content: title, colSpan: 2, styles: { fillColor: colorBlueHeader, textColor: 255, halign: 'center', fontStyle: 'bold' } }]);
        isZebra = false;
    };

    const pushRow = (q: string, a: string, justificado: boolean = false) => {
        const bg = isZebra ? colorGrayLabel : colorWhiteLabel;
        isZebra = !isZebra;
        t2Body.push([
            { content: q, styles: { fillColor: bg, fontStyle: 'bold', valign: 'middle' } },
            { content: sanitizeText(a), styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left' } }
        ]);
    };

    const pushFullRow = (content: string, justificado: boolean = false) => {
        const bg = isZebra ? colorGrayLabel : colorWhiteLabel;
        isZebra = !isZebra;
        t2Body.push([{ content: sanitizeText(content), colSpan: 2, styles: { fillColor: bg, valign: 'middle', halign: justificado ? 'justify' : 'left' } }]);
    };

    opts.buildRows({ data, radio, pushHeader, pushRow, pushFullRow, numerosImpressos });

    autoTable(doc, {
        startY: currentY,
        body: expandLongTextRows(doc, t2Body, {
            startY: currentY,
            fontSize: 8,
            // Célula de largura total (colSpan 2, usada pelo pushFullRow):
            // 194mm (tableWidth) - padding. Célula de resposta comum
            // (pushRow, coluna 1 'auto'): 194 - 55 (coluna 0) - padding.
            getCellWidthMm: (cell: any) => {
                const tableWidth = PAGE_WIDTH - L_MARGIN - R_MARGIN;
                const colSpan = (cell && cell.colSpan) || 1;
                return (colSpan === 2 ? tableWidth : tableWidth - 55) - 4.2;
            }
        }),
        theme: 'grid',
        styles: {
            fontSize: 8,
            lineColor: [0,0,0],
            lineWidth: 0.1,
            textColor: 0,
            overflow: 'linebreak',
            cellPadding: { top: 1.2, right: 3, bottom: 1.2, left: 1.2 }
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: L_MARGIN, right: R_MARGIN, bottom: MARGIN_BOTTOM },
        rowPageBreak: 'avoid',
        willDrawCell: advancedWillDrawCell,
        didDrawCell: advancedDidDrawCell
    });

    // ============================================================================
    // ASSINATURAS E RODAPÉ
    // ============================================================================
    let finalY = (doc as any).lastAutoTable.finalY + 15;

    // Tenta o espaçamento "ideal" de sempre entre a data e a assinatura;
    // se não couber mas um espaçamento mais compacto (ainda legível)
    // couber, usa o compacto em vez de jogar tudo pra uma página nova
    // e desperdiçar o espaço que sobrou na página atual.
    const idealGap = 38, compactGap = 18;
    const sigFootprint = 10; // altura ocupada abaixo da linha de assinatura (nome + função)
    const remaining = (PAGE_HEIGHT - MARGIN_BOTTOM) - finalY;

    let gap = idealGap;
    if (remaining < idealGap + sigFootprint) {
        if (remaining >= compactGap + sigFootprint) {
            gap = compactGap;
        } else {
            doc.addPage();
            finalY = MARGIN_TOP + 10;
            gap = idealGap;
        }
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.cidade || 'Belém'} (PA), ${formatDate(data.data)}.`, PAGE_WIDTH - R_MARGIN, finalY, { align: 'right' });

    finalY += gap;
    
    const sigWidth = 80;
    const sigX = PAGE_WIDTH / 2;
    if (data.assinadoPae) drawPaeSignatureMark(doc, sigX, finalY);
    doc.setLineWidth(0.1); 
    doc.setDrawColor(120, 120, 120); 
    doc.line(sigX - (sigWidth / 2), finalY, sigX + (sigWidth / 2), finalY);

    doc.setFontSize(10);

    const drawNameWithBoldGuerra = (
        nomeCompleto: string,
        nomeGuerra: string,
        cargo: string,
        x: number,
        y: number
    ) => {
        const fullName = String(nomeCompleto || '').trim();
        const guerra = String(nomeGuerra || '').trim();
        const cargoTexto = String(cargo || '').trim();

        if (!fullName) return;

        const parts: { text: string; bold?: boolean }[] = [];
        const lowerFull = fullName.toLowerCase();
        const lowerGuerra = guerra.toLowerCase();

        if (guerra && lowerFull.includes(lowerGuerra)) {
            const idx = lowerFull.indexOf(lowerGuerra);
            const before = fullName.slice(0, idx).trimEnd();
            const boldPart = fullName.slice(idx, idx + guerra.length).trim();
            const after = fullName.slice(idx + guerra.length).trimStart();

            if (before) parts.push({ text: before });
            if (boldPart) parts.push({ text: ` ${boldPart} `, bold: true });
            if (after) parts.push({ text: after });
        } else {
            parts.push({ text: fullName });
        }

        if (cargoTexto) {
            parts.push({ text: ` - ${cargoTexto}`, bold: true });
        }

        const widths = parts.map(p => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            return doc.getTextWidth(p.text);
        });

        const totalW = widths.reduce((sum, w) => sum + w, 0);
        let startX = x - (totalW / 2);

        parts.forEach((p, i) => {
            doc.setFont('helvetica', p.bold ? 'bold' : 'normal');
            doc.text(p.text, startX, y);
            startX += widths[i];
        });
    };

    drawNameWithBoldGuerra(
        data.nome || '',
        data.nomeGuerra || '',
        data.cargo || '',
        sigX,
        finalY + 5
    );

    if (data.funcao) {
        doc.setFont('helvetica', 'normal');
        doc.text(data.funcao, sigX, finalY + 10, { align: 'center' });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (i === totalPages) {
            drawInstitutionalFooter(doc, data.setor || '', i, totalPages);
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Página ${i} de ${totalPages}`, PAGE_WIDTH - R_MARGIN, PAGE_HEIGHT - 10, { align: 'right' });
        }
    }
};

// ============================================================================
// BLOCOS DE LINHAS COMPARTILHADOS (mesmo texto em todos os TRs)
// `sec` é o número da seção no documento (ex.: 7 no TR Bens, 6 no TR Serviços).
// ============================================================================
const num = (sec: number, n: number) => `${sec}.${n}.`;
// Os textos das habilitações trazem a numeração do TR Bens (seção 7); em outros TRs a seção muda.
const renum = (sec: number, t: string) => sec === 7 ? t : t.replace(/(^|\n\n)7\./g, `$1${sec}.`);

export const pushAgrupamentoEDescricao = (c: TrPdfCtx) => {
    c.pushHeader('2. JUSTIFICATIVA PARA O AGRUPAMENTO DE ITENS\n(art. 40, §§ 2° e 3°, da Lei Federal nº 14.133/21)');
    c.pushFullRow(c.data.justificativaAgrupamento || 'Não se aplica.', true);

    c.pushHeader('3. DESCRIÇÃO DA SOLUÇÃO\n(art. 6°, XXIII, c, da Lei Federal nº 14.133/21)');
    c.pushRow('3.1. QUAL O MOTIVO DA CONTRATAÇÃO?', c.data.motivoContratacao || '-', true);
};

// Linhas x.2 a x.5 da seção de critérios de seleção (a forma de contratação x.1 varia por TR).
export const pushCriteriosSelecaoComuns = (c: TrPdfCtx, sec: number) => {
    const d = c.data, radio = c.radio;
    c.pushRow(`${num(sec, 2)} CRITÉRIO DE JULGAMENTO`, `${radio(d.criterioJulgamento === 'menor_preco')} Menor preço.\n\n${radio(d.criterioJulgamento === 'maior_desconto')} Maior desconto.`);
    c.pushRow(`${num(sec, 3)} O ORÇAMENTO É SIGILOSO?`, `${radio(d.orcamentoSigiloso === 'sim')} Sim. Justificativa: ${d.justificativaOrcamentoSigiloso || '-'}\n\n${radio(d.orcamentoSigiloso === 'nao')} Não.`, true);
    c.pushRow(`${num(sec, 4)} ACEITABILIDADE`, d.criterioAceitabilidade || '-', true);

    let textoParticipacaoME = '';
    const partME = d.participacaoME || '';
    const itensME = d.participacaoMEItens || d.itensParticipacaoExclusiva || '-';
    const descME = d.itensParticipacaoExclusivaDesc ? `\nDescrição: ${d.itensParticipacaoExclusivaDesc}` : '';
    if (partME === 'sim') {
        textoParticipacaoME = `[X] Sim. Itens: ${itensME}${descME}\n\n[  ] Não.`;
    } else if (partME === 'nao') {
        textoParticipacaoME = `[  ] Sim. Itens: -\n\n[X] Não.`;
    } else {
        textoParticipacaoME = `[  ] Sim. Itens: -\n\n[  ] Não.`;
    }
    c.pushRow(`${num(sec, 5)} HÁ ITENS COM PARTICIPAÇÃO EXCLUSIVA DE ME/EPP?`, textoParticipacaoME, true);
};

// Habilitações jurídica, fiscal e econômica (x.1 a x.3).
export const pushHabilitacoes = (c: TrPdfCtx, sec: number) => {
    const d = c.data;
    c.pushRow(`${num(sec, 1)} HABILITAÇÃO JURÍDICA`, renum(sec, translateOptions(d.habilitacaoJuridica, mapJuridica)));
    c.pushRow(`${num(sec, 2)} FISCAL / SOCIAL`, renum(sec, translateOptions(d.habilitacaoFiscal, mapFiscal)));
    c.pushRow(`${num(sec, 3)} QUALIFICAÇÃO ECONÔMICA`, renum(sec, translateOptions(d.qualificacaoEconomica, mapEconomica)));
};

// Habilitação técnica + comprovações técnicas (x.4 e x.5). `comLegislacao` imprime
// também a "legislação aplicável" de cada exigência (usado no TR Serviços).
export const pushQualificacaoTecnica = (c: TrPdfCtx, sec: number, mapa: Record<string, string>, comLegislacao = false) => {
    const d = c.data, radio = c.radio;
    c.pushRow(`${num(sec, 4)} QUALIFICAÇÃO TÉCNICA EXIGIDA?`, `${radio(d.habilitacaoTecnicaExigida === 'sim')} Sim. Exigência: ${d.habilitacaoTecnicaQual || '-'}\nJustificativa: ${d.habilitacaoTecnicaPorque || '-'}\n\n${radio(d.habilitacaoTecnicaExigida === 'nao')} Não.`, true);

    const qualifTec = d.qualificacoesTecnicas || [];
    const qualifTecText = qualifTec.length === 0 ? 'Conforme Edital.' : qualifTec.map(opt => {
        const baseText = `${mapa[opt] || opt}`;
        const just = d.qualificacoesTecnicasJustificativas?.[opt];
        const lei = comLegislacao ? d.qualificacoesTecnicasJustificativas?.[`${opt}__lei`] : '';
        const req = opt === 'lei_especial' ? d.qualificacoesTecnicasJustificativas?.['lei_especial__requisito'] : '';
        let t = baseText;
        if (req) t += `\n  Especificação: ${req}`;
        if (just) t += `\n  Justificativa: ${just}`;
        if (lei) t += `\n  Legislação aplicável: ${lei}`;
        return t;
    }).join('\n\n');
    c.pushRow(`${num(sec, 5)} COMPROVAÇÕES TÉCNICAS`, qualifTecText, true);
};

// Sustentabilidade, riscos, consórcio e subcontratação (x.6 a x.9).
export const pushSustentabilidadeRiscosConsorcio = (c: TrPdfCtx, sec: number) => {
    const d = c.data, radio = c.radio;
    c.pushRow(`${num(sec, 6)} CRITÉRIO DE SUSTENTABILIDADE?`, `${radio(d.criterioSustentabilidade === 'sim')} Sim. Detalhes: ${d.criterioSustentabilidadeDesc || '-'}\n\n${radio(d.criterioSustentabilidade === 'nao')} Não.`, true);
    c.pushRow(`${num(sec, 7)} RISCOS`, `${radio(d.riscosAssumidos === 'sim')} Sim. Detalhes: ${d.riscosAssumidosDesc || '-'}\n\n${radio(d.riscosAssumidos === 'nao')} Não.`, true);
    c.pushRow(`${num(sec, 8)} CONSÓRCIO`, `${radio(d.participacaoConsorcio === 'sim')} Sim (${d.participacaoConsorcioPercentual || '0'}% acréscimo).\n\n${radio(d.participacaoConsorcio === 'nao')} Não. Motivo: ${d.participacaoConsorcioJustificativa || '-'}`, true);
    c.pushRow(`${num(sec, 9)} SUBCONTRATAÇÃO?`, `${radio(d.subcontratacao === 'sim')} Sim. Opção: ${d.subcontratacaoOpcao ? renum(sec, d.subcontratacaoOpcao) : '-'}\nDetalhes: ${d.subcontratacaoDetalhes || '-'}\n\n${radio(d.subcontratacao === 'nao')} Não.`, true);
};

export const textoReajuste = (d: TrCommonData): string => {
    const marcosReajuste: Record<string, string> = {
        orcamento: 'a partir do orçamento estimado',
        proposta: 'a partir da apresentação da proposta',
        contrato: 'a partir da assinatura do contrato'
    };
    const nMesesReajuste = Number(d.reajusteMeses);
    const unidadeMeses = nMesesReajuste === 1 ? 'mês' : 'meses';
    const marcoReajuste = d.reajusteMarco ? `, ${marcosReajuste[d.reajusteMarco]}` : '';
    return `Índice: ${d.reajusteIndice || 'N/A'}. Periodicidade: a cada ${d.reajusteMeses || '-'} ${unidadeMeses}${marcoReajuste}.`;
};

export const textoGarantiaContrato = (c: TrPdfCtx): string => {
    const d = c.data;
    const naoHaJust = d.garantiaContratoNaoHaJustificativa ? ` Justificativa: ${d.garantiaContratoNaoHaJustificativa}` : '';
    return `${c.radio(d.garantiaContratoTipo === 'porcentagem')} Sim: ${d.garantiaContratoPorcentagem || '0'}% do valor inicial. Justificativa: ${d.garantiaContratoJustificativa || '-'}\n\n${c.radio(d.garantiaContratoTipo === 'nao_ha')} Não há.${naoHaJust}`;
};

export const pushPrevisaoOrcamentaria = (c: TrPdfCtx, sec: number) => {
    const d = c.data;
    c.pushHeader(`${sec}. PREVISÃO ORÇAMENTÁRIA\n(art. 18, § 1°, VI, da Lei Federal nº 14.133/21)`);
    c.pushFullRow(`${sec}.1. DADOS ORÇAMENTÁRIOS DA CONTRATAÇÃO`);
    c.pushRow('FUNCIONAL', d.dadosOrcamentariosFuncional || '-');
    c.pushRow('ELEMENTO E FONTE', `Elemento: ${d.dadosOrcamentariosElemento || '-'}   |   Fonte: ${d.dadosOrcamentariosFonte || '-'}`);
};
