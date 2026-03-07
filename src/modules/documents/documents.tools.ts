/**
 * Document Generation AIX Tool Definitions
 * Professional-level OpenAI-compatible function call definitions for document creation tools
 */

import type { AixTools_ToolDefinition } from '~/modules/aix/server/api/aix.wiretypes';

export const DOCUMENT_TOOLS: AixTools_ToolDefinition[] = [
  // ============================================================
  // PowerPoint Presentation Tool
  // ============================================================
  {
    type: 'function_call',
    function_call: {
      name: 'create_presentation',
      description: `Create a professional PowerPoint presentation (.pptx) file with slides, themes, tables, charts, and images.

Features:
- Multiple slide layouts: title, content, two-column, section, comparison, blank
- Custom themes with background, title, text, and accent colors
- Tables with cell styling and borders
- Charts (bar, line, pie, doughnut, area)
- Shapes (rectangle, ellipse, triangle, line, arrow)
- Images via URL or base64
- Speaker notes
- Custom text positioning

The path must be relative to the project root and end with .pptx.`,
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Output file path relative to project root (must end with .pptx, e.g., "output/presentation.pptx")',
          },
          title: {
            type: 'string',
            description: 'Presentation title (appears in metadata)',
          },
          author: {
            type: 'string',
            description: 'Author name (optional)',
          },
          company: {
            type: 'string',
            description: 'Company name (optional)',
          },
          theme: {
            type: 'object',
            description: `Theme settings for the presentation:
- backgroundColor: Hex color for slide backgrounds (e.g., "1a1a2e" for dark, default "FFFFFF")
- primaryColor: Hex color for titles (e.g., "eaeaea", default "333333")
- textColor: Hex color for body text (e.g., "cccccc", default "666666")
- accentColor: Hex color for accents/highlights (default "0066CC")
- fontFamily: Font for body text (default "Arial")
- titleFontFamily: Font for titles (optional, defaults to fontFamily)`,
          },
          slideSize: {
            type: 'string',
            description: 'Slide aspect ratio: "LAYOUT_16x9" (default), "LAYOUT_16x10", "LAYOUT_4x3", or "LAYOUT_WIDE"',
          },
          slides: {
            type: 'array',
            description: `Array of slides. Each slide object supports:
- title: Slide title text
- subtitle: Subtitle (for title/section slides)
- content: Array of bullet point strings
- layout: "title", "content", "two-column", "section", "comparison", or "blank"
- notes: Speaker notes text
- backgroundColor: Override theme background for this slide
- tables: Array of table objects with rows/cells
- charts: Array of chart objects (type, data, title)
- shapes: Array of shape objects (type, x, y, w, h, fillColor, lineColor)
- images: Array of image objects (url or base64, x, y, width, height)
- textElements: Array of custom positioned text (text, x, y, fontSize, color, bold, italic)`,
          },
        },
        required: ['path', 'title', 'slides'],
      },
    },
  },

  // ============================================================
  // Word Document Tool
  // ============================================================
  {
    type: 'function_call',
    function_call: {
      name: 'create_document',
      description: `Create a professional Word document (.docx) file with rich formatting, tables, lists, and images.

Features:
- Multiple heading levels (heading1-4, title, subtitle)
- Paragraph styles (normal, quote, caption)
- Text formatting (bold, italic, underline, strikethrough, colors, fonts)
- Tables with cell styling and borders
- Bulleted and numbered lists with nesting
- Images via URL or base64
- Headers and footers with page numbers
- Page orientation (portrait/landscape) and margins
- Page size (A4, Letter, Legal)

The path must be relative to the project root and end with .docx.`,
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Output file path relative to project root (must end with .docx, e.g., "output/document.docx")',
          },
          title: {
            type: 'string',
            description: 'Document title',
          },
          author: {
            type: 'string',
            description: 'Author name (optional)',
          },
          content: {
            type: 'array',
            description: `Document content as paragraphs. Each paragraph object has:
- text: Paragraph text (required for simple paragraphs)
- runs: Array of text runs for mixed formatting [{text, bold, italic, underline, color, fontSize, fontFamily}]
- style: "heading1", "heading2", "heading3", "heading4", "normal", "quote", "title", "subtitle", "caption"
- bold: Boolean for bold text
- italic: Boolean for italic text
- alignment: "left", "center", "right", or "justify"
- spacing: {before, after, line} in points
- indent: {left, right, firstLine} in points
- pageBreakBefore: Boolean to start on new page`,
          },
          tables: {
            type: 'array',
            description: `Array of tables. Each table has:
- rows: Array of row objects
  - cells: Array of cell objects {text, bold, italic, align, backgroundColor, textColor, colspan, rowspan}
  - isHeader: Boolean for header row styling
- headerRow: Boolean to style first row as header
- borderColor: Hex color for borders
- alternateRowColor: Hex color for striped rows`,
          },
          lists: {
            type: 'array',
            description: `Array of lists. Each list has:
- type: "bullet" or "number"
- items: Array of {text, level} where level is nesting depth (0-based)`,
          },
          images: {
            type: 'array',
            description: 'Array of images. Each has: url or base64, width, height (in inches), alt text',
          },
          pageSize: {
            type: 'string',
            description: 'Page size: "A4" (default), "LETTER", or "LEGAL"',
          },
          orientation: {
            type: 'string',
            description: 'Page orientation: "portrait" (default) or "landscape"',
          },
          margins: {
            type: 'object',
            description: 'Page margins in points: {top, right, bottom, left}',
          },
          header: {
            type: 'object',
            description: 'Document header: {text, alignment: "left"|"center"|"right"}',
          },
          footer: {
            type: 'object',
            description: 'Document footer: {text, includePageNumbers: boolean, alignment: "left"|"center"|"right"}',
          },
        },
        required: ['path', 'title', 'content'],
      },
    },
  },

  // ============================================================
  // PDF Document Tool
  // ============================================================
  {
    type: 'function_call',
    function_call: {
      name: 'create_pdf',
      description: `Create a professional PDF document with sections, tables, images, and advanced layout.

Features:
- Title page with metadata
- Multiple heading levels with automatic styling
- Tables with borders and cell styling
- Images via URL or base64
- Headers and footers with page numbers
- Automatic table of contents generation
- Page size (A4, Letter, Legal, A3, A5)
- Page orientation (portrait/landscape)
- Custom margins and styling

The path must be relative to the project root and end with .pdf.`,
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Output file path relative to project root (must end with .pdf, e.g., "output/report.pdf")',
          },
          title: {
            type: 'string',
            description: 'Document title (appears on title page)',
          },
          author: {
            type: 'string',
            description: 'Author name (optional)',
          },
          company: {
            type: 'string',
            description: 'Company name (optional, appears on title page)',
          },
          sections: {
            type: 'array',
            description: `Document sections. Each section has:
- heading: Section heading text
- headingLevel: 1, 2, or 3 for different sizes
- paragraphs: Array of paragraph strings (required)
- style: {fontSize, fontFamily, fontStyle, color, alignment}
- tables: Array of table objects for this section
- images: Array of image objects for this section
- pageBreakBefore: Boolean to start section on new page`,
          },
          pageSize: {
            type: 'string',
            description: 'Page size: "a4" (default), "letter", "legal", "a3", or "a5"',
          },
          orientation: {
            type: 'string',
            description: 'Page orientation: "portrait" (default) or "landscape"',
          },
          margins: {
            type: 'object',
            description: 'Page margins in mm: {top, right, bottom, left}',
          },
          header: {
            type: 'object',
            description: 'Page header: {text, alignment: "left"|"center"|"right", fontSize}',
          },
          footer: {
            type: 'object',
            description: `Page footer: {
  text: Optional footer text,
  includePageNumbers: Boolean (default true),
  pageNumberFormat: "Page X of Y", "Page X", "X", or "X/Y",
  alignment: "left"|"center"|"right"
}`,
          },
          tableOfContents: {
            type: 'object',
            description: 'Table of contents: {title: string, maxLevel: 1-3}. Automatically lists all section headings.',
          },
          defaultStyle: {
            type: 'object',
            description: 'Default text style: {fontSize, fontFamily: "helvetica"|"times"|"courier", fontStyle: "normal"|"bold"|"italic", color}',
          },
        },
        required: ['path', 'title', 'sections'],
      },
    },
  },
];
