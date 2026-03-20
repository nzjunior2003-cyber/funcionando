
// ===== types.ts - VERSÃO COMPLETA ATUALIZADA =====

export enum DocumentType {
  NONE = 'none',
  DFD = 'dfd',
  ETP = 'etp',
  RISCO = 'risco',
  ORCAMENTO = 'orcamento',
  TR_BENS = 'tr_bens',
}

export interface Signatory {
  cidade: string;
  data: string;
  nome: string;
  nomeGuerra: string;
  cargo: string;
  funcao: string;
}

export interface DfdData extends Signatory {
  numeroMemo: string;
  ano: string;
  unidade: string;
  problema: string;
  quantitativo: string;
  prazo: string;
  justificativaPrazo: string;
  statusPCA: string;
  aiParagraphs?: string[];
}

export interface EtpItem {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface EtpQualidadeItem {
  id: string;
  descricao: string;
}

export interface EtpData extends Signatory {
  setor: string;
  numero: string;
  ano: string;
  pae: string;
  necessidade: string;
  fontesPesquisa: string[];
  fonteOutro: string;
  justificativaTecnica: string;
  restricaoFornecedores: string;
  tipoObjeto: string[];
  natureza: string;
  monopolio: string;
  vigencia: string;
  vigenciaOutroNum: string;
  vigenciaOutroTipo: 'dias' | 'meses' | 'anos';
  prorrogacao: string;
  transicao: string;
  transicaoContrato: string;
  transicaoPrazo: string;
  padraoQualidade: EtpQualidadeItem[];
  sustentabilidade: string[];
  sustentabilidadeOutro: string;
  prioridadeLeiTipo: string;
  prioridadeLeiJustificativa: string;
  treinamento: string;
  solucaoContratacao: string;
  garantiaContratual: string;
  garantiaOutroNum: string;
  garantiaOutroTipo: 'dias' | 'meses' | 'anos';
  assistenciaTecnica: string;
  justificativaAssistenciaTecnica: string;
  manutencao: string;
  metodoQuantitativo: string[];
  metodoOutro: string;
  descricaoQuantitativo: string;
  itens: EtpItem[];
  meiosPesquisa: string[];
  meiosPesquisaOutro: string;
  parcelamento: string;
  motivosNaoParcelamento: string[];
  motivosNaoParcelamentoOutro: string;
  contratacoesCorrelatas: string;
  contratacoesCorrelatasEspecificar: string;
  previsaoPCA: string;
  itemPCA: string;
  justificativaPCA: string;
  beneficios: string[];
  beneficiosOutro: string;
  pendencias: string;
  pendenciasEspecificar: string;
  pendenciasResponsaveis: string;
  impactoAmbiental: string;
  impactos: string;
  medidasMitigacao: string;
  viabilidade: string;
}

export interface RiskItem {
  id: string;
  descricao: string;
  probabilidade: string;
  impacto: string;
  dano: string;
  prevDesc: string;
  prevResp: string;
  contDesc: string;
  contResp: string;
}

export interface RiscoData extends Signatory {
  pae: string;
  riscos: RiskItem[];
}

export interface OrcamentoItemCota {
  id: string;
  ordemTR: string;
  tipo: string;
  quantidade: number;
}

export interface OrcamentoItemGroup {
  id: string;
  itemTR: string;
  descricao: string;
  estimativaUnitaria: number;
  codigoSimas: string;
  unidade: string;
  quantidadeTotal: number;
  cotas: OrcamentoItemCota[];
  loteId?: string;
  // Campos específicos para Aditivo
  valorUnitarioContrato?: number;
  aditivoQuantidade?: number; // Quantidade a ser aditivada
  aditivoPercentual?: number; // Percentual do aditivo
  aditivoValorTotal?: number; // Valor total do aditivo
  tipoValor?: 'moeda' | 'percentual'; // Tipo do valor da pesquisa de preços
}

export interface OrcamentoPrice {
  id: string;
  source: string;
  value: string;
}

export interface OrcamentoFornecedor {
  id: string;
  nome: string;
  justificativa: string;
  requisitos: 'sim' | 'nao' | '';
}

// ===== NOVO: Tipos para Credenciamento =====

export type NivelEscolaridade = 
  | 'mediotecnico'
  | 'graduado'
  | 'especialista'
  | 'mestre'
  | 'doutor'
  | 'posdoutor';

export const VALORES_CONSUP_2024: Record<string, number> = {
  mediotecnico: 80.00,
  graduado: 100.00,
  especialista: 110.00,
  mestre: 130.00,
  doutor: 150.00,
  posdoutor: 150.00,
};

export const LABELS_ESCOLARIDADE: Record<string, string> = {
  mediotecnico: 'Médio/Técnico',
  graduado: 'Graduado',
  especialista: 'Especialista',
  mestre: 'Mestre',
  doutor: 'Doutor',
  posdoutor: 'Pós-Doutor',
};

export interface InstrutorCredenciamento {
  nomeInstrutor: string;
  nivelEscolaridade: NivelEscolaridade;
  valorHoraAula: number;
  cargaHorariaInstrutor: number;
}

export interface TabelaConsupItem {
  id: string;
  disciplina: string;
  cargaHoraria: number;
  nivelEscolaridade: NivelEscolaridade;
  valorHoraAula: number;
  nomeInstrutor: string;
  instrutores: InstrutorCredenciamento[];
}

// ===== FIM dos Tipos de Credenciamento =====

export interface OrcamentoData {
  setor: string;
  cidade: string;
  data: string;
  pae: string;
  tipoOrcamento: 'licitacao' | 'adesao_ata' | 'dispensa_licitacao' | 'aditivo_contratual' | 'credenciamento' | 'gerenciador_ata';
  numeroAta: string;
  anoAta: string;
  orgaoAta: string;
  estadoAta: string;
  modalidadeLicitacao: 'pregao_eletronico_comum' | 'pregao_eletronico_rp' | 'outra';
  tipoObjetoOrcamento?: 'bem_divisivel' | 'bem_nao_divisivel' | 'servico';
  itemGroups: OrcamentoItemGroup[];
  fontesPesquisa: string[];
  justificativaAusenciaFonte: string;
  justificativaPesquisaDireta: string;
  fornecedoresDiretos: OrcamentoFornecedor[];
  metodologia: 'menor' | 'media' | 'mediana' | '';
  metodologiaDescricao?: string;
  precosEncontrados: { [itemGroupId: string]: OrcamentoPrice[] };
  precosIncluidos: { [priceId: string]: boolean };
  houveDescarte: 'sim' | 'nao' | '';
  justificativaDescarte: string;
  
  // Campos específicos para Aditivo
  numeroContrato?: string;
  anoContrato?: string;
  aditivoTempo?: 'sim' | 'nao' | '';
  aditivoTempoQuantidade?: string; // Alterado para string para permitir input livre
  aditivoTempoUnidade?: 'meses' | 'anos';
  haveraReajuste?: 'sim' | 'nao' | '';
  porcentagemReajuste?: number;
  indiceReajuste?: string;

  assinante1Nome: string;
  assinante1NomeGuerra: string;
  assinante1Cargo: string;
  assinante1Funcao: string;
  assinante2Nome: string;
  assinante2NomeGuerra: string;
  assinante2Cargo: string;
  assinante2Funcao: string;
  
  // NOVO: Campos para Credenciamento
  tabelaConsup?: TabelaConsupItem[];
  numeroResolucao?: string;
  dataResolucao?: string;
}

export interface TrBensItem extends EtpItem {
  grupo: string;
  item: string;
  codigoSimas: string;
  concorrencia: string;
  loteId?: string;
}

export interface TrBensData extends Signatory {
  pae: string;
  setor: string;
  itens: TrBensItem[];
  justificativaAgrupamento: string;
  motivoContratacao: string;
  naturezaBem: string;
  provaQualidade: string;
  justificativaProvaQualidade: string;
  amostra: string;
  amostraPrazo: string;
  justificativaAmostra: string;
  garantiaBem: string;
  garantiaBemMeses: string;
  garantiaItens: string;
  assistenciaTecnica: string;
  assistenciaTecnicaItens: string;
  assistenciaTecnicaMeses: string;
  assistenciaTecnicaModo: string;
  formaContratacao: string[];
  inexigibilidadeInciso: string;
  dispensaInciso: string;
  fundamentoLegal: string;
  criterioJulgamento: string;
  orcamentoSigiloso: string;
  justificativaOrcamentoSigiloso: string;
  criterioAceitabilidade: string;
  participacaoME: string;
  participacaoMEItens: string;
  itensParticipacaoExclusiva: string;
  itensParticipacaoExclusivaDesc: string;
  
  habilitacaoJuridica: string[];
  habilitacaoFiscal: string[];
  qualificacaoEconomica: string[];
  habilitacaoTecnicaExigida: string;
  habilitacaoTecnicaQual: string;
  habilitacaoTecnicaPorque: string;
  qualificacoesTecnicas: string[];
  qualificacoesTecnicasJustificativas: { [key: string]: string };
  criterioSustentabilidade: string;
  criterioSustentabilidadeDesc: string;
  riscosAssumidos: string;
  riscosAssumidosDesc: string;
  participacaoConsorcio: string;
  participacaoConsorcioJustificativa: string;
  participacaoConsorcioPercentual: string;
  subcontratacao: string;
  subcontratacaoOpcao: string;
  subcontratacaoDetalhes: string;
  formaEntregaTipo: string;
  entregaParcelasX: string;
  entregaParcelasY: string;
  entregaParcelasZ: string;
  localEntrega: string;
  prazoValidadePereciveis: string;
  prazoContrato: string;
  possibilidadeProrrogacao: string;
  pagamentoMeio: string;
  pagamentoOnde: string;
  pagamentoPrazoDias: string;
  pagamentoRegularidade: string;
  pagamentoOpcoes: string[];
  garantiaContratoTipo: string;
  garantiaContratoPorcentagem: string;
  garantiaContratoJustificativa: string;
  reajusteIndice: string;
  reajusteMeses: string;
  formaEntrega: string;
  entregaParcelas: string;
  entregaPrimeira: string;
  entregaAviso: string;
  prazoValidade: string;
  reajustePeriodo: string;
  dadosOrcamentariosFuncional: string;
  dadosOrcamentariosElemento: string;
  dadosOrcamentariosFonte: string;
}
