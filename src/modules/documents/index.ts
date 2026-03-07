/**
 * Document Generation Module - Professional Level
 * Provides tools for creating PPTX, DOCX, and PDF documents
 *
 * Features:
 * - PowerPoint: themes, tables, charts, shapes, images, multiple layouts
 * - Word: headings, tables, lists, images, headers/footers, page settings
 * - PDF: sections, tables, images, TOC, headers/footers, styling
 *
 * NOTE: Generators (pptx, docx, pdf) are NOT exported here to prevent
 * webpack from bundling heavy libraries at build time. They are
 * dynamically imported when tools are executed.
 */

// Type exports - Common
export type {
  DocumentMetadata,
  DocumentImage,
  TableCell,
  TableRow,
  DocumentTable,
} from './documents.types';

// Type exports - PPTX
export type {
  PptxTextElement,
  PptxShape,
  PptxChart,
  PptxSlide,
  PptxTheme,
  PptxDocument,
} from './documents.types';

// Type exports - DOCX
export type {
  DocxTextRun,
  DocxListItem,
  DocxList,
  DocxHyperlink,
  DocxParagraph,
  DocxSection,
  DocxDocument,
} from './documents.types';

// Type exports - PDF
export type {
  PdfTextStyle,
  PdfText,
  PdfSection,
  PdfHeader,
  PdfFooter,
  PdfDocument,
} from './documents.types';

// Tool definitions
export { DOCUMENT_TOOLS } from './documents.tools';
export { DOCUMENT_TOOL_DEFINITIONS } from './documents.executor';

// File utilities
export { writeBinaryFile, fileExists } from './documents.file-writer';

// Generators are available via dynamic import:
// const { generatePptx } = await import('~/modules/documents/generators/pptx.generator');
// const { generateDocx } = await import('~/modules/documents/generators/docx.generator');
// const { generatePdf } = await import('~/modules/documents/generators/pdf.generator');
