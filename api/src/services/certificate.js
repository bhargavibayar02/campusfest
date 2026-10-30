import PDFDocument from 'pdfkit'

export function createAttendanceCertificate({ name, eventTitle, eventDate, reference }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 48 })
    const chunks = []
    document.on('data', (chunk) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)

    const width = document.page.width
    const height = document.page.height
    document.rect(24, 24, width - 48, height - 48).lineWidth(2).stroke('#b8343c')
    document.rect(34, 34, width - 68, height - 68).lineWidth(0.7).stroke('#d7b574')
    document.fillColor('#b8343c').fontSize(13).font('Helvetica-Bold').text('CAMPUSFEST', 60, 76, { align: 'center', characterSpacing: 3 })
    document.fillColor('#171416').fontSize(34).font('Helvetica-Bold').text('CERTIFICATE OF ATTENDANCE', 60, 132, { align: 'center' })
    document.fillColor('#555').fontSize(15).font('Helvetica').text('This certificate is presented to', 60, 205, { align: 'center' })
    document.fillColor('#171416').fontSize(30).font('Helvetica-Bold').text(name, 70, 244, { align: 'center', width: width - 140 })
    document.moveTo(150, 292).lineTo(width - 150, 292).lineWidth(1).stroke('#d7b574')
    document.fillColor('#555').fontSize(15).font('Helvetica').text('for attending', 60, 318, { align: 'center' })
    document.fillColor('#171416').fontSize(23).font('Helvetica-Bold').text(eventTitle, 72, 350, { align: 'center', width: width - 144 })
    document.fillColor('#555').fontSize(14).font('Helvetica').text(`Held on ${eventDate}`, 60, 404, { align: 'center' })
    document.fillColor('#777').fontSize(10).text(`Registration reference: ${reference}`, 60, height - 94, { align: 'center' })
    document.end()
  })
}
