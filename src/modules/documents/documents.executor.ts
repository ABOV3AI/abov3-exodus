/**
 * Document Generation Tool Executors - Professional Level
 * Implements tool execution logic and exports tool definitions for registration
 *
 * IMPORTANT: Generators are dynamically imported to prevent webpack from bundling
 * heavy document libraries (pptxgenjs, docx, jspdf) at build time. These libraries
 * have Node.js dependencies that cause build errors if statically imported.
 */

import type { ToolDefinition, ToolExecutor } from '~/modules/tools/tools.types';
import { DOCUMENT_TOOLS } from './documents.tools';
import { writeBinaryFile } from './documents.file-writer';
import { useProjectsStore } from '~/apps/projects/store-projects';
import type {
  PptxDocument,
  PptxTheme,
  PptxSlide,
  DocxDocument,
  DocxParagraph,
  DocxList,
  DocumentTable,
  DocumentImage,
  PdfDocument,
  PdfSection,
  PdfTextStyle,
} from './documents.types';

/**
 * Create Presentation (PPTX) Executor
 * Supports themes, tables, charts, shapes, images, and multiple layouts
 */
const createPresentationExecutor: ToolExecutor = async (args, context) => {
  try {
    const {
      path,
      title,
      author,
      company,
      slides,
      theme,
      slideSize,
    } = args as {
      path: string;
      title: string;
      author?: string;
      company?: string;
      slides: PptxSlide[];
      theme?: PptxTheme;
      slideSize?: 'LAYOUT_16x9' | 'LAYOUT_16x10' | 'LAYOUT_4x3' | 'LAYOUT_WIDE';
    };

    // Validate file extension
    if (!path.toLowerCase().endsWith('.pptx')) {
      return { error: 'File path must end with .pptx' };
    }

    // Validate slides
    if (!slides || slides.length === 0) {
      return { error: 'At least one slide is required' };
    }

    // Get project handle
    const activeProject = useProjectsStore.getState().getActiveProject();
    const projectHandle = context.projectHandle || activeProject?.handle || undefined;

    // Dynamically import generator to avoid bundling pptxgenjs at build time
    const { generatePptx } = await import(
      /* webpackChunkName: "doc-pptx" */
      './generators/pptx.generator'
    );

    // Generate the presentation with full feature support
    const doc: PptxDocument = {
      metadata: { title, author, company },
      slides,
      theme,
      slideSize,
    };
    const blob = await generatePptx(doc);

    // Write to file system
    await writeBinaryFile(path, blob, projectHandle);

    // Trigger file tree refresh
    useProjectsStore.getState().triggerFileTreeRefresh();

    // Build summary
    const features: string[] = [];
    if (theme) features.push('custom theme');
    if (slides.some(s => s.tables?.length)) features.push('tables');
    if (slides.some(s => s.charts?.length)) features.push('charts');
    if (slides.some(s => s.images?.length)) features.push('images');
    if (slides.some(s => s.shapes?.length)) features.push('shapes');

    const featureSummary = features.length > 0 ? `\n- Features: ${features.join(', ')}` : '';

    return {
      result: `Successfully created presentation: ${path}\n- ${slides.length} slide(s)${featureSummary}\n- File size: ${(blob.size / 1024).toFixed(1)} KB`,
    };
  } catch (error: any) {
    return { error: `Failed to create presentation: ${error.message}` };
  }
};

/**
 * Create Document (DOCX) Executor
 * Supports tables, lists, images, headers/footers, and rich formatting
 */
const createDocumentExecutor: ToolExecutor = async (args, context) => {
  try {
    const {
      path,
      title,
      author,
      content,
      tables,
      lists,
      images,
      pageSize,
      orientation,
      margins,
      header,
      footer,
    } = args as {
      path: string;
      title: string;
      author?: string;
      content: DocxParagraph[];
      tables?: DocumentTable[];
      lists?: DocxList[];
      images?: DocumentImage[];
      pageSize?: 'A4' | 'LETTER' | 'LEGAL';
      orientation?: 'portrait' | 'landscape';
      margins?: { top?: number; right?: number; bottom?: number; left?: number };
      header?: { text?: string; alignment?: 'left' | 'center' | 'right' };
      footer?: { text?: string; includePageNumbers?: boolean; alignment?: 'left' | 'center' | 'right' };
    };

    // Validate file extension
    if (!path.toLowerCase().endsWith('.docx')) {
      return { error: 'File path must end with .docx' };
    }

    // Validate content
    if (!content || content.length === 0) {
      return { error: 'At least one paragraph is required' };
    }

    // Get project handle
    const activeProject = useProjectsStore.getState().getActiveProject();
    const projectHandle = context.projectHandle || activeProject?.handle || undefined;

    // Dynamically import generator to avoid bundling docx at build time
    const { generateDocx } = await import(
      /* webpackChunkName: "doc-docx" */
      './generators/docx.generator'
    );

    // Generate the document with full feature support
    const doc: DocxDocument = {
      metadata: { title, author },
      content,
      tables,
      lists,
      images,
      pageSize,
      orientation,
      margins,
      header,
      footer,
    };
    const blob = await generateDocx(doc);

    // Write to file system
    await writeBinaryFile(path, blob, projectHandle);

    // Trigger file tree refresh
    useProjectsStore.getState().triggerFileTreeRefresh();

    // Build summary
    const features: string[] = [];
    if (tables?.length) features.push(`${tables.length} table(s)`);
    if (lists?.length) features.push(`${lists.length} list(s)`);
    if (images?.length) features.push(`${images.length} image(s)`);
    if (header || footer) features.push('headers/footers');
    if (orientation === 'landscape') features.push('landscape');

    const featureSummary = features.length > 0 ? `\n- Features: ${features.join(', ')}` : '';

    return {
      result: `Successfully created document: ${path}\n- ${content.length} paragraph(s)${featureSummary}\n- File size: ${(blob.size / 1024).toFixed(1)} KB`,
    };
  } catch (error: any) {
    return { error: `Failed to create document: ${error.message}` };
  }
};

/**
 * Create PDF Executor
 * Supports sections, tables, images, TOC, headers/footers, and styling
 */
const createPdfExecutor: ToolExecutor = async (args, context) => {
  try {
    const {
      path,
      title,
      author,
      company,
      sections,
      pageSize,
      orientation,
      margins,
      header,
      footer,
      tableOfContents,
      defaultStyle,
    } = args as {
      path: string;
      title: string;
      author?: string;
      company?: string;
      sections: PdfSection[];
      pageSize?: 'a4' | 'letter' | 'legal' | 'a3' | 'a5';
      orientation?: 'portrait' | 'landscape';
      margins?: { top: number; right: number; bottom: number; left: number };
      header?: { text?: string; alignment?: 'left' | 'center' | 'right'; fontSize?: number };
      footer?: {
        text?: string;
        includePageNumbers?: boolean;
        pageNumberFormat?: 'Page X' | 'Page X of Y' | 'X' | 'X/Y';
        alignment?: 'left' | 'center' | 'right';
        fontSize?: number;
      };
      tableOfContents?: { title?: string; maxLevel?: number };
      defaultStyle?: PdfTextStyle;
    };

    // Validate file extension
    if (!path.toLowerCase().endsWith('.pdf')) {
      return { error: 'File path must end with .pdf' };
    }

    // Validate sections
    if (!sections || sections.length === 0) {
      return { error: 'At least one section is required' };
    }

    // Get project handle
    const activeProject = useProjectsStore.getState().getActiveProject();
    const projectHandle = context.projectHandle || activeProject?.handle || undefined;

    // Dynamically import generator to avoid bundling jspdf at build time
    const { generatePdf } = await import(
      /* webpackChunkName: "doc-pdf" */
      './generators/pdf.generator'
    );

    // Generate the PDF with full feature support
    const doc: PdfDocument = {
      metadata: { title, author, company },
      sections,
      pageSize,
      orientation,
      margins,
      header,
      footer,
      tableOfContents,
      defaultStyle,
    };
    const blob = await generatePdf(doc);

    // Write to file system
    await writeBinaryFile(path, blob, projectHandle);

    // Trigger file tree refresh
    useProjectsStore.getState().triggerFileTreeRefresh();

    // Count totals
    const totalParagraphs = sections.reduce((sum, s) => sum + s.paragraphs.length, 0);
    const totalTables = sections.reduce((sum, s) => sum + (s.tables?.length || 0), 0);
    const totalImages = sections.reduce((sum, s) => sum + (s.images?.length || 0), 0);

    // Build summary
    const features: string[] = [];
    if (tableOfContents) features.push('table of contents');
    if (totalTables > 0) features.push(`${totalTables} table(s)`);
    if (totalImages > 0) features.push(`${totalImages} image(s)`);
    if (header || footer) features.push('headers/footers');
    if (orientation === 'landscape') features.push('landscape');

    const featureSummary = features.length > 0 ? `\n- Features: ${features.join(', ')}` : '';

    return {
      result: `Successfully created PDF: ${path}\n- ${sections.length} section(s), ${totalParagraphs} paragraph(s)${featureSummary}\n- Page size: ${pageSize || 'a4'}\n- File size: ${(blob.size / 1024).toFixed(1)} KB`,
    };
  } catch (error: any) {
    return { error: `Failed to create PDF: ${error.message}` };
  }
};

/**
 * Document Tool Definitions for registration
 */
export const DOCUMENT_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'create_presentation',
    category: 'office',
    name: 'Create Presentation',
    description: 'Create a professional PowerPoint presentation (.pptx) with themes, tables, charts, and images',
    aixDefinition: DOCUMENT_TOOLS[0],
    executor: createPresentationExecutor,
    requiresProject: true,
    readOnly: false,
    browserAPIs: ['FileSystem'],
    defaultTimeout: 60000, // 60 seconds for complex presentations
  },
  {
    id: 'create_document',
    category: 'office',
    name: 'Create Document',
    description: 'Create a professional Word document (.docx) with tables, lists, images, and formatting',
    aixDefinition: DOCUMENT_TOOLS[1],
    executor: createDocumentExecutor,
    requiresProject: true,
    readOnly: false,
    browserAPIs: ['FileSystem'],
    defaultTimeout: 60000,
  },
  {
    id: 'create_pdf',
    category: 'office',
    name: 'Create PDF',
    description: 'Create a professional PDF document with sections, tables, images, and table of contents',
    aixDefinition: DOCUMENT_TOOLS[2],
    executor: createPdfExecutor,
    requiresProject: true,
    readOnly: false,
    browserAPIs: ['FileSystem'],
    defaultTimeout: 60000,
  },
];
