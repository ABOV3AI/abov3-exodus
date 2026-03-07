/**
 * PowerPoint Generation - Professional Level
 * Creates PPTX files from structured data using pptxgenjs
 *
 * NOTE: pptxgenjs is loaded via CDN at runtime to avoid webpack bundling issues
 * with Node.js dependencies (node:fs).
 */

import type { PptxDocument, PptxSlide, PptxTheme, DocumentTable, PptxChart } from '../documents.types';

// Declare global PptxGenJS type (loaded from CDN)
declare global {
  interface Window {
    PptxGenJS: any;
  }
}

// CDN URL for pptxgenjs
const PPTXGENJS_CDN = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';

// Load pptxgenjs from CDN (browser-compatible version)
async function loadPptxGenJS(): Promise<any> {
  // Check if already loaded
  if (typeof window !== 'undefined' && window.PptxGenJS) {
    return window.PptxGenJS;
  }

  // Load script from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PPTXGENJS_CDN;
    script.async = true;
    script.onload = () => {
      if (window.PptxGenJS) {
        resolve(window.PptxGenJS);
      } else {
        reject(new Error('PptxGenJS not found after loading script'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PptxGenJS from CDN'));
    document.head.appendChild(script);
  });
}

// Default theme colors
const DEFAULT_THEME: Required<Pick<PptxTheme, 'backgroundColor' | 'primaryColor' | 'textColor' | 'accentColor'>> = {
  backgroundColor: 'FFFFFF',
  primaryColor: '333333',
  textColor: '666666',
  accentColor: '0066CC',
};

// Helper: Normalize hex color (remove # if present, uppercase for pptxgenjs)
function normalizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback.toUpperCase();
  return color.replace(/^#/, '').toUpperCase();
}

// Helper: Add a table to a slide
function addTableToSlide(
  slide: any,
  table: DocumentTable & { x?: number; y?: number; w?: number },
  theme: PptxTheme
) {
  const tableData: any[][] = [];

  for (const row of table.rows) {
    const rowData: any[] = [];
    for (const cell of row.cells) {
      rowData.push({
        text: cell.text,
        options: {
          bold: cell.bold || row.isHeader,
          italic: cell.italic,
          align: cell.align || 'left',
          fill: { color: normalizeColor(cell.backgroundColor, row.isHeader ? 'E0E0E0' : 'FFFFFF') },
          color: normalizeColor(cell.textColor, theme.textColor || DEFAULT_THEME.textColor),
        },
      });
    }
    tableData.push(rowData);
  }

  slide.addTable(tableData, {
    x: table.x ?? 0.5,
    y: table.y ?? 1.5,
    w: table.w ?? 9,
    border: { pt: 1, color: normalizeColor(table.borderColor, 'CCCCCC') },
    fontFace: theme.fontFamily || 'Arial',
    fontSize: 12,
    valign: 'middle',
    rowH: 0.5,
  });
}

// Helper: Add a chart to a slide
function addChartToSlide(slide: any, chart: PptxChart, pptx: any) {
  const chartTypeMap: Record<string, string> = {
    bar: pptx.ChartType.bar,
    line: pptx.ChartType.line,
    pie: pptx.ChartType.pie,
    doughnut: pptx.ChartType.doughnut,
    area: pptx.ChartType.area,
  };

  const chartData = chart.data.datasets.map((dataset) => ({
    name: dataset.name,
    labels: chart.data.labels,
    values: dataset.values,
    color: dataset.color ? normalizeColor(dataset.color, '0066CC') : undefined,
  }));

  slide.addChart(chartTypeMap[chart.type] || pptx.ChartType.bar, chartData, {
    x: chart.x ?? 0.5,
    y: chart.y ?? 1.5,
    w: chart.w ?? 8,
    h: chart.h ?? 4,
    showTitle: !!chart.title,
    title: chart.title,
    showLegend: chart.showLegend ?? true,
    showValue: chart.showValues ?? false,
  });
}

// Helper: Add shapes to a slide
function addShapeToSlide(slide: any, shape: any, pptx: any) {
  const shapeTypeMap: Record<string, string> = {
    rectangle: pptx.ShapeType.rect,
    ellipse: pptx.ShapeType.ellipse,
    triangle: pptx.ShapeType.triangle,
    line: pptx.ShapeType.line,
    arrow: pptx.ShapeType.rightArrow,
  };

  slide.addShape(shapeTypeMap[shape.type] || pptx.ShapeType.rect, {
    x: shape.x,
    y: shape.y,
    w: shape.w,
    h: shape.h,
    fill: { color: normalizeColor(shape.fillColor, 'CCCCCC') },
    line: shape.lineColor ? { color: normalizeColor(shape.lineColor, '333333'), pt: shape.lineWidth || 1 } : undefined,
  });
}

export async function generatePptx(doc: PptxDocument): Promise<Blob> {
  // Load library from CDN
  const PptxGenJS = await loadPptxGenJS();
  const pptx = new PptxGenJS();

  // Set slide size if specified
  if (doc.slideSize) {
    pptx.defineLayout({ name: doc.slideSize, width: 10, height: 5.625 });
    pptx.layout = doc.slideSize;
  }

  // Set metadata
  pptx.title = doc.metadata.title;
  if (doc.metadata.author) pptx.author = doc.metadata.author;
  if (doc.metadata.subject) pptx.subject = doc.metadata.subject;
  if (doc.metadata.company) pptx.company = doc.metadata.company;

  // Get theme with defaults
  const theme: PptxTheme = {
    backgroundColor: normalizeColor(doc.theme?.backgroundColor, DEFAULT_THEME.backgroundColor),
    primaryColor: normalizeColor(doc.theme?.primaryColor, DEFAULT_THEME.primaryColor),
    textColor: normalizeColor(doc.theme?.textColor, DEFAULT_THEME.textColor),
    accentColor: normalizeColor(doc.theme?.accentColor, DEFAULT_THEME.accentColor),
    fontFamily: doc.theme?.fontFamily || 'Arial',
    titleFontFamily: doc.theme?.titleFontFamily || doc.theme?.fontFamily || 'Arial',
  };

  // Define master slide with theme
  pptx.defineSlideMaster({
    title: 'THEMED_MASTER',
    background: { color: theme.backgroundColor },
  });

  // Create slides
  for (let i = 0; i < doc.slides.length; i++) {
    const slideData = doc.slides[i];
    const slide = pptx.addSlide({ masterName: 'THEMED_MASTER' });

    // Apply slide-specific background if set
    if (slideData.backgroundColor) {
      slide.background = { color: normalizeColor(slideData.backgroundColor, theme.backgroundColor!) };
    }

    // Determine layout type
    const layout = slideData.layout || (i === 0 ? 'title' : 'content');

    // Render based on layout
    switch (layout) {
      case 'title':
        renderTitleSlide(slide, slideData, theme);
        break;
      case 'section':
        renderSectionSlide(slide, slideData, theme);
        break;
      case 'two-column':
        renderTwoColumnSlide(slide, slideData, theme);
        break;
      case 'comparison':
        renderComparisonSlide(slide, slideData, theme);
        break;
      case 'blank':
        // Blank slide - only render advanced content
        break;
      default:
        renderContentSlide(slide, slideData, theme);
    }

    // Add advanced content (available on all slide types)

    // Custom text elements
    if (slideData.textElements) {
      for (const textEl of slideData.textElements) {
        slide.addText(textEl.text, {
          x: textEl.x ?? 0.5,
          y: textEl.y ?? 0.5,
          w: textEl.w ?? 9,
          h: textEl.h ?? 1,
          fontSize: textEl.fontSize ?? 18,
          fontFace: textEl.fontFamily || theme.fontFamily,
          bold: textEl.bold,
          italic: textEl.italic,
          underline: textEl.underline ? { style: 'sng' } : undefined,
          color: normalizeColor(textEl.color, theme.textColor!),
          align: textEl.align || 'left',
        });
      }
    }

    // Tables
    if (slideData.tables) {
      for (const table of slideData.tables) {
        addTableToSlide(slide, table, theme);
      }
    }

    // Shapes
    if (slideData.shapes) {
      for (const shape of slideData.shapes) {
        addShapeToSlide(slide, shape, pptx);
      }
    }

    // Charts
    if (slideData.charts) {
      for (const chart of slideData.charts) {
        addChartToSlide(slide, chart, pptx);
      }
    }

    // Images
    if (slideData.images) {
      for (const img of slideData.images) {
        if (img.url || img.base64) {
          slide.addImage({
            path: img.url,
            data: img.base64,
            x: img.x ?? 0.5,
            y: img.y ?? 1.5,
            w: img.width ?? 4,
            h: img.height ?? 3,
          });
        }
      }
    }

    // Speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  // Generate as blob
  const output = await pptx.write({ outputType: 'blob' });
  return output as Blob;
}

// Render: Title Slide
function renderTitleSlide(slide: any, data: PptxSlide, theme: PptxTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.2,
      fontSize: 44,
      bold: true,
      align: 'center',
      fontFace: theme.titleFontFamily,
      color: theme.primaryColor,
    });
  }
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.4,
      w: 9,
      h: 0.6,
      fontSize: 24,
      align: 'center',
      fontFace: theme.fontFamily,
      color: theme.textColor,
    });
  }
}

// Render: Section Header Slide
function renderSectionSlide(slide: any, data: PptxSlide, theme: PptxTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 2.2,
      w: 9,
      h: 1,
      fontSize: 40,
      bold: true,
      align: 'center',
      fontFace: theme.titleFontFamily,
      color: theme.primaryColor,
    });
  }
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.4,
      w: 9,
      h: 0.5,
      fontSize: 20,
      align: 'center',
      fontFace: theme.fontFamily,
      color: theme.textColor,
    });
  }
}

// Render: Content Slide
function renderContentSlide(slide: any, data: PptxSlide, theme: PptxTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      fontFace: theme.titleFontFamily,
      color: theme.primaryColor,
    });
  }

  if (data.content && data.content.length > 0) {
    // Build bullet list with explicit color on each line
    const bulletItems = data.content.map(text => ({
      text: text + '\n',
      options: {
        bullet: { type: 'bullet' },
        color: theme.textColor,
        fontFace: theme.fontFamily,
        fontSize: 20,
      },
    }));

    slide.addText(bulletItems, {
      x: 0.5,
      y: 1.3,
      w: 9,
      h: 4,
      valign: 'top',
    });
  }
}

// Render: Two-Column Slide
function renderTwoColumnSlide(slide: any, data: PptxSlide, theme: PptxTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      fontFace: theme.titleFontFamily,
      color: theme.primaryColor,
    });
  }

  if (data.content && data.content.length > 0) {
    const midpoint = Math.ceil(data.content.length / 2);
    const leftContent = data.content.slice(0, midpoint);
    const rightContent = data.content.slice(midpoint);

    if (leftContent.length > 0) {
      const leftItems = leftContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.textColor, fontFace: theme.fontFamily, fontSize: 18 },
      }));
      slide.addText(leftItems, { x: 0.5, y: 1.3, w: 4.25, h: 4, valign: 'top' });
    }

    if (rightContent.length > 0) {
      const rightItems = rightContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.textColor, fontFace: theme.fontFamily, fontSize: 18 },
      }));
      slide.addText(rightItems, { x: 5, y: 1.3, w: 4.25, h: 4, valign: 'top' });
    }
  }
}

// Render: Comparison Slide (side-by-side with headers)
function renderComparisonSlide(slide: any, data: PptxSlide, theme: PptxTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      fontFace: theme.titleFontFamily,
      color: theme.primaryColor,
    });
  }

  // Left side header and content
  if (data.content && data.content.length >= 2) {
    // First item as left header
    slide.addText(data.content[0], {
      x: 0.5,
      y: 1.0,
      w: 4.25,
      h: 0.5,
      fontSize: 20,
      bold: true,
      fontFace: theme.titleFontFamily,
      color: theme.accentColor,
      align: 'center',
    });

    // Second item as right header
    slide.addText(data.content[1], {
      x: 5,
      y: 1.0,
      w: 4.25,
      h: 0.5,
      fontSize: 20,
      bold: true,
      fontFace: theme.titleFontFamily,
      color: theme.accentColor,
      align: 'center',
    });

    // Remaining items split between columns
    const remaining = data.content.slice(2);
    const midpoint = Math.ceil(remaining.length / 2);
    const leftContent = remaining.slice(0, midpoint);
    const rightContent = remaining.slice(midpoint);

    if (leftContent.length > 0) {
      const leftItems = leftContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.textColor, fontFace: theme.fontFamily, fontSize: 16 },
      }));
      slide.addText(leftItems, { x: 0.5, y: 1.6, w: 4.25, h: 3.5, valign: 'top' });
    }

    if (rightContent.length > 0) {
      const rightItems = rightContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.textColor, fontFace: theme.fontFamily, fontSize: 16 },
      }));
      slide.addText(rightItems, { x: 5, y: 1.6, w: 4.25, h: 3.5, valign: 'top' });
    }
  }
}
