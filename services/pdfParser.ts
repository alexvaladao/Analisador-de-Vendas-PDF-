import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { AnalysisResult, SaleItem } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const parseNumber = (str: string) => {
  if (!str) return 0;
  const cleanStr = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
};

export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY = -1;
    let pageText = '';
    
    for (const item of textContent.items) {
      if ('str' in item) {
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        } else if (lastY !== -1) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
    }
    fullText += pageText + '\n\n';
  }

  return fullText;
};

export const parseSalesData = (text: string): AnalysisResult => {
  const sales: SaleItem[] = [];
  
  let grossRevenue = 0;
  let netRevenue = 0;
  let totalCashReceipts = 0;
  let previousDebitReceipts = 0;
  const supplies: {description: string, value: number}[] = [];
  const withdrawals: {description: string, value: number}[] = [];
  const invoicedSales: {orderId: string, customerName: string, value: number}[] = [];
  let cashPosition = 0;

  // Normalize spaces
  const normalizedText = text.replace(/\s+/g, ' ');

  const numStr = `\\d{1,3}(?:\\.\\d{3})*,\\d{2}`;
  
  // Match sales rows
  const rowRegex = new RegExp(`(\\d{6})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})\\s+(${numStr})`, 'g');
  
  let match;
  while ((match = rowRegex.exec(normalizedText)) !== null) {
    const orderId = match[1];
    const value = parseNumber(match[2]);
    const discount = parseNumber(match[3]);
    const surcharge = parseNumber(match[4]);
    const total = parseNumber(match[5]);
    const paymentCash = parseNumber(match[6]);
    const paymentCheckDay = parseNumber(match[7]);
    const paymentCheckPre = parseNumber(match[8]);
    const paymentDebit = parseNumber(match[9]);
    const paymentCredit = parseNumber(match[10]);
    const paymentBank = parseNumber(match[11]);
    const paymentInvoiced = parseNumber(match[12]);
    const paymentExchange = parseNumber(match[13]);
    const reserved = parseNumber(match[14]);
    const totalCrTrCe = parseNumber(match[15]);
    
    sales.push({
      orderId,
      value,
      discount,
      surcharge,
      total,
      paymentCash,
      paymentCheckDay,
      paymentCheckPre,
      paymentDebit,
      paymentCredit,
      paymentInvoiced,
      paymentBank,
      paymentExchange,
      reserved,
      totalCrTrCe
    });
    
    grossRevenue += value;
    netRevenue += total;
  }
  
  // Cash position
  const finalTotalRegex = /VALOR INICIAL:\s+[\d.,]+\s+TOTAL:\s+([\d.,]+)/i;
  const finalTotalMatch = normalizedText.match(finalTotalRegex);
  if (finalTotalMatch) {
    cashPosition = parseNumber(finalTotalMatch[1]);
  } else {
    // Fallback
    const posCaixaRegex = /POSIÇÃO DO CAIXA.*?TOTAL:\s+([\d.,]+)/i;
    const posCaixaMatch = normalizedText.match(posCaixaRegex);
    if (posCaixaMatch) {
      cashPosition = parseNumber(posCaixaMatch[1]);
    }
  }
  
  // Supplies
  const suprimentosRegex = /SUPRIMENTOS \(ANALÍTICO\).*?ORIGEM\s+(.*?)\s+TOTAL:/is;
  const supMatch = normalizedText.match(suprimentosRegex);
  if (supMatch) {
    const supText = supMatch[1];
    const supLineRegex = /DINHEIRO\s+([\d.,]+)\s+(.*?)(?=DINHEIRO|$)/gis;
    let sMatch;
    while ((sMatch = supLineRegex.exec(supText)) !== null) {
      supplies.push({
        value: parseNumber(sMatch[1]),
        description: sMatch[2].trim()
      });
    }
  }
  
  // Withdrawals
  const retiradasRegex = /RETIRADAS \(ANALÍTICO\).*?ORIGEM\s+(.*?)\s+TOTAL:/is;
  const retMatch = normalizedText.match(retiradasRegex);
  if (retMatch) {
    const retText = retMatch[1];
    const retLineRegex = /DINHEIRO\s+([\d.,]+)\s+(.*?)(?=DINHEIRO|$)/gis;
    let rMatch;
    while ((rMatch = retLineRegex.exec(retText)) !== null) {
      withdrawals.push({
        value: parseNumber(rMatch[1]),
        description: rMatch[2].trim()
      });
    }
  }
  
  // Previous Debit Receipts
  const debitosRegex = /RECEBIMENTO DE DÉBITO ANTERIOR NO CAIXA(.*?)(?:TOTAL:|$)/is;
  const debMatch = normalizedText.match(debitosRegex);
  if (debMatch) {
    const debText = debMatch[1];
    const debLineRegex = /([A-Z\s]+)\s+([\d.,]+)\s+[\d.,]+\s+[\d.,]+\s+([\d.,]+)/gi;
    let dMatch;
    while ((dMatch = debLineRegex.exec(debText)) !== null) {
      previousDebitReceipts += parseNumber(dMatch[3]);
    }
  }
  
  // Invoiced Sales
  const faturadaRegex = /RELAÇÃO DE VENDA FATURADA.*?BOLETO\s+(.*?)(?:\d{2,3}\.\d{3},\d{2}|$)/is;
  const fatMatch = normalizedText.match(faturadaRegex);
  if (fatMatch) {
    const fatText = fatMatch[1];
    const fatLineRegex = /(\d{6})\s+(.*?)\s+\d{2}\/\d{2}\/\d{4}\s+([\d.,]+)/g;
    let fMatch;
    while ((fMatch = fatLineRegex.exec(fatText)) !== null) {
      invoicedSales.push({
        orderId: fMatch[1],
        customerName: fMatch[2].trim(),
        value: parseNumber(fMatch[3])
      });
    }
  }

  totalCashReceipts = sales.reduce((acc, s) => acc + (s.paymentCash || 0), 0);

  return {
    sales,
    summary: {
      grossRevenue,
      netRevenue,
      cashPosition,
      futureRevenueForecast: 0,
      totalCashReceipts,
      previousDebitReceipts,
      supplies,
      withdrawals,
      invoicedSales
    }
  };
};

export const analyzeSalesPdfOffline = async (file: File): Promise<AnalysisResult> => {
  const text = await extractTextFromPdf(file);
  return parseSalesData(text);
};
