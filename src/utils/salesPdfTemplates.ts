import { Sale, SaleItem } from "@/services/salesApi";

export interface SalesPDFTranslations {
  "sales.pdf.title": string;
  "sales.pdf.dateRange": string;
  "sales.pdf.totalSales": string;
  "sales.pdf.transactions": string;
  "sales.pdf.paidSales": string;
  "sales.pdf.creditSales": string;
  "sales.pdf.generatedOn": string;
  "sales.pdf.items": string;
  "sales.pdf.quantity": string;
  "sales.pdf.price": string;
  "sales.pdf.subtotal": string;
  "sales.pdf.paymentStatus": string;
  "sales.pdf.paid": string;
  "sales.pdf.notPaid": string;
  "sales.pdf.customer": string;
  "sales.pdf.allTime": string;
  "common.date": string;
  "common.amount": string;
  "sales.pdf.cash": string;
  "sales.pdf.card": string;
}

export interface SalesSummaryData {
  dateRange: {
    from: string | null;
    to: string | null;
  };
  totalAmount: number;
  totalTransactions: number;
  paidTransactions: number;
  unpaidTransactions: number;
  paidAmount: number;
  unpaidAmount: number;
}

function formatCurrency(amount: number, symbol: string = "৳"): string {
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calculateSalesSummary(sales: Sale[]): SalesSummaryData {
  const totalAmount = sales.reduce(
    (sum, s) => sum + (s.totalAmount || s.total || 0),
    0,
  );
  const creditSales = sales.filter((s) => s.paymentStatus === "not_paid");
  const cashSales = sales.filter((s) => s.paymentStatus === "paid");

  return {
    dateRange: {
      from:
        sales.length > 0
          ? sales[sales.length - 1].createdAt.split("T")[0]
          : null,
      to: sales.length > 0 ? sales[0].createdAt.split("T")[0] : null,
    },
    totalAmount,
    totalTransactions: sales.length,
    paidTransactions: cashSales.length,
    unpaidTransactions: creditSales.length,
    paidAmount: cashSales.reduce(
      (sum, s) => sum + (s.totalAmount || s.total || 0),
      0,
    ),
    unpaidAmount: creditSales.reduce(
      (sum, s) => sum + (s.totalAmount || s.total || 0),
      0,
    ),
  };
}

export function generateSalesPDFHtml(
  sales: Sale[],
  summary: SalesSummaryData,
  translations: SalesPDFTranslations,
  currency: string = 'BDT',
  dateFrom?: string,
  dateTo?: string,
): string {
  const dateRangeText =
    dateFrom && dateTo
      ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
      : dateFrom
        ? `${formatDate(dateFrom)} - ${translations["sales.pdf.allTime"] || "Present"}`
        : "All Time";

  const salesRows = sales
    .map(
      (sale) => `
    <tr>
      <td style="font-weight:500">${formatDateTime(sale.createdAt)}</td>
      <td>
        ${(sale.items || []).map((item) => `<div>${item.name || item.productName || "Item"} x${item.quantity}</div>`).join("")}
      </td>
      <td style="text-align:right">${formatCurrency(sale.totalAmount || sale.total || 0, currency)}</td>
      <td>
        <span style="padding:3px 8px;border-radius:12px;font-size:10px;font-weight:500;background:${sale.paymentStatus === "not_paid" ? "#fef2f2" : "#f0fdf4"};color:${sale.paymentStatus === "not_paid" ? "#dc2626" : "#16a34a"}">
          ${sale.paymentStatus === "not_paid" 
            ? translations["sales.pdf.notPaid"] 
            : `${sale.paymentMethod === 'cash' ? translations["sales.pdf.cash"] : translations["sales.pdf.card"]}`
          }
        </span>
      </td>
      <td>${sale.ledgerName || "-"}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${translations["sales.pdf.title"]}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; display: flex; justify-content: center; }
        
        .receipt {
          width: 100%;
          max-width: 800px;
          background: #ffffff;
          margin: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          padding: 24px;
          color: #111827;
        }
        
        .center { text-align: center; }
        .bold { font-weight: 600; }
        .small { font-size: 12px; color: #6b7280; }
        
        .header h1 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        
        .divider {
          border-top: 1px dashed #d1d5db;
          margin: 14px 0;
        }
        
        .date-range {
          font-size: 13px;
          color: #6b7280;
          margin-top: 6px;
        }
        
        .summary-grid { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr); 
          gap: 10px; 
          margin-bottom: 20px; 
        }
        
        .summary-card { 
          background: #f9fafb; 
          padding: 14px 12px; 
          border-radius: 6px; 
          text-align: center; 
          border: 1px solid #e5e7eb;
        }
        .summary-card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; }
        .summary-card .value { font-size: 18px; font-weight: bold; color: #111827; }
        .summary-card.highlight { background: #eff6ff; border-color: #bfdbfe; }
        .summary-card.highlight .value { color: #2563eb; }
        .summary-card.credit { background: #fef2f2; border-color: #fecaca; }
        .summary-card.credit .value { color: #dc2626; }
        .summary-card.paid { background: #f0fdf4; border-color: #bbf7d0; }
        .summary-card.paid .value { color: #16a34a; }
        
        .section-title { 
          font-size: 14px; 
          font-weight: 600; 
          color: #374151; 
          margin-bottom: 12px; 
          padding-bottom: 8px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        th { 
          background: #f9fafb; 
          padding: 10px 8px; 
          text-align: left; 
          font-weight: 600; 
          color: #374151; 
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
          text-transform: uppercase;
        }
        td { 
          padding: 10px 8px; 
          border-bottom: 1px dashed #e5e7eb; 
          vertical-align: top; 
        }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background: #fafafa; }
        
        .footer { 
          text-align: center; 
          margin-top: 20px; 
          padding-top: 16px; 
          border-top: 1px dashed #d1d5db; 
          color: #6b7280; 
          font-size: 11px; 
        }
        
        @media print {
          body { background: #fff; }
          .receipt { box-shadow: none; margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        
        <!-- Header -->
        <div class="header center">
          <h1>Sifat Al Nadaa Laundry</h1>
          <div class="small">Ash Shifa, Riyadh14721, KSA</div>
          <div class="small">Mobile: 0550328205</div>
          <div class="small">CR No: 7033023537</div>
          <div class="date-range">${translations["sales.pdf.dateRange"]}: ${dateRangeText}</div>
        </div>
        
        <div class="divider"></div>
        
        <!-- Summary Grid -->
        <div class="summary-grid">
          <div class="summary-card highlight">
            <div class="label">${translations["sales.pdf.totalSales"]}</div>
            <div class="value">${formatCurrency(summary.totalAmount, currency)}</div>
          </div>
          <div class="summary-card">
            <div class="label">${translations["sales.pdf.transactions"]}</div>
            <div class="value">${summary.totalTransactions}</div>
          </div>
          <div class="summary-card paid">
            <div class="label">${translations["sales.pdf.paidSales"]}</div>
            <div class="value">${summary.paidTransactions}</div>
          </div>
          <div class="summary-card credit">
            <div class="label">${translations["sales.pdf.creditSales"]}</div>
            <div class="value">${summary.unpaidTransactions}</div>
          </div>
        </div>
        
        <div class="section-title">${translations["sales.pdf.transactions"]}</div>
        
        <!-- Transactions Table -->
        <table>
          <thead>
            <tr>
              <th>${translations["common.date"]}</th>
              <th>${translations["sales.pdf.items"]}</th>
              <th style="text-align:right">${translations["common.amount"]}</th>
              <th>${translations["sales.pdf.paymentStatus"]}</th>
              <th>${translations["sales.pdf.customer"]}</th>
            </tr>
          </thead>
          <tbody>
            ${salesRows}
          </tbody>
        </table>
        
        <!-- Footer -->
        <div class="footer">
          <div>${translations["sales.pdf.generatedOn"]}: ${new Date().toLocaleString()}</div>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

export interface SingleSalePDFTranslations {
  "sales.receipt": string;
  "sales.pdf.total": string;
  "sales.pdf.items": string;
  "sales.pdf.quantity": string;
  "sales.pdf.price": string;
  "sales.pdf.subtotal": string;
  "sales.pdf.paymentMethod": string;
  "sales.pdf.cash": string;
  "sales.pdf.card": string;
  "sales.pdf.customer": string;
  "common.date": string;
  "sales.pdf.deliveryDate"?: string;
  "sales.pdf.invoiceNo"?: string;
  "sales.pdf.vat"?: string;
  "sales.pdf.netTotal"?: string;
  "sales.pdf.temporaryBill"?: string;
  "sales.pdf.unpaid"?: string;
  "sales.pdf.paid"?: string;
  "sales.pdf.balance"?: string;
  "sales.pdf.admin"?: string;
  "sales.pdf.printedAt"?: string;
  "sales.pdf.thankYou"?: string;
  "sales.pdf.visitAgain"?: string;
  "sales.pdf.status"?: string;
  "sales.pdf.itemsCount"?: string;
}

export function generateSingleSalePDFHtml(
  sale: Sale,
  translations: SingleSalePDFTranslations,
  symbol: string = "৳"
): string {
  const saleDate = sale.createdAt ? new Date(sale.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) : new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const printDate = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const deliveryDate = (sale as any).deliveryDate ? new Date((sale as any).deliveryDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }) : saleDate;

  const invoiceNo = (sale as any).invoiceNumber || sale._id?.slice(-6) || "N/A";

  const paymentMethodLabel =
    !sale.ledgerId && sale.paymentMethod === "cash"
      ? translations["sales.pdf.cash"] || "Cash"
      : !sale.ledgerId && sale.paymentMethod === "card"
        ? translations["sales.pdf.card"] || "Card"
        : sale.ledgerName
          ? translations["sales.pdf.customer"] || "Customer"
          : "—";

  const isPaid = sale.ledgerId ? false : sale.paymentStatus !== "not_paid";

  const itemsRows = (sale.items || [])
    .map(
      (item) => `
      <div class="table-row">
        <div>${item.productName || item.name || "Item"}</div>
        <div>${item.quantity}</div>
        <div>${(item.productPrice || item.price || 0).toFixed(2)}</div>
        <div>0.00</div>
        <div>${(item.subtotal || (item.quantity * (item.productPrice || item.price || 0))).toFixed(2)}</div>
      </div>
    `
    )
    .join("");

  const totalAmount = sale.totalAmount || sale.total || 0;
  const totalFormatted = `${symbol} ${totalAmount.toFixed(2)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: monospace;
      background: #f3f4f6;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .receipt {
      width: 300px;
      background: #fff;
      padding: 15px 10px;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 11px;
      margin-bottom: 3px;
    }
    .small { font-size: 10px; }
    .space { margin: 10px 0; }
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 5px 0;
    }
    .table {
      width: 100%;
      margin-top: 12px;
      font-size: 11px;
    }
    .table-header {
      display: grid;
      grid-template-columns: 2fr 0.8fr 1fr 0.8fr 1fr;
      font-weight: bold;
      border-bottom: 2px dashed #000;
      padding-bottom: 5px;
      font-size: 11px;
    }
    .table-row {
      display: grid;
      grid-template-columns: 2fr 0.8fr 1fr 0.8fr 1fr;
      margin-top: 8px;
      font-size: 11px;
    }
    .line {
      border-top: 2px dashed #000;
      margin: 10px 0;
    }
    .big-total {
      font-size: 14px;
      font-weight: bold;
    }
    .barcode {
      text-align: center;
      font-size: 18px;
      margin: 15px 0;
      letter-spacing: 2px;
    }
    .footer-text {
      font-size: 10px;
    }
    @media print {
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body {
        background: #fff;
        padding: 0;
        display: block;
      }
      .receipt {
        width: 100%;
        max-width: 300px;
        margin: 0;
        padding: 10px;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>

  <div class="receipt">

    <div class="center">
      <div class="title">Sifat Al Nadaa Laundry</div>
      <div class="subtitle">Ash Shifa, Riyadh14721, KSA</div>
      <div class="subtitle">Mobile: 0550328205</div>
      <div class="subtitle">CR No: 7033023537</div>
      <div class="bold space">Inv. No : ${invoiceNo}</div>
    </div>

    <div class="row"><span>Date :</span><span>${saleDate}</span></div>
    <div class="row"><span>Delivery Date :</span><span>${deliveryDate}</span></div>
    ${sale.ledgerName ? `<div class="row"><span>Customer :</span><span>${sale.ledgerName}</span></div>` : ''}
    <div class="row"><span></span><span>${paymentMethodLabel}</span></div>

    <div class="table">
      <div class="table-header">
        <div>Item</div>
        <div>Qty</div>
        <div>Price</div>
        <div>VAT</div>
        <div>Total</div>
      </div>

      ${itemsRows}
    </div>

    <div class="line"></div>

    <div class="row bold big-total"><span>Net Total :</span><span>${totalAmount.toFixed(2)}</span></div>
    <div class="row bold big-total"><span>Total</span><span>${totalFormatted}</span></div>

    <div class="line"></div>

    <div class="row"><span>Items :</span><span>${sale.items?.length ?? 0}</span></div>

    <div class="row">
      <span>Temporary Bill</span>
      <span>Status : ${isPaid ? (translations["sales.pdf.paid"] || "Paid") : (translations["sales.pdf.unpaid"] || "Unpaid")}</span>
    </div>

    <div class="row"><span>Balance</span><span>0.00</span></div>

    <div class="barcode">*${invoiceNo.replace(/[^a-zA-Z0-9]/g, "")}*</div>

    <div class="row small footer-text"><span>Admin</span><span>Print: ${printDate}</span></div>

    <div class="center small space footer-text">
      ${translations["sales.pdf.thankYou"] || "Thank you"}<br>
      ${translations["sales.pdf.visitAgain"] || "Visit Again"}
    </div>

  </div>

</body>
</html>
  `;
}
