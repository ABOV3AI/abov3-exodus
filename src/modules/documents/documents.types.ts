/**
 * Document Generation Types
 * Professional-level structured data schemas for PPTX, DOCX, and PDF generation
 */

// Common types
export interface DocumentMetadata {
  title: string;
  author?: string;
  subject?: string;
  company?: string;
  createdAt?: string;
}

// Image types (for embedding images in documents)
export interface DocumentImage {
  url?: string;           // URL to fetch image from
  base64?: string;        // Base64-encoded image data
  width?: number;         // Width in inches (PPTX) or points (PDF)
  height?: number;        // Height in inches (PPTX) or points (PDF)
  alt?: string;           // Alt text for accessibility
}

// Table types (shared across document types)
export interface TableCell {
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;  // Hex color
  textColor?: string;        // Hex color
  colspan?: number;
  rowspan?: number;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

export interface DocumentTable {
  rows: TableRow[];
  headerRow?: boolean;      // First row is header (styled differently)
  borderColor?: string;     // Hex color for borders
  alternateRowColor?: string; // Hex color for alternate row striping
}

// ============================================================
// PPTX Types - Professional PowerPoint Generation
// ============================================================

export interface PptxTextElement {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;           // Hex color
  align?: 'left' | 'center' | 'right';
  x?: number;               // Position X in inches
  y?: number;               // Position Y in inches
  w?: number;               // Width in inches
  h?: number;               // Height in inches
}

export interface PptxShape {
  type: 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow';
  x: number;
  y: number;
  w: number;
  h: number;
  fillColor?: string;       // Hex color
  lineColor?: string;       // Hex color
  lineWidth?: number;       // Line width in points
}

export interface PptxChart {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title?: string;
  data: {
    labels: string[];
    datasets: Array<{
      name: string;
      values: number[];
      color?: string;       // Hex color for this series
    }>;
  };
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  showLegend?: boolean;
  showValues?: boolean;
}

export interface PptxSlide {
  title?: string;
  subtitle?: string;
  content?: string[];           // Bullet points
  notes?: string;               // Speaker notes
  layout?: 'title' | 'content' | 'two-column' | 'section' | 'comparison' | 'blank';

  // Advanced content
  textElements?: PptxTextElement[];  // Custom positioned text
  images?: Array<DocumentImage & { x?: number; y?: number }>;
  tables?: Array<DocumentTable & { x?: number; y?: number; w?: number }>;
  shapes?: PptxShape[];
  charts?: PptxChart[];

  // Slide-specific styling
  backgroundColor?: string;     // Override theme background for this slide
  transition?: 'fade' | 'push' | 'wipe' | 'split' | 'none';
}

export interface PptxTheme {
  backgroundColor?: string;     // Hex color (default: FFFFFF)
  primaryColor?: string;        // Title text color (default: 333333)
  textColor?: string;           // Body text color (default: 666666)
  accentColor?: string;         // Accent/highlight color
  fontFamily?: string;          // Font family for text
  titleFontFamily?: string;     // Font family for titles (if different)
}

export interface PptxDocument {
  metadata: DocumentMetadata;
  slides: PptxSlide[];
  theme?: PptxTheme;
  slideSize?: 'LAYOUT_16x9' | 'LAYOUT_16x10' | 'LAYOUT_4x3' | 'LAYOUT_WIDE';
}

// ============================================================
// DOCX Types - Professional Word Document Generation
// ============================================================

export interface DocxTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: 'yellow' | 'green' | 'cyan' | 'magenta' | 'blue' | 'red' | 'darkBlue' | 'darkGreen';
  color?: string;           // Hex color
  fontSize?: number;        // Font size in points
  fontFamily?: string;
  superscript?: boolean;
  subscript?: boolean;
}

export interface DocxListItem {
  text: string | DocxTextRun[];
  level?: number;           // Nesting level (0-based)
}

export interface DocxList {
  type: 'bullet' | 'number';
  items: DocxListItem[];
}

export interface DocxHyperlink {
  text: string;
  url: string;
}

export interface DocxParagraph {
  text?: string;
  runs?: DocxTextRun[];     // For mixed formatting in one paragraph
  style?: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'normal' | 'quote' | 'title' | 'subtitle' | 'caption';
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacing?: {
    before?: number;        // Spacing before in points
    after?: number;         // Spacing after in points
    line?: number;          // Line spacing multiplier (1.0, 1.5, 2.0)
  };
  indent?: {
    left?: number;          // Left indent in points
    right?: number;
    firstLine?: number;     // First line indent
  };
  pageBreakBefore?: boolean;
}

export interface DocxSection {
  content: Array<DocxParagraph | DocxList | DocumentTable | DocumentImage>;
  header?: string;          // Section header text
  footer?: string;          // Section footer text
  pageNumbers?: boolean;    // Show page numbers in footer
}

export interface DocxDocument {
  metadata: DocumentMetadata;
  content: DocxParagraph[];
  sections?: DocxSection[]; // Alternative: organized by sections
  tables?: DocumentTable[];
  images?: DocumentImage[];
  lists?: DocxList[];

  // Document-level settings
  defaultFont?: string;
  defaultFontSize?: number;
  pageSize?: 'A4' | 'LETTER' | 'LEGAL';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };

  // Headers/footers
  header?: {
    text?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  footer?: {
    text?: string;
    includePageNumbers?: boolean;
    alignment?: 'left' | 'center' | 'right';
  };
}

// ============================================================
// PDF Types - Professional PDF Document Generation
// ============================================================

export interface PdfTextStyle {
  fontSize?: number;
  fontFamily?: 'helvetica' | 'times' | 'courier';
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
  color?: string;           // Hex color
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface PdfText {
  content: string;
  style?: PdfTextStyle;
  x?: number;               // Custom X position
  y?: number;               // Custom Y position
}

export interface PdfSection {
  heading?: string;
  headingLevel?: 1 | 2 | 3;
  paragraphs: string[];
  style?: PdfTextStyle;     // Apply to all paragraphs in section
  tables?: DocumentTable[];
  images?: DocumentImage[];
  pageBreakBefore?: boolean;
}

export interface PdfHeader {
  text?: string;
  image?: DocumentImage;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export interface PdfFooter {
  text?: string;
  includePageNumbers?: boolean;
  pageNumberFormat?: 'Page X' | 'Page X of Y' | 'X' | 'X/Y';
  alignment?: 'left' | 'center' | 'right';
  fontSize?: number;
}

export interface PdfDocument {
  metadata: DocumentMetadata;
  sections: PdfSection[];

  // Page settings
  pageSize?: 'a4' | 'letter' | 'legal' | 'a3' | 'a5';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  // Header/footer
  header?: PdfHeader;
  footer?: PdfFooter;

  // Styling
  defaultStyle?: PdfTextStyle;
  linkColor?: string;       // Color for hyperlinks

  // Table of contents
  tableOfContents?: {
    title?: string;
    maxLevel?: number;      // Max heading level to include (1-3)
  };
}
