/**
 * PDF Generation - Professional Level
 * Creates PDF files from structured data using jsPDF
 *
 * Features:
 * - Multiple heading levels with styling
 * - Tables with borders and cell styling
 * - Images (base64 or URL)
 * - Headers and footers with page numbers
 * - Page orientation and margins
 * - Table of contents generation
 * - Custom fonts and colors
 */

import type { PdfDocument, PdfSection, DocumentTable, DocumentImage, PdfTextStyle } from '../documents.types';

// Helper: Convert hex color to RGB array
function hexToRgb(hex: string | undefined): [number, number, number] | null {
  if (!hex) return null;
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : null;
}

// Helper: Fetch image and convert to base64 data URL
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Page size dimensions in mm
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a3: { width: 297, height: 420 },
  a5: { width: 148, height: 210 },
};

// Heading font sizes
const HEADING_SIZES: Record<number, number> = {
  1: 20,
  2: 16,
  3: 14,
};

interface TocEntry {
  title: string;
  level: number;
  page: number;
}

export async function generatePdf(doc: PdfDocument): Promise<Blob> {
  // Dynamic import for code splitting
  const { jsPDF } = await import('jspdf');

  // Get page size and orientation
  const sizeKey = doc.pageSize || 'a4';
  const pageSize = PAGE_SIZES[sizeKey] || PAGE_SIZES.a4;
  const isLandscape = doc.orientation === 'landscape';

  const pdf = new jsPDF({
    format: [pageSize.width, pageSize.height],
    orientation: isLandscape ? 'landscape' : 'portrait',
  });

  // Margins
  const margins = doc.margins || { top: 20, right: 20, bottom: 25, left: 20 };
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margins.left - margins.right;

  // Default style
  const defaultStyle: PdfTextStyle = {
    fontSize: 11,
    fontFamily: 'helvetica',
    fontStyle: 'normal',
    color: '333333',
    ...doc.defaultStyle,
  };

  // Track TOC entries
  const tocEntries: TocEntry[] = [];
  let currentPage = 1;
  let y = margins.top;

  // Helper: Check and add new page if needed
  const checkPageBreak = (neededSpace: number = 30) => {
    if (y > pageHeight - margins.bottom - neededSpace) {
      pdf.addPage();
      currentPage++;
      y = margins.top;
      return true;
    }
    return false;
  };

  // Helper: Apply text style
  const applyStyle = (style?: PdfTextStyle) => {
    const mergedStyle = { ...defaultStyle, ...style };
    pdf.setFontSize(mergedStyle.fontSize || 11);
    pdf.setFont(
      mergedStyle.fontFamily || 'helvetica',
      mergedStyle.fontStyle || 'normal'
    );
    const rgb = hexToRgb(mergedStyle.color);
    if (rgb) {
      pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
    } else {
      pdf.setTextColor(51, 51, 51); // Default dark gray
    }
  };

  // Reserve space for TOC if needed
  const hasToc = !!doc.tableOfContents;
  const tocStartPage = hasToc ? 1 : 0;

  // Add title page
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const titleLines = pdf.splitTextToSize(doc.metadata.title, contentWidth);
  for (const line of titleLines) {
    pdf.text(line, pageWidth / 2, y, { align: 'center' });
    y += 12;
  }
  y += 8;

  // Author
  if (doc.metadata.author) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(100, 100, 100);
    pdf.text(`By ${doc.metadata.author}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  // Company
  if (doc.metadata.company) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(doc.metadata.company, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  // Date
  if (doc.metadata.createdAt) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.metadata.createdAt, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  y += 15;

  // Decorative line
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margins.left + 20, y, pageWidth - margins.right - 20, y);
  y += 20;

  // Add table of contents placeholder (will be filled later)
  if (hasToc) {
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(doc.tableOfContents?.title || 'Table of Contents', margins.left, y);
    y += 15;

    // Reserve space for TOC entries (will be updated later)
    const tocReservedSpace = 100;
    y += tocReservedSpace;

    pdf.addPage();
    currentPage++;
    y = margins.top;
  }

  // Process sections
  for (const section of doc.sections) {
    // Page break before section if requested
    if (section.pageBreakBefore) {
      pdf.addPage();
      currentPage++;
      y = margins.top;
    }

    checkPageBreak(40);

    // Section heading
    if (section.heading) {
      const headingLevel = section.headingLevel || 1;
      const headingSize = HEADING_SIZES[headingLevel] || 14;

      // Track for TOC
      if (hasToc && headingLevel <= (doc.tableOfContents?.maxLevel || 3)) {
        tocEntries.push({
          title: section.heading,
          level: headingLevel,
          page: currentPage,
        });
      }

      pdf.setFontSize(headingSize);
      pdf.setFont('helvetica', 'bold');
      const rgb = hexToRgb(section.style?.color);
      if (rgb) {
        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      } else {
        pdf.setTextColor(0, 0, 0);
      }

      const headingLines = pdf.splitTextToSize(section.heading, contentWidth);
      for (const line of headingLines) {
        checkPageBreak(headingSize);
        pdf.text(line, margins.left, y);
        y += headingSize * 0.5;
      }
      y += 6;
    }

    // Apply section style or default
    applyStyle(section.style);

    // Paragraphs
    for (const para of section.paragraphs) {
      const lines = pdf.splitTextToSize(para, contentWidth);

      for (const line of lines) {
        checkPageBreak(8);
        pdf.text(line, margins.left, y);
        y += 6;
      }
      y += 4; // Paragraph spacing
    }

    // Section tables
    if (section.tables) {
      for (const table of section.tables) {
        await addTable(pdf, table, margins, y, contentWidth, checkPageBreak);
        y += 10; // Space after table
      }
    }

    // Section images
    if (section.images) {
      for (const img of section.images) {
        y = await addImage(pdf, img, margins, y, contentWidth, checkPageBreak);
      }
    }

    y += 10; // Section spacing
  }

  // Add headers and footers
  const totalPages = pdf.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    // Header
    if (doc.header) {
      pdf.setFontSize(doc.header.fontSize || 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);

      const headerY = 10;
      const headerText = doc.header.text || '';
      const headerAlign = doc.header.alignment || 'center';
      const headerX = headerAlign === 'left' ? margins.left
        : headerAlign === 'right' ? pageWidth - margins.right
          : pageWidth / 2;

      pdf.text(headerText, headerX, headerY, { align: headerAlign as any });
    }

    // Footer
    if (doc.footer || true) { // Always add page numbers by default
      pdf.setFontSize(doc.footer?.fontSize || 10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);

      const footerY = pageHeight - 10;
      const footerAlign = doc.footer?.alignment || 'center';
      const footerX = footerAlign === 'left' ? margins.left
        : footerAlign === 'right' ? pageWidth - margins.right
          : pageWidth / 2;

      let footerText = doc.footer?.text || '';

      if (doc.footer?.includePageNumbers !== false) {
        const format = doc.footer?.pageNumberFormat || 'Page X of Y';
        const pageNum = format
          .replace('X', String(i))
          .replace('Y', String(totalPages));

        if (footerText) {
          footerText = `${footerText} | ${pageNum}`;
        } else {
          footerText = pageNum;
        }
      }

      pdf.text(footerText, footerX, footerY, { align: footerAlign as any });
    }
  }

  // Fill in TOC if needed (after all pages are created)
  if (hasToc && tocEntries.length > 0) {
    pdf.setPage(1);
    let tocY = margins.top + 45; // After title and TOC header

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    for (const entry of tocEntries) {
      const indent = (entry.level - 1) * 10;
      const entryText = entry.title;
      const pageText = String(entry.page);

      pdf.text(entryText, margins.left + indent, tocY);
      pdf.text(pageText, pageWidth - margins.right, tocY, { align: 'right' });

      // Dotted leader line
      const textWidth = pdf.getTextWidth(entryText);
      const pageWidth2 = pdf.getTextWidth(pageText);
      const dotsStart = margins.left + indent + textWidth + 5;
      const dotsEnd = pageWidth - margins.right - pageWidth2 - 5;

      pdf.setDrawColor(150, 150, 150);
      for (let x = dotsStart; x < dotsEnd; x += 3) {
        pdf.circle(x, tocY - 1, 0.3, 'F');
      }

      tocY += 7;
    }
  }

  return pdf.output('blob');
}

// Add a table to the PDF
async function addTable(
  pdf: any,
  table: DocumentTable,
  margins: { top: number; right: number; bottom: number; left: number },
  startY: number,
  contentWidth: number,
  checkPageBreak: (space: number) => boolean
): Promise<void> {
  const rowHeight = 8;
  const colWidth = contentWidth / (table.rows[0]?.cells.length || 1);
  let y = startY;

  checkPageBreak(table.rows.length * rowHeight + 10);

  for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
    const row = table.rows[rowIdx];
    const isHeader = row.isHeader || (table.headerRow && rowIdx === 0);

    // Draw row background
    if (isHeader) {
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margins.left, y - 5, contentWidth, rowHeight, 'F');
    } else if (table.alternateRowColor && rowIdx % 2 === 1) {
      const rgb = hexToRgb(table.alternateRowColor);
      if (rgb) {
        pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
        pdf.rect(margins.left, y - 5, contentWidth, rowHeight, 'F');
      }
    }

    // Draw cell text
    let x = margins.left;
    for (const cell of row.cells) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', isHeader || cell.bold ? 'bold' : 'normal');

      const rgb = hexToRgb(cell.textColor);
      if (rgb) {
        pdf.setTextColor(rgb[0], rgb[1], rgb[2]);
      } else {
        pdf.setTextColor(51, 51, 51);
      }

      const cellWidth = colWidth * (cell.colspan || 1);
      const textX = cell.align === 'center' ? x + cellWidth / 2
        : cell.align === 'right' ? x + cellWidth - 2
          : x + 2;

      pdf.text(cell.text, textX, y, { align: cell.align || 'left' });
      x += cellWidth;
    }

    y += rowHeight;
  }

  // Draw borders
  const borderColor = hexToRgb(table.borderColor) || [200, 200, 200];
  pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  pdf.setLineWidth(0.3);

  // Outer border
  pdf.rect(margins.left, startY - 5, contentWidth, table.rows.length * rowHeight);

  // Horizontal lines
  for (let i = 1; i < table.rows.length; i++) {
    pdf.line(margins.left, startY - 5 + i * rowHeight, margins.left + contentWidth, startY - 5 + i * rowHeight);
  }

  // Vertical lines
  const colCount = table.rows[0]?.cells.length || 1;
  for (let i = 1; i < colCount; i++) {
    pdf.line(margins.left + i * colWidth, startY - 5, margins.left + i * colWidth, startY - 5 + table.rows.length * rowHeight);
  }
}

// Add an image to the PDF
async function addImage(
  pdf: any,
  img: DocumentImage,
  margins: { top: number; right: number; bottom: number; left: number },
  startY: number,
  contentWidth: number,
  checkPageBreak: (space: number) => boolean
): Promise<number> {
  let imageData: string | null = null;

  if (img.base64) {
    // Assume it's already a data URL or raw base64
    imageData = img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}`;
  } else if (img.url) {
    imageData = await fetchImageAsDataUrl(img.url);
  }

  if (!imageData) return startY;

  const imgWidth = img.width || 100;
  const imgHeight = img.height || 75;

  // Check if we need a new page
  checkPageBreak(imgHeight + 10);

  try {
    pdf.addImage(imageData, 'AUTO', margins.left, startY, imgWidth, imgHeight);
    return startY + imgHeight + 10;
  } catch (e) {
    console.warn('Failed to add image to PDF:', e);
    return startY;
  }
}
