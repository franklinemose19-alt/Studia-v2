interface ExportableNote {
  title: string
  content: string
  course?: string
  date: string
}

export async function exportNoteAsPDF(note: ExportableNote): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  const marginLeft = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - marginLeft * 2
  const bottomMargin = 20
  let y = 20

  // Title
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 30)
  const titleLines = doc.splitTextToSize(note.title || 'Untitled Note', maxWidth)
  doc.text(titleLines, marginLeft, y)
  y += titleLines.length * 8 + 4

  // Meta
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  if (note.course) {
    doc.text(`Course: ${note.course}`, marginLeft, y)
    y += 6
  }
  doc.text(`Date: ${note.date}`, marginLeft, y)
  y += 10

  doc.setDrawColor(220, 220, 220)
  doc.line(marginLeft, y, pageWidth - marginLeft, y)
  y += 8

  // Body — paginated properly
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  const bodyText = note.content && note.content.trim() ? note.content : 'No content available.'
  const contentLines: string[] = doc.splitTextToSize(bodyText, maxWidth)
  const lineHeight = 6

  for (const line of contentLines) {
    if (y + lineHeight > pageHeight - bottomMargin) {
      doc.addPage()
      y = 20
    }
    doc.text(line, marginLeft, y)
    y += lineHeight
  }

  const safeTitle = (note.title || 'STUDIA_Note')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60)

  doc.save(`${safeTitle || 'STUDIA_Note'}.pdf`)
}
