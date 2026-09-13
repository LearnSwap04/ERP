import PDFDocument from 'pdfkit';

type PdfDoc = InstanceType<typeof PDFDocument>;

function docToBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

interface HeaderInfo {
  student: string;
  rollNo: string;
  branch: string;
  semester: number;
}

function header(doc: PdfDoc, title: string, info: HeaderInfo) {
  doc.fontSize(18).text('Student ERP', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(14).text(title, { align: 'center' });
  doc.moveDown(0.8);
  doc.fontSize(10).text(`Name: ${info.student}   |   Roll No: ${info.rollNo}`);
  doc.text(`Branch: ${info.branch}   |   Semester: ${info.semester}`);
  doc.moveDown(0.5);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.8);
}

/** Fee payment receipt PDF. */
export async function feeReceiptPdf(
  info: HeaderInfo,
  item: { title: string; amount: number; paidAt: Date; receiptNo: string },
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48 });
  header(doc, 'Fee Payment Receipt', info);
  doc.fontSize(12).text(`Receipt No: ${item.receiptNo}`);
  doc.text(`Paid On: ${item.paidAt.toISOString().slice(0, 10)}`);
  doc.moveDown(0.5);
  doc.text(`Fee Item:`).fontSize(12).text(`   ${item.title}`);
  doc.moveDown(0.5);
  doc.text(`Amount Paid: Rs. ${item.amount.toLocaleString('en-IN')}`);
  doc.moveDown(0.5);
  doc.fontSize(9).text('This is a computer generated receipt and does not require a signature.', { oblique: true });
  doc.end();
  return docToBuffer(doc);
}

/** Bonafide certificate PDF. */
export async function bonafidePdf(
  info: HeaderInfo,
  opts: { requestId: string; issuedOn: Date; note?: string },
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48 });
  header(doc, 'Bonafide Certificate', info);
  doc.fontSize(11).text(
    `This is to certify that ${info.student}, bearing Roll No. ${info.rollNo}, is a bona fide student of the ${info.branch} programme (Semester ${info.semester}) at Student ERP Institute for the current academic year.`,
  );
  if (opts.note) {
    doc.moveDown(0.5);
    doc.text(`Purpose: ${opts.note}`);
  }
  doc.moveDown(1.5);
  doc.text(`Request ID: ${opts.requestId}`);
  doc.text(`Issued On: ${opts.issuedOn.toISOString().slice(0, 10)}`);
  doc.moveDown(0.5);
  doc.fontSize(9).text('This document is issued electronically and carries no signature.', { oblique: true });
  doc.end();
  return docToBuffer(doc);
}

/** Transcript (grade card) PDF. */
export async function transcriptPdf(
  info: HeaderInfo,
  semesters: Array<{ semester: number; sgpa: number }>,
  cgpa: number,
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 48 });
  header(doc, 'Transcript', info);
  semesters.forEach((s) => {
    doc.fontSize(11).text(`Semester ${s.semester}:  SGPA ${s.sgpa.toFixed(2)}`);
  });
  doc.moveDown(0.8);
  doc.fontSize(12).text(`Cumulative GPA (CGPA): ${cgpa.toFixed(2)}`);
  doc.moveDown(0.5);
  doc.fontSize(9).text('This document is issued electronically and carries no signature.', { oblique: true });
  doc.end();
  return docToBuffer(doc);
}