/**
 * A lightweight, dependency-free PDF generator that produces a valid PDF file
 * representing the invoice, proforma invoice, or delivery challan.
 */
export function generateInvoicePdf(docType: string, docData: any): Buffer {
  const companyName = escapePdfText(docData.companyName || "ERP Workspace");
  const docNo = escapePdfText(docData.invoiceNo || docData.challanNo || "DOC-0000");
  const dateStr = escapePdfText(docData.date ? new Date(docData.date).toLocaleDateString() : new Date().toLocaleDateString());
  const customerName = escapePdfText(docData.customerName || docData.customer?.name || "Client Name");
  const currencySymbol = docData.currencySymbol || "$";
  const items = docData.items || [];

  // Start assembling the PDF text commands
  const streamLines: string[] = [
    "BT",
    "/F1 16 Tf",
    "70 780 Td",
    `(${companyName}) Tj`,
    "/F1 12 Tf",
    "0 -25 Td",
    `(${docType.toUpperCase()}: ${docNo}) Tj`,
    "0 -18 Td",
    `(Date: ${dateStr}) Tj`,
    "0 -18 Td",
    `(Customer: ${customerName}) Tj`,
    "0 -30 Td",
    "/F1 10 Tf",
    "(--------------------------------------------------------------------------------) Tj",
    "0 -18 Td",
    "(Description                     Qty       Price       Discount     Total) Tj",
    "0 -12 Td",
    "(--------------------------------------------------------------------------------) Tj",
  ];

  let yOffset = 640; // track height to make sure we don't overflow (basic single-page limit)
  for (const item of items) {
    if (yOffset < 150) break; // page limit check
    const prodName = (item.product?.name || item.productId || "Item").slice(0, 28).padEnd(28, " ");
    const qty = String(item.quantity).padStart(8, " ");
    
    // Formatting amounts
    const priceVal = `${currencySymbol}${Number(item.price).toFixed(2)}`.padStart(11, " ");
    const discVal = `${Number(item.discount).toFixed(1)}%`.padStart(11, " ");
    
    const itemSub = item.quantity * item.price;
    const itemDisc = itemSub * ((item.discount || 0) / 100);
    const totalVal = `${currencySymbol}${Number(itemSub - itemDisc).toFixed(2)}`.padStart(14, " ");

    const lineText = `${prodName} ${qty} ${priceVal} ${discVal} ${totalVal}`;
    streamLines.push("0 -15 Td", `(${escapePdfText(lineText)}) Tj`);
    yOffset -= 15;
  }

  // Calculate discount total
  let subtotal = Number(docData.subtotal) || 0;
  let discountVal = 0;
  if (docData.discountType === 'AMOUNT') {
    discountVal = Number(docData.discount) || 0;
  } else {
    discountVal = subtotal * ((Number(docData.discount) || 0) / 100);
  }

  streamLines.push(
    "0 -20 Td",
    "(--------------------------------------------------------------------------------) Tj",
    "0 -18 Td",
    `(${padRight("Subtotal:", 55)}${currencySymbol}${subtotal.toFixed(2).padStart(12, " ")}) Tj`,
    "0 -15 Td",
    `(${padRight("Discount:", 55)}-${currencySymbol}${discountVal.toFixed(2).padStart(12, " ")}) Tj`,
    "0 -15 Td",
    `(${padRight("Tax (GST):", 55)}+${currencySymbol}${Number(docData.tax || 0).toFixed(2).padStart(12, " ")}) Tj`,
    "0 -15 Td",
    `(${padRight("Grand Total:", 55)}${currencySymbol}${Number(docData.total || 0).toFixed(2).padStart(12, " ")}) Tj`,
    "0 -20 Td",
    "(--------------------------------------------------------------------------------) Tj",
    "0 -30 Td",
    "(/F1 9 Tf)",
    "(Thank you for your valuable corporate business!) Tj",
    "ET"
  );

  const content = streamLines.join("\n");
  const streamLength = Buffer.byteLength(content, "utf-8");

  // Construct PDF Objects
  const objects: string[] = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595.28 841.89] /Contents 5 0 R >>\nendobj`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj`, // Using Courier for monospaced table alignment
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${content}\nendstream\nendobj`
  ];

  const pdfHeader = "%PDF-1.4\n";
  let currentOffset = pdfHeader.length;
  const offsets: number[] = [];
  const objectBuffers: Buffer[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    const objBuf = Buffer.from(objects[i] + "\n", "utf-8");
    objectBuffers.push(objBuf);
    currentOffset += objBuf.length;
  }

  // Cross-reference table
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  const xrefOffset = currentOffset;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  // Concatenate all parts
  return Buffer.concat([
    Buffer.from(pdfHeader, "utf-8"),
    ...objectBuffers,
    Buffer.from(xref, "utf-8"),
    Buffer.from(trailer, "utf-8")
  ]);
}

/**
 * Escapes special PDF characters (parentheses and backslashes).
 */
function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, "\\$&");
}

function padRight(str: string, length: number): string {
  return str.padEnd(length, " ");
}
