import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Settings, Receipt } from '../types';

export async function generateReceiptPDF(receipt: Receipt, settings: Settings): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette
  const primaryColor = [30, 58, 95]; // Navy Blue (#1E3A5F)
  const accentColor = [255, 193, 7];  // Amber (#FFC107)
  const textColor = [38, 50, 56];    // Dark Gray (#263238)

  // 1. KOP INSTANSI (Header)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.namaInstansi.toUpperCase(), 105, 20, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(settings.namaPtsp.toUpperCase(), 105, 26, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  const contactText = `Alamat: ${settings.alamat} | Telp: ${settings.telepon}`;
  doc.text(contactText, 105, 31, { align: 'center' });
  const emailPart = settings.email ? `Email: ${settings.email}` : '';
  const webPart = settings.website ? `Website: ${settings.website}` : '';
  const webEmailText = [emailPart, webPart].filter(Boolean).join(' | ');
  doc.text(webEmailText, 105, 35, { align: 'center' });

  // Divider Line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.line(15, 38, 195, 38);
  
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setLineWidth(0.4);
  doc.line(15, 39.5, 195, 39.5);

  // 2. DOCUMENT TITLE
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('TANDA TERIMA DOKUMEN RESMI', 105, 50, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Nomor: ${receipt.nomorTandaTerima}`, 105, 55, { align: 'center' });

  // 3. SENDER INFORMATION BLOCK
  doc.setFillColor(245, 247, 250); // Light Gray Background (#F5F7FA)
  doc.rect(15, 62, 180, 32, 'F');
  doc.setDrawColor(220, 224, 230);
  doc.setLineWidth(0.2);
  doc.rect(15, 62, 180, 32, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INFORMASI PENGIRIM', 20, 68);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Nama Pengirim`, 20, 74);
  doc.text(`:  ${receipt.pengirimNama}`, 55, 74);

  doc.text(`Instansi/Perusahaan`, 20, 80);
  doc.text(`:  ${receipt.pengirimInstansi}`, 55, 80);

  doc.text(`No. Handphone`, 20, 86);
  doc.text(`:  ${receipt.pengirimNomorHp}  |  Email: ${receipt.pengirimEmail}`, 55, 86);

  // 4. LETTERS TABLE
  const startY = 102;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DAFTAR DOKUMEN / SURAT YANG DISERAHKAN', 15, startY - 3);

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, startY, 180, 8, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 19, startY + 5.5);
  doc.text('Nomor Surat', 32, startY + 5.5);
  doc.text('Tanggal Surat', 75, startY + 5.5);
  doc.text('Perihal / Perihal Surat', 110, startY + 5.5);

  // Table Body Rows
  let currentY = startY + 8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  
  receipt.suratList.forEach((letter, index) => {
    // Row background toggle style
    if (index % 2 === 1) {
      doc.setFillColor(248, 249, 250);
      doc.rect(15, currentY, 180, 8, 'F');
    }
    // Draw outer row boundaries
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(15, currentY + 8, 195, currentY + 8);

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(String(index + 1), 19, currentY + 5.5);
    doc.text(letter.nomorSurat, 32, currentY + 5.5);
    doc.text(letter.tanggalSurat, 75, currentY + 5.5);
    
    // Perihal trimming if too long
    let perihal = letter.perihalSurat;
    if (perihal.length > 52) {
      perihal = perihal.substring(0, 49) + '...';
    }
    doc.text(perihal, 110, currentY + 5.5);

    currentY += 8;
  });

  // Table vertical border lines for clean visual
  doc.setDrawColor(210, 210, 210);
  doc.line(15, startY, 15, currentY);     // start left
  doc.line(26, startY, 26, currentY);     // after no
  doc.line(71, startY, 71, currentY);     // after nomorSurat
  doc.line(105, startY, 105, currentY);   // after tanggalSurat
  doc.line(195, startY, 195, currentY);   // end right

  // 5. SIGNATURE & QR BLOCK
  const stampY = currentY + 12;
  
  // Format received date
  let dateString = '';
  try {
    const d = receipt.tanggalTerima?.seconds 
      ? new Date(receipt.tanggalTerima.seconds * 1000) 
      : new Date(receipt.tanggalTerima || Date.now());
    
    dateString = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  } catch (err) {
    dateString = String(receipt.tanggalTerima || 'Baru Saja');
  }

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Diterima pada: ${dateString}`, 15, stampY);

  // QR Code generation
  // Direct verification URL (we can use the environment APP_URL or window.location.origin)
  const appUrl = window.location.origin;
  const verifyUrl = `${appUrl}/?verify=${receipt.nomorTandaTerima}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });
    // Add QR Code image on the left bottom side
    doc.addImage(qrDataUrl, 'PNG', 15, stampY + 4, 28, 28);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('SCAN QR UNTUK', 15, stampY + 36);
    doc.text('VERIFIKASI RESMI', 15, stampY + 39);
  } catch (err) {
    console.error('Failed to generate QR for PDF', err);
  }

  // Officer Signature Field (Right side)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Petugas PTSP Penerima,', 140, stampY);

  if (settings.tandaTanganDigital) {
    try {
      // If digital signature is provided (can be an uploaded image or standard handwritten text layout)
      if (settings.tandaTanganDigital.startsWith('data:image')) {
        doc.addImage(settings.tandaTanganDigital, 'PNG', 140, stampY + 2, 35, 14);
      } else {
        doc.setFont('Courier', 'oblique');
        doc.setTextColor(30, 100, 200);
        doc.text(settings.tandaTanganDigital, 140, stampY + 8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      }
    } catch {
      // Ignore signature image render errors
    }
  }

  // Draw simulated official digital seal
  doc.setDrawColor(200, 210, 255);
  doc.setFillColor(240, 244, 255);
  doc.rect(138, stampY + 16, 50, 16, 'DF');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DIVERIFIKASI DIGITAL', 141, stampY + 20);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`Petugas: ${receipt.petugasNama}`, 141, stampY + 24);
  doc.text(`NIP: ${receipt.petugasNip || '-'}`, 141, stampY + 28);

  const finalNameY = stampY + 36;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(receipt.petugasNama, 140, finalNameY);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`NIP: ${receipt.petugasNip || '-'}`, 140, finalNameY + 4);

  // Footer text
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text('Dokumen ini sah dikeluarkan secara elektronik melalui Sistem PTSP Terintegrasi TIRAMISU.', 105, 285, { align: 'center' });

  return doc;
}
