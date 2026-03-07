/**
 * Word Document Generation - Professional Level
 * Creates DOCX files from structured data using docx library
 *
 * Features:
 * - Multiple heading levels
 * - Styled paragraphs with formatting
 * - Tables with cell styling
 * - Bulleted and numbered lists
 * - Headers and footers with page numbers
 * - Page orientation and margins
 * - Images (base64 or URL)
 */

import type {
  DocxDocument,
  DocxParagraph,
  DocxList,
  DocxTextRun,
  DocumentTable,
  DocumentImage,
} from '../documents.types';

// Helper: Convert hex color to docx format (6-digit without #)
function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  return color.replace(/^#/, '');
}

// Helper: Convert points to twips (1 point = 20 twips)
function pointsToTwips(points: number): number {
  return points * 20;
}

// Helper: Fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateDocx(doc: DocxDocument): Promise<Blob> {
  // Dynamic import for code splitting
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    Header,
    Footer,
    PageNumber,
    NumberFormat,
    ImageRun,
    PageOrientation,
    convertInchesToTwip,
  } = await import('docx');

  const children: any[] = [];

  // Alignment mapping
  const alignmentMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  };

  // Add title
  children.push(
    new Paragraph({
      text: doc.metadata.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Add author if provided
  if (doc.metadata.author) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `By ${doc.metadata.author}`,
            italics: true,
            size: 24, // 12pt
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
  }

  // Process content paragraphs
  for (const para of doc.content) {
    children.push(await createParagraph(para, HeadingLevel, AlignmentType, TextRun, Paragraph, alignmentMap));
  }

  // Process lists
  if (doc.lists) {
    for (const list of doc.lists) {
      const listItems = createList(list, Paragraph, TextRun);
      children.push(...listItems);
    }
  }

  // Process tables
  if (doc.tables) {
    for (const table of doc.tables) {
      children.push(
        createTable(table, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle)
      );
    }
  }

  // Process images
  if (doc.images) {
    for (const img of doc.images) {
      const imagePara = await createImageParagraph(img, Paragraph, ImageRun, convertInchesToTwip);
      if (imagePara) {
        children.push(imagePara);
      }
    }
  }

  // Create document with sections
  const sections: any[] = [
    {
      properties: {
        page: {
          size: getPageSize(doc.pageSize, doc.orientation, PageOrientation),
          margin: getMargins(doc.margins, convertInchesToTwip),
        },
      },
      headers: doc.header ? createHeaders(doc.header, Header, Paragraph, TextRun, AlignmentType, alignmentMap) : undefined,
      footers: doc.footer ? createFooters(doc.footer, Footer, Paragraph, TextRun, PageNumber, NumberFormat, AlignmentType, alignmentMap) : undefined,
      children,
    },
  ];

  const docxDoc = new Document({
    creator: doc.metadata.author || 'ABOV3',
    title: doc.metadata.title,
    subject: doc.metadata.subject,
    description: doc.metadata.subject,
    sections,
  });

  return await Packer.toBlob(docxDoc);
}

// Create a paragraph from DocxParagraph
async function createParagraph(
  para: DocxParagraph,
  HeadingLevel: any,
  AlignmentType: any,
  TextRun: any,
  Paragraph: any,
  alignmentMap: Record<string, any>
): Promise<any> {
  const headingMap: Record<string, any> = {
    heading1: HeadingLevel.HEADING_1,
    heading2: HeadingLevel.HEADING_2,
    heading3: HeadingLevel.HEADING_3,
    heading4: HeadingLevel.HEADING_4,
    title: HeadingLevel.TITLE,
    subtitle: HeadingLevel.SUBTITLE,
  };

  const heading = para.style ? headingMap[para.style] : undefined;
  const alignment = para.alignment ? alignmentMap[para.alignment] : undefined;

  // Create text runs
  const textChildren: any[] = [];

  if (para.runs && para.runs.length > 0) {
    // Multiple text runs with different formatting
    for (const run of para.runs) {
      textChildren.push(createTextRun(run, TextRun));
    }
  } else if (para.text) {
    // Single text
    textChildren.push(
      new TextRun({
        text: para.text,
        bold: para.bold,
        italics: para.italic,
      })
    );
  }

  // Quote style handling
  if (para.style === 'quote') {
    return new Paragraph({
      children: textChildren.length > 0 ? textChildren : [new TextRun({ text: para.text || '', italics: true })],
      indent: { left: 720, right: 720 },
      spacing: { before: 200, after: 200 },
      alignment,
    });
  }

  // Caption style handling
  if (para.style === 'caption') {
    return new Paragraph({
      children: textChildren.length > 0 ? textChildren : [new TextRun({ text: para.text || '', size: 20, italics: true })],
      alignment: alignment || AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
    });
  }

  return new Paragraph({
    heading,
    children: textChildren,
    alignment,
    spacing: {
      before: para.spacing?.before ? pointsToTwips(para.spacing.before) : (heading ? 240 : undefined),
      after: para.spacing?.after ? pointsToTwips(para.spacing.after) : (heading ? 120 : 200),
      line: para.spacing?.line ? para.spacing.line * 240 : undefined,
    },
    indent: para.indent ? {
      left: para.indent.left ? pointsToTwips(para.indent.left) : undefined,
      right: para.indent.right ? pointsToTwips(para.indent.right) : undefined,
      firstLine: para.indent.firstLine ? pointsToTwips(para.indent.firstLine) : undefined,
    } : undefined,
    pageBreakBefore: para.pageBreakBefore,
  });
}

// Create a TextRun from DocxTextRun
function createTextRun(run: DocxTextRun, TextRun: any): any {
  return new TextRun({
    text: run.text,
    bold: run.bold,
    italics: run.italic,
    underline: run.underline ? {} : undefined,
    strike: run.strike,
    highlight: run.highlight,
    color: normalizeColor(run.color),
    size: run.fontSize ? run.fontSize * 2 : undefined, // docx uses half-points
    font: run.fontFamily,
    superScript: run.superscript,
    subScript: run.subscript,
  });
}

// Create list paragraphs
function createList(list: DocxList, Paragraph: any, TextRun: any): any[] {
  const paragraphs: any[] = [];
  const bulletStyle = list.type === 'bullet' ? 'bullet' : 'numbered';

  for (const item of list.items) {
    const textContent = typeof item.text === 'string'
      ? [new TextRun({ text: item.text })]
      : item.text.map((run: DocxTextRun) => createTextRun(run, TextRun));

    paragraphs.push(
      new Paragraph({
        children: textContent,
        bullet: list.type === 'bullet' ? { level: item.level || 0 } : undefined,
        numbering: list.type === 'number' ? { reference: 'default-numbering', level: item.level || 0 } : undefined,
      })
    );
  }

  return paragraphs;
}

// Create a table
function createTable(
  table: DocumentTable,
  Table: any,
  TableRowClass: any,
  TableCellClass: any,
  Paragraph: any,
  TextRun: any,
  WidthType: any,
  BorderStyle: any
): any {
  const rows: any[] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    const isHeader = row.isHeader || (table.headerRow && rowIndex === 0);
    const cells: any[] = [];

    for (const cell of row.cells) {
      const cellBgColor = cell.backgroundColor
        ? normalizeColor(cell.backgroundColor)
        : (table.alternateRowColor && rowIndex % 2 === 1)
          ? normalizeColor(table.alternateRowColor)
          : undefined;

      cells.push(
        new TableCellClass({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell.text,
                  bold: cell.bold || isHeader,
                  italics: cell.italic,
                  color: normalizeColor(cell.textColor),
                }),
              ],
              alignment: cell.align === 'center' ? 1 : cell.align === 'right' ? 2 : 0,
            }),
          ],
          shading: cellBgColor ? { fill: cellBgColor } : undefined,
          columnSpan: cell.colspan,
          rowSpan: cell.rowspan,
        })
      );
    }

    rows.push(new TableRowClass({ children: cells }));
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: normalizeColor(table.borderColor) || 'CCCCCC' },
    },
  });
}

// Create image paragraph
async function createImageParagraph(
  img: DocumentImage,
  Paragraph: any,
  ImageRun: any,
  convertInchesToTwip: (inches: number) => number
): Promise<any | null> {
  let imageData: Uint8Array | null = null;

  if (img.base64) {
    // Convert base64 to Uint8Array
    const binaryString = atob(img.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    imageData = bytes;
  } else if (img.url) {
    const base64 = await fetchImageAsBase64(img.url);
    if (base64) {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageData = bytes;
    }
  }

  if (!imageData) return null;

  const width = img.width ? convertInchesToTwip(img.width) : convertInchesToTwip(4);
  const height = img.height ? convertInchesToTwip(img.height) : convertInchesToTwip(3);

  return new Paragraph({
    children: [
      new ImageRun({
        data: imageData,
        transformation: { width, height },
        altText: { title: img.alt || 'Image', description: img.alt || '' },
      }),
    ],
  });
}

// Get page size
function getPageSize(
  pageSize: string | undefined,
  orientation: string | undefined,
  PageOrientation: any
): any {
  const sizes: Record<string, { width: number; height: number }> = {
    A4: { width: 11906, height: 16838 },
    LETTER: { width: 12240, height: 15840 },
    LEGAL: { width: 12240, height: 20160 },
  };

  const size = sizes[pageSize || 'A4'] || sizes.A4;
  const isLandscape = orientation === 'landscape';

  return {
    width: isLandscape ? size.height : size.width,
    height: isLandscape ? size.width : size.height,
    orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
  };
}

// Get margins
function getMargins(
  margins: { top?: number; right?: number; bottom?: number; left?: number } | undefined,
  convertInchesToTwip: (inches: number) => number
): any {
  const defaultMargin = convertInchesToTwip(1);
  return {
    top: margins?.top ? convertInchesToTwip(margins.top / 72) : defaultMargin,
    right: margins?.right ? convertInchesToTwip(margins.right / 72) : defaultMargin,
    bottom: margins?.bottom ? convertInchesToTwip(margins.bottom / 72) : defaultMargin,
    left: margins?.left ? convertInchesToTwip(margins.left / 72) : defaultMargin,
  };
}

// Create headers
function createHeaders(
  header: { text?: string; alignment?: string },
  Header: any,
  Paragraph: any,
  TextRun: any,
  AlignmentType: any,
  alignmentMap: Record<string, any>
): any {
  return {
    default: new Header({
      children: [
        new Paragraph({
          children: [new TextRun({ text: header.text || '' })],
          alignment: header.alignment ? alignmentMap[header.alignment] : AlignmentType.CENTER,
        }),
      ],
    }),
  };
}

// Create footers
function createFooters(
  footer: { text?: string; includePageNumbers?: boolean; alignment?: string },
  Footer: any,
  Paragraph: any,
  TextRun: any,
  PageNumber: any,
  NumberFormat: any,
  AlignmentType: any,
  alignmentMap: Record<string, any>
): any {
  const footerChildren: any[] = [];

  if (footer.text) {
    footerChildren.push(new TextRun({ text: footer.text }));
  }

  if (footer.includePageNumbers) {
    if (footer.text) {
      footerChildren.push(new TextRun({ text: ' - Page ' }));
    } else {
      footerChildren.push(new TextRun({ text: 'Page ' }));
    }
    footerChildren.push(new TextRun({ children: [PageNumber.CURRENT] }));
    footerChildren.push(new TextRun({ text: ' of ' }));
    footerChildren.push(new TextRun({ children: [PageNumber.TOTAL_PAGES] }));
  }

  return {
    default: new Footer({
      children: [
        new Paragraph({
          children: footerChildren,
          alignment: footer.alignment ? alignmentMap[footer.alignment] : AlignmentType.CENTER,
        }),
      ],
    }),
  };
}
