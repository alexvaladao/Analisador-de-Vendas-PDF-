export interface SaleItem {
  orderId: string;
  date?: string;
  value: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentCash: number;
  paymentCheckDay: number;
  paymentCheckPre: number;
  paymentDebit: number;
  paymentCredit: number;
  paymentBank: number;
  paymentInvoiced: number;
  paymentExchange: number;
  reserved: number;
  totalCrTrCe: number;
}

export interface AnalyticalItem {
  description: string;
  value: number;
}

export interface InvoicedSale {
  orderId: string;
  customerName?: string; // Sometimes available
  value: number;
}

export interface FinancialSummary {
  totalCashReceipts: number; // Total de Recebimento no Caixa
  grossRevenue: number; // Receita Bruta
  netRevenue: number; // Receita Líquida
  futureRevenueForecast: number; // Previsão de Receita Futura
  cashPosition: number; // Posição do Caixa
  previousDebitReceipts: number; // Recebimento de Débito Anterior
  
  supplies: AnalyticalItem[]; // Suprimentos (Analítico)
  withdrawals: AnalyticalItem[]; // Retiradas (Analítico)
  invoicedSales: InvoicedSale[]; // Relação de Venda Faturada
}

export interface AnalysisResult {
  sales: SaleItem[];
  summary: FinancialSummary;
}

export interface AnalysisRecord {
  id?: number;
  timestamp: number;
  fileName: string;
  fileSize?: number;
  data: AnalysisResult;
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  data: AnalysisResult | null;
  fileName: string | null;
}

export enum FileError {
  TOO_LARGE = "O arquivo é muito grande. O limite é 20MB.",
  INVALID_TYPE = "Tipo de arquivo inválido. Por favor envie um PDF.",
  READ_ERROR = "Erro ao ler o arquivo.",
  AI_ERROR = "Erro ao processar o PDF com a IA."
}