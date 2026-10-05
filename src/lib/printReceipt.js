/**
 * Small receipt printer helper for Gian's Foodhouse
 * Prints clean, compact 72mm thermal-slip format (not a stretched whole bondpaper).
 * Works on both thermal POS roll printers (80mm/58mm) and standard A4/Letter bondpaper.
 */

export const printReceiptSlip = (elementId = 'printable-receipt') => {
  const receiptElement = document.getElementById(elementId);
  if (!receiptElement) {
    window.print();
    return;
  }

  // Create an isolated hidden iframe for clean, small receipt printing
  const printFrame = document.createElement('iframe');
  printFrame.setAttribute(
    'style',
    'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;'
  );
  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow || printFrame.contentDocument;
  const doc = frameDoc.document || frameDoc;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Gian's Foodhouse Receipt</title>
        <style>
          @page {
            size: 72mm 185mm;
            margin: 2mm 3mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            background: #fff;
            color: #000;
            margin: 0 auto;
            padding: 2mm;
            width: 70mm;
            max-width: 70mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .receipt-paper {
            background: #fff !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            width: 70mm !important;
            max-width: 70mm !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 6px;
          }
          .receipt-logo {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .receipt-sub {
            font-size: 10px;
            color: #333;
            line-height: 1.25;
          }
          .receipt-divider {
            color: #444;
            margin: 5px 0;
            text-align: center;
            letter-spacing: 1px;
            overflow: hidden;
            font-size: 10px;
          }
          .receipt-meta {
            font-size: 10.5px;
            line-height: 1.35;
          }
          .receipt-meta div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1px;
          }
          .receipt-items-table {
            display: flex;
            flex-direction: column;
            gap: 3px;
            margin: 5px 0;
          }
          .receipt-table-header {
            display: grid;
            grid-template-columns: 1fr 30px 58px;
            font-weight: bold;
            font-size: 10.5px;
            border-bottom: 1px dashed #555;
            padding-bottom: 2px;
          }
          .receipt-item-row {
            display: grid;
            grid-template-columns: 1fr 30px 58px;
            font-size: 10.5px;
            line-height: 1.25;
          }
          .receipt-item-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: normal;
            word-break: break-word;
          }
          .receipt-totals {
            display: flex;
            flex-direction: column;
            gap: 2.5px;
            font-size: 10.5px;
            margin-top: 3px;
          }
          .receipt-total-row {
            display: flex;
            justify-content: space-between;
          }
          .receipt-total-row.final {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px dashed #333;
            border-bottom: 1px dashed #333;
            padding: 3px 0;
            margin: 2px 0;
          }
          .receipt-footer {
            text-align: center;
            font-size: 10px;
            color: #444;
            margin-top: 6px;
            line-height: 1.25;
          }
          img {
            max-width: 36px;
            height: auto;
            margin: 0 auto 3px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        ${receiptElement.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      const frameWindow = printFrame.contentWindow;
      frameWindow.focus();
      frameWindow.print();
    } catch (err) {
      console.error('Print iframe error, fallback to window.print', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (printFrame.parentNode) {
          printFrame.parentNode.removeChild(printFrame);
        }
      }, 2500);
    }
  }, 250);
};

export default printReceiptSlip;
