/**
 * Document Generation AIX Tool Definitions
 * Professional-level OpenAI-compatible function call definitions for document creation tools
 */

import type { AixTools_ToolDefinition } from '~/modules/aix/server/api/aix.wiretypes';

export const DOCUMENT_TOOLS: AixTools_ToolDefinition[] = [
  // ============================================================
  // PowerPoint Presentation Tool (Professional Edition)
  // ============================================================
  {
    type: 'function_call',
    function_call: {
      name: 'create_presentation',
      description: `Create a professional, visually polished PowerPoint presentation (.pptx).

## PROFESSIONAL DESIGN GUIDELINES

**Step 1: Choose a theme preset** (RECOMMENDED for professional results):
- "corporate": Navy blue, clean look - ideal for business presentations
- "modern": Minimalist white with bold typography - perfect for tech demos
- "dark": Sophisticated dark theme with gold accents - great for executive presentations
- "nature": Earthy greens with organic feel - ideal for environmental/health topics
- "tech": Dark with vibrant purple/cyan - perfect for tech/startup presentations

**Step 2: Customize if needed** (optional):
You can override any preset color by specifying custom values:
- backgroundColor, primaryColor, textColor, accentColor, surfaceColor
- fontFamily, titleFontFamily
- enableShadows: true/false

**Step 3: Choose the right layout for each slide**:
OPENING:
- "title": Opening slide with centered title and subtitle (ALWAYS use for first slide)

KEY MESSAGES:
- "hero": Large impactful statement - use for key takeaways
- "quote": Centered quote with attribution - use for testimonials

CONTENT:
- "content": Standard bullet points
- "two-column": Split content into two columns
- "comparison": Side-by-side comparison with headers

DATA & VISUALS:
- "stats": Display 2-4 key statistics with big numbers and labels
- "image-left" / "image-right": Image with text beside it
- "image-full": Full-bleed background image with text overlay
- "grid-2x2" / "grid-3": Equal grid sections

STRUCTURE:
- "section": Section divider between major topics
- "agenda": Numbered agenda items
- "timeline": Horizontal timeline with milestones

CLOSING:
- "closing": Thank you / Q&A / contact slide (ALWAYS use for last slide)

**Professional presentation structure example**:
1. Title slide (layout: "title")
2. Agenda (layout: "agenda" or "content")
3. Key insight (layout: "hero")
4. Details (layout: "content" or "two-column")
5. Statistics (layout: "stats")
6. Visual (layout: "image-left" or "image-right")
7. Quote/Testimonial (layout: "quote")
8. Section divider (layout: "section")
9. More content...
10. Closing (layout: "closing")

**Content best practices**:
- Keep bullet points concise (5-7 words each)
- Use 3-5 bullets per slide maximum
- Include speaker notes for key talking points
- Use stats layout for impressive numbers
- End with a closing slide

The path must be relative to the project root and end with .pptx.`,
      input_schema: {
        properties: {
          path: {
            type: 'string',
            description: 'Output file path (must end with .pptx)',
          },
          title: {
            type: 'string',
            description: 'Presentation title',
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
            description: `Theme configuration. Use a preset for professional results, customize as needed.

PRESETS (recommended):
- preset: "corporate" | "modern" | "dark" | "nature" | "tech"
- enableShadows: true (default for presets) - adds depth and polish

CUSTOM COLORS (override preset or use standalone):
- backgroundColor: Slide background (hex, e.g., "1a1a2e")
- primaryColor: Title text (hex)
- textColor: Body text (hex)
- accentColor: Highlights, stats, key elements (hex)
- surfaceColor: Cards/shapes background (hex)
- secondaryColor: Subtitles (hex)

CUSTOM FONTS:
- fontFamily: Body text font (e.g., "Segoe UI")
- titleFontFamily: Title font (e.g., "Georgia")

Example: { "preset": "corporate", "accentColor": "FF5500" } uses corporate theme with custom orange accent.`,
          },
          slideSize: {
            type: 'string',
            description: 'Slide aspect ratio: "LAYOUT_16x9" (default), "LAYOUT_16x10", "LAYOUT_4x3", or "LAYOUT_WIDE"',
          },
          slides: {
            type: 'array',
            description: `Array of slides. Each slide supports:

BASIC CONTENT:
- layout: Choose from layouts above (see guidelines)
- title: Slide title
- subtitle: For title/hero/section slides
- content: Array of bullet points (keep concise!)
- notes: Speaker notes

SPECIAL LAYOUTS:
- stats: Array of {value, label, color?} for stats layout
  Example: [{"value": "95%", "label": "Customer satisfaction"}, {"value": "10K+", "label": "Active users"}]
- quote: {text, attribution?} for quote layout
  Example: {"text": "This changed everything.", "attribution": "Jane Doe, CEO"}
- backgroundImage: {url, overlay?, overlayOpacity?} for dramatic effect

ADVANCED (optional):
- tables: Array of tables with rows/cells
- charts: Array of charts (bar, line, pie, doughnut, area)
- images: Array of images (url or base64, x, y, width, height)
- shapes: Array of shapes (rectangle, ellipse, triangle, line, arrow)
- textElements: Custom positioned text elements`,
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
