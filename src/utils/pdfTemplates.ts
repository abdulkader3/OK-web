import { Ledger } from '@/services/ledgerService';
import { Payment } from '@/services/paymentService';

export interface LedgerPDFTranslations {
  'ledger.pdf.title': string;
  'ledger.pdf.totalLent': string;
  'ledger.pdf.totalBorrowed': string;
  'ledger.pdf.netBalance': string;
  'ledger.pdf.balance': string;
  'ledger.pdf.dueDate': string;
  'ledger.pdf.priority': string;
  'ledger.pdf.status': string;
  'ledger.pdf.pending': string;
  'ledger.pdf.settled': string;
  'ledger.pdf.low': string;
  'ledger.pdf.medium': string;
  'ledger.pdf.high': string;
  'ledger.pdf.generatedOn': string;
  'ledger.pdf.totalRecords': string;
  'ledger.pdf.total': string;
  'ledger.pdf.detailTitle': string;
  'ledger.pdf.initialAmount': string;
  'ledger.pdf.totalAmount': string;
  'ledger.pdf.outstandingBalance': string;
  'ledger.pdf.totalPaid': string;
  'ledger.pdf.paymentHistory': string;
  'ledger.pdf.paymentDate': string;
  'ledger.pdf.paymentType': string;
  'ledger.pdf.paymentAmount': string;
  'ledger.pdf.paymentMethod': string;
  'ledger.pdf.recordedBy': string;
  'ledger.pdf.payment': string;
  'ledger.pdf.adjustment': string;
  'ledger.pdf.refund': string;
  'ledger.pdf.cash': string;
  'ledger.pdf.bank': string;
  'ledger.pdf.other': string;
  'ledger.pdf.noPayments': string;
  'ledger.pdf.createdOn': string;
  'ledger.pdf.notes': string;
  'ledger.pdf.tags': string;
  'common.name': string;
  'common.type': string;
  'common.amount': string;
}

interface LedgerSummary {
  totalLent: number;
  totalBorrowed: number;
  netBalance: number;
}

export function calculateSummary(ledgers: Ledger[]): LedgerSummary {
  const totalLent = ledgers
    .filter(l => l.type === 'i_owe')
    .reduce((sum, l) => sum + l.initialAmount, 0);
  
  const totalBorrowed = ledgers
    .filter(l => l.type === 'owes_me')
    .reduce((sum, l) => sum + l.initialAmount, 0);

  return {
    totalLent,
    totalBorrowed,
    netBalance: totalLent - totalBorrowed,
  };
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatus(outstandingBalance: number, t: LedgerPDFTranslations): string {
  return outstandingBalance === 0 ? t['ledger.pdf.settled'] : t['ledger.pdf.pending'];
}

function getPriority(priority: string, t: LedgerPDFTranslations): string {
  switch (priority) {
    case 'low': return t['ledger.pdf.low'];
    case 'medium': return t['ledger.pdf.medium'];
    case 'high': return t['ledger.pdf.high'];
    default: return priority;
  }
}

function getTypeLabel(type: string, t: LedgerPDFTranslations): string {
  return type === 'i_owe' ? t['ledger.pdf.totalLent'] : t['ledger.pdf.totalBorrowed'];
}

export function generateLedgerPDFHtml(
  ledgers: Ledger[], 
  summary: LedgerSummary, 
  t: LedgerPDFTranslations,
  currency: string = 'BDT'
): string {
  const rows = ledgers.map(ledger => {
    const typeLabel = getTypeLabel(ledger.type, t);
    const amountColor = ledger.type === 'i_owe' ? '#11d452' : '#E85D3A';
    const statusColor = ledger.outstandingBalance === 0 ? '#11d452' : '#F5A623';
    
    return `
      <tr>
        <td>${ledger.counterpartyName}</td>
        <td style="color: ${amountColor}; font-weight: 600;">${typeLabel}</td>
        <td>${formatCurrency(ledger.initialAmount, ledger.currency)}</td>
        <td>${formatCurrency(ledger.outstandingBalance, ledger.currency)}</td>
        <td>${formatDate(ledger.dueDate)}</td>
        <td>${getPriority(ledger.priority, t)}</td>
        <td style="color: ${statusColor};">${getStatus(ledger.outstandingBalance, t)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${t['ledger.pdf.title']}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1C2D3A;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1C2D3A;
          }
          .header h1 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 20px;
          }
          .summary-card {
            flex: 1;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .summary-card.lent {
            background: #E8FDF5;
          }
          .summary-card.borrowed {
            background: #FEF3E8;
          }
          .summary-card.net {
            background: #E8F5F5;
          }
          .summary-card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .summary-card .amount {
            font-size: 24px;
            font-weight: bold;
          }
          .summary-card.lent .amount {
            color: #11d452;
          }
          .summary-card.borrowed .amount {
            color: #E85D3A;
          }
          .summary-card.net .amount {
            color: #2ABFBF;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #1C2D3A;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
          }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          .total-row {
            font-weight: bold;
            background: #f0f0f0 !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t['ledger.pdf.title']}</h1>
          <p>${t['ledger.pdf.generatedOn']} ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="summary">
          <div class="summary-card lent">
            <h3>${t['ledger.pdf.totalLent']}</h3>
            <div class="amount">${formatCurrency(summary.totalLent, currency)}</div>
          </div>
          <div class="summary-card borrowed">
            <h3>${t['ledger.pdf.totalBorrowed']}</h3>
            <div class="amount">${formatCurrency(summary.totalBorrowed, currency)}</div>
          </div>
          <div class="summary-card net">
            <h3>${t['ledger.pdf.netBalance']}</h3>
            <div class="amount">${formatCurrency(summary.netBalance, currency)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t['common.name']}</th>
              <th>${t['common.type']}</th>
              <th>${t['common.amount']}</th>
              <th>${t['ledger.pdf.balance']}</th>
              <th>${t['ledger.pdf.dueDate']}</th>
              <th>${t['ledger.pdf.priority']}</th>
              <th>${t['ledger.pdf.status']}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="2"><strong>${t['ledger.pdf.total']}</strong></td>
              <td><strong>${formatCurrency(summary.totalLent + summary.totalBorrowed, currency)}</strong></td>
              <td><strong>${formatCurrency(ledgers.reduce((sum, l) => sum + l.outstandingBalance, 0), currency)}</strong></td>
              <td colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>${t['ledger.pdf.totalRecords']}: ${ledgers.length}</p>
        </div>
      </body>
    </html>
  `;
}

function getPaymentTypeLabel(type: string, t: LedgerPDFTranslations): string {
  switch (type) {
    case 'payment': return t['ledger.pdf.payment'];
    case 'adjustment': return t['ledger.pdf.adjustment'];
    case 'refund': return t['ledger.pdf.refund'];
    default: return type;
  }
}

function getPaymentMethodLabel(method: string, t: LedgerPDFTranslations): string {
  switch (method) {
    case 'cash': return t['ledger.pdf.cash'];
    case 'bank': return t['ledger.pdf.bank'];
    case 'other': return t['ledger.pdf.other'];
    default: return method;
  }
}

export function generateLedgerDetailPDFHtml(
  ledger: Ledger,
  payments: Payment[],
  t: LedgerPDFTranslations,
  currency: string = 'BDT'
): string {
  // Sort by recordedAt to get the first transaction (stable ordering)
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  
  const firstEntry = sortedPayments.length > 0 ? sortedPayments[0] : null;
  const initialAmount = firstEntry ? Math.abs(firstEntry.amount) : 0;
  
  const totalPaid = payments
    .filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + p.amount, 0);
    
  // Total adjustments (excluding the first entry if it's the initial)
  const totalAdjustments = sortedPayments
    .filter((p, index) => p.type === 'adjustment' && index > 0)
    .reduce((sum, p) => sum + p.amount, 0);
    
  const totalAmount = initialAmount + totalAdjustments;
    
  const outstanding = totalAmount - totalPaid;
  
  const typeLabel = getTypeLabel(ledger.type, t);
  const typeColor = ledger.type === 'i_owe' ? '#11d452' : '#E85D3A';
  const statusColor = outstanding === 0 ? '#11d452' : '#F5A623';

  const paymentRows = payments.map(payment => `
    <tr>
      <td>${formatDate(payment.recordedAt)}</td>
      <td>${getPaymentTypeLabel(payment.type, t)}</td>
      <td>${formatCurrency(payment.amount, ledger.currency)}</td>
      <td>${getPaymentMethodLabel(payment.method, t)}</td>
      <td>${payment.recordedBy?.name || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${t['ledger.pdf.detailTitle']}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1C2D3A;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #1C2D3A;
          }
          .header h1 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .header .type-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            background: ${typeColor};
            margin-bottom: 10px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h2 {
            font-size: 18px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .summary-grid {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
          }
          .summary-card {
            flex: 1;
            padding: 15px;
            border-radius: 8px;
            background: #f8f9fa;
          }
          .summary-card label {
            display: block;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .summary-card .value {
            font-size: 20px;
            font-weight: bold;
          }
          .summary-card.initial .value {
            color: #1C2D3A;
          }
          .summary-card.total .value {
            color: #1C2D3A;
          }
          .summary-card.paid .value {
            color: #11d452;
          }
          .summary-card.outstanding .value {
            color: #E85D3A;
          }
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .detail-item {
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
          }
          .detail-item label {
            display: block;
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .detail-item .value {
            font-size: 14px;
            font-weight: 500;
          }
          .notes {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-top: 15px;
          }
          .notes label {
            display: block;
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          .notes p {
            font-size: 14px;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: #1C2D3A;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .no-payments {
            text-align: center;
            padding: 30px;
            color: #999;
            font-style: italic;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${ledger.counterpartyName}</h1>
          <span class="type-badge">${typeLabel}</span>
          <p>${t['ledger.pdf.generatedOn']} ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="section">
          <div class="summary-grid">
            <div class="summary-card initial">
              <label>${t['ledger.pdf.initialAmount']}</label>
              <div class="value">${formatCurrency(initialAmount, ledger.currency)}</div>
            </div>
            <div class="summary-card total">
              <label>${t['ledger.pdf.totalAmount']}</label>
              <div class="value">${formatCurrency(totalAmount, ledger.currency)}</div>
            </div>
            <div class="summary-card paid">
              <label>${t['ledger.pdf.totalPaid']}</label>
              <div class="value">${formatCurrency(totalPaid, ledger.currency)}</div>
            </div>
            <div class="summary-card outstanding">
              <label>${t['ledger.pdf.outstandingBalance']}</label>
              <div class="value">${formatCurrency(outstanding, ledger.currency)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Details</h2>
          <div class="details-grid">
            <div class="detail-item">
              <label>${t['ledger.pdf.dueDate']}</label>
              <div class="value">${formatDate(ledger.dueDate)}</div>
            </div>
            <div class="detail-item">
              <label>${t['ledger.pdf.priority']}</label>
              <div class="value">${getPriority(ledger.priority, t)}</div>
            </div>
            <div class="detail-item">
              <label>${t['ledger.pdf.status']}</label>
              <div class="value" style="color: ${statusColor};">${getStatus(outstanding, t)}</div>
            </div>
            <div class="detail-item">
              <label>${t['ledger.pdf.createdOn']}</label>
              <div class="value">${formatDate(ledger.createdAt)}</div>
            </div>
          </div>
          ${ledger.notes ? `
            <div class="notes">
              <label>${t['ledger.pdf.notes']}</label>
              <p>${ledger.notes}</p>
            </div>
          ` : ''}
          ${ledger.tags && ledger.tags.length > 0 ? `
            <div class="notes">
              <label>${t['ledger.pdf.tags']}</label>
              <p>${ledger.tags.join(', ')}</p>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h2>${t['ledger.pdf.paymentHistory']}</h2>
          ${payments.length === 0 ? `
            <div class="no-payments">${t['ledger.pdf.noPayments']}</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>${t['ledger.pdf.paymentDate']}</th>
                  <th>${t['ledger.pdf.paymentType']}</th>
                  <th>${t['ledger.pdf.paymentAmount']}</th>
                  <th>${t['ledger.pdf.paymentMethod']}</th>
                  <th>${t['ledger.pdf.recordedBy']}</th>
                </tr>
              </thead>
              <tbody>
                ${paymentRows}
              </tbody>
            </table>
          `}
        </div>

        <div class="footer">
          <p>${t['ledger.pdf.totalRecords']}: ${payments.length}</p>
        </div>
      </body>
    </html>
  `;
}
