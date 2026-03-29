/**
 * PowerPoint Generation - Professional Level
 * Creates PPTX files from structured data using pptxgenjs
 *
 * Features:
 * - Professional theme presets with coordinated colors and fonts
 * - 18 layout types for different content needs
 * - Shadow support for depth and visual polish
 * - Background image support with overlays
 * - Statistics, quotes, and other special slide types
 *
 * NOTE: pptxgenjs is loaded via CDN at runtime to avoid webpack bundling issues
 */

import type {
  PptxDocument,
  PptxSlide,
  PptxTheme,
  DocumentTable,
  PptxChart,
  PptxStatistic,
  PptxQuote,
  PptxBackgroundImage,
} from '../documents.types';
import { THEME_PRESETS, type PptxThemePreset, type PptxShadowConfig } from '../pptx/pptx.themes';
import { LAYOUT_DEFINITIONS, type PptxLayoutId, type DecorativeShapeConfig } from '../pptx/pptx.layouts';

// Declare global PptxGenJS type (loaded from CDN)
declare global {
  interface Window {
    PptxGenJS: any;
  }
}

// CDN URL for pptxgenjs
const PPTXGENJS_CDN = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';

/**
 * Resolved theme with all colors and settings
 */
interface ResolvedTheme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    accent: string;
    accentAlt: string;
    muted: string;
  };
  fonts: {
    title: string;
    body: string;
  };
  shadows: {
    card: PptxShadowConfig;
    subtle: PptxShadowConfig;
  };
  enableShadows: boolean;
}

// Default theme colors (fallback)
const DEFAULT_THEME: ResolvedTheme = {
  colors: {
    background: 'FFFFFF',
    surface: 'F5F7FA',
    primary: '333333',
    secondary: '666666',
    text: '666666',
    accent: '0066CC',
    accentAlt: '38A169',
    muted: 'E2E8F0',
  },
  fonts: {
    title: 'Arial',
    body: 'Arial',
  },
  shadows: {
    card: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 135, opacity: 0.1 },
    subtle: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 135, opacity: 0.06 },
  },
  enableShadows: false,
};

// Load pptxgenjs from CDN (browser-compatible version)
async function loadPptxGenJS(): Promise<any> {
  if (typeof window !== 'undefined' && window.PptxGenJS) {
    return window.PptxGenJS;
  }

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

// Helper: Normalize hex color (remove # if present, uppercase for pptxgenjs)
function normalizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback.toUpperCase();
  return color.replace(/^#/, '').toUpperCase();
}

/**
 * Resolve theme from preset + custom overrides
 */
function resolveTheme(themeConfig?: PptxTheme): ResolvedTheme {
  // Start with defaults
  let resolved = { ...DEFAULT_THEME };

  // If preset specified, use it as base
  if (themeConfig?.preset && THEME_PRESETS[themeConfig.preset]) {
    const preset = THEME_PRESETS[themeConfig.preset];
    resolved = {
      colors: { ...preset.colors },
      fonts: { ...preset.fonts },
      shadows: { ...preset.shadows },
      enableShadows: preset.enableShadows,
    };
  }

  // Apply custom overrides
  if (themeConfig) {
    if (themeConfig.backgroundColor) resolved.colors.background = normalizeColor(themeConfig.backgroundColor, resolved.colors.background);
    if (themeConfig.primaryColor) resolved.colors.primary = normalizeColor(themeConfig.primaryColor, resolved.colors.primary);
    if (themeConfig.textColor) resolved.colors.text = normalizeColor(themeConfig.textColor, resolved.colors.text);
    if (themeConfig.accentColor) resolved.colors.accent = normalizeColor(themeConfig.accentColor, resolved.colors.accent);
    if (themeConfig.surfaceColor) resolved.colors.surface = normalizeColor(themeConfig.surfaceColor, resolved.colors.surface);
    if (themeConfig.secondaryColor) resolved.colors.secondary = normalizeColor(themeConfig.secondaryColor, resolved.colors.secondary);
    if (themeConfig.fontFamily) resolved.fonts.body = themeConfig.fontFamily;
    if (themeConfig.titleFontFamily) resolved.fonts.title = themeConfig.titleFontFamily;
    if (themeConfig.enableShadows !== undefined) resolved.enableShadows = themeConfig.enableShadows;
  }

  return resolved;
}

/**
 * Convert shadow config to pptxgenjs format
 */
function convertShadow(shadow: PptxShadowConfig): any {
  return {
    type: shadow.type,
    color: shadow.color,
    blur: shadow.blur,
    offset: shadow.offset,
    angle: shadow.angle,
    opacity: shadow.opacity,
  };
}

/**
 * Add decorative shapes to a slide
 */
function addDecorativeShapes(slide: any, shapes: DecorativeShapeConfig[] | undefined, theme: ResolvedTheme, pptx: any) {
  if (!shapes) return;

  for (const shape of shapes) {
    const color = theme.colors[shape.colorKey as keyof typeof theme.colors] || theme.colors.accent;

    if (shape.type === 'text' && shape.text) {
      // Decorative text (like quote marks)
      slide.addText(shape.text, {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        fontSize: shape.fontSize || 80,
        color: color,
        transparency: shape.opacity ? Math.round((1 - shape.opacity) * 100) : 80,
        fontFace: theme.fonts.title,
      });
    } else if (shape.type === 'line') {
      // Line shape
      slide.addShape(pptx.ShapeType.line, {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        line: { color: color, width: shape.lineWidth || 2 },
      });
    } else if (shape.type === 'ellipse') {
      // Ellipse/circle
      slide.addShape(pptx.ShapeType.ellipse, {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        fill: { color: color },
      });
    } else {
      // Rectangle
      const rectOpts: any = {
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
        fill: { color: color, transparency: shape.opacity ? Math.round((1 - shape.opacity) * 100) : 0 },
      };
      if (shape.cornerRadius) {
        rectOpts.rectRadius = shape.cornerRadius;
      }
      if (shape.shadow && theme.enableShadows) {
        rectOpts.shadow = convertShadow(theme.shadows.card);
      }
      slide.addShape(pptx.ShapeType.rect, rectOpts);
    }
  }
}

/**
 * Apply background image to slide
 */
function applyBackgroundImage(slide: any, bgConfig: PptxBackgroundImage, pptx: any) {
  // Add image as background
  if (bgConfig.url) {
    slide.addImage({
      path: bgConfig.url,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'cover', w: 10, h: 5.625 },
    });
  } else if (bgConfig.base64) {
    slide.addImage({
      data: bgConfig.base64,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
      sizing: { type: 'cover', w: 10, h: 5.625 },
    });
  }

  // Add overlay for text readability
  if (bgConfig.overlay) {
    const overlayOpacity = bgConfig.overlayOpacity ?? 50;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 5.625,
      fill: {
        color: normalizeColor(bgConfig.overlay, '000000'),
        transparency: 100 - overlayOpacity,
      },
    });
  }
}

// Helper: Add a table to a slide
function addTableToSlide(
  slide: any,
  table: DocumentTable & { x?: number; y?: number; w?: number },
  theme: ResolvedTheme
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
          fill: { color: normalizeColor(cell.backgroundColor, row.isHeader ? theme.colors.surface : 'FFFFFF') },
          color: normalizeColor(cell.textColor, theme.colors.text),
        },
      });
    }
    tableData.push(rowData);
  }

  slide.addTable(tableData, {
    x: table.x ?? 0.5,
    y: table.y ?? 1.5,
    w: table.w ?? 9,
    border: { pt: 1, color: normalizeColor(table.borderColor, theme.colors.muted) },
    fontFace: theme.fonts.body,
    fontSize: 12,
    valign: 'middle',
    rowH: 0.5,
  });
}

// Helper: Add a chart to a slide
function addChartToSlide(slide: any, chart: PptxChart, pptx: any, theme: ResolvedTheme) {
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
    color: dataset.color ? normalizeColor(dataset.color, theme.colors.accent) : undefined,
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
function addShapeToSlide(slide: any, shape: any, pptx: any, theme: ResolvedTheme) {
  const shapeTypeMap: Record<string, string> = {
    rectangle: pptx.ShapeType.rect,
    ellipse: pptx.ShapeType.ellipse,
    triangle: pptx.ShapeType.triangle,
    line: pptx.ShapeType.line,
    arrow: pptx.ShapeType.rightArrow,
  };

  const shapeOpts: any = {
    x: shape.x,
    y: shape.y,
    w: shape.w,
    h: shape.h,
    fill: { color: normalizeColor(shape.fillColor, theme.colors.muted) },
    line: shape.lineColor ? { color: normalizeColor(shape.lineColor, theme.colors.primary), pt: shape.lineWidth || 1 } : undefined,
  };

  if (theme.enableShadows) {
    shapeOpts.shadow = convertShadow(theme.shadows.subtle);
  }

  slide.addShape(shapeTypeMap[shape.type] || pptx.ShapeType.rect, shapeOpts);
}

/**
 * Main generator function
 */
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

  // Resolve theme (preset + custom overrides)
  const theme = resolveTheme(doc.theme);

  // Define master slide with theme
  pptx.defineSlideMaster({
    title: 'THEMED_MASTER',
    background: { color: theme.colors.background },
  });

  // Create slides
  for (let i = 0; i < doc.slides.length; i++) {
    const slideData = doc.slides[i];
    const slide = pptx.addSlide({ masterName: 'THEMED_MASTER' });

    // Apply slide-specific background if set
    if (slideData.backgroundColor) {
      slide.background = { color: normalizeColor(slideData.backgroundColor, theme.colors.background) };
    }

    // Apply background image if set
    if (slideData.backgroundImage) {
      applyBackgroundImage(slide, slideData.backgroundImage, pptx);
    }

    // Determine layout type
    const layout = (slideData.layout || (i === 0 ? 'title' : 'content')) as PptxLayoutId;
    const layoutDef = LAYOUT_DEFINITIONS[layout];

    // Add decorative shapes from layout definition
    if (layoutDef?.decorativeShapes) {
      addDecorativeShapes(slide, layoutDef.decorativeShapes, theme, pptx);
    }

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
      case 'hero':
        renderHeroSlide(slide, slideData, theme);
        break;
      case 'stats':
        renderStatsSlide(slide, slideData, theme, pptx);
        break;
      case 'quote':
        renderQuoteSlide(slide, slideData, theme);
        break;
      case 'closing':
        renderClosingSlide(slide, slideData, theme);
        break;
      case 'image-left':
        renderImageLeftSlide(slide, slideData, theme);
        break;
      case 'image-right':
        renderImageRightSlide(slide, slideData, theme);
        break;
      case 'agenda':
        renderAgendaSlide(slide, slideData, theme);
        break;
      case 'grid-2x2':
      case 'grid-3':
        renderGridSlide(slide, slideData, theme, layout, pptx);
        break;
      case 'timeline':
        renderTimelineSlide(slide, slideData, theme, pptx);
        break;
      case 'blank':
        // Blank slide - only render advanced content
        break;
      default:
        renderContentSlide(slide, slideData, theme);
    }

    // Add advanced content (available on all slide types)
    addAdvancedContent(slide, slideData, theme, pptx);

    // Speaker notes
    if (slideData.notes) {
      slide.addNotes(slideData.notes);
    }
  }

  // Generate as blob
  const output = await pptx.write({ outputType: 'blob' });
  return output as Blob;
}

/**
 * Add advanced content (text elements, tables, charts, shapes, images)
 */
function addAdvancedContent(slide: any, data: PptxSlide, theme: ResolvedTheme, pptx: any) {
  // Custom text elements
  if (data.textElements) {
    for (const textEl of data.textElements) {
      slide.addText(textEl.text, {
        x: textEl.x ?? 0.5,
        y: textEl.y ?? 0.5,
        w: textEl.w ?? 9,
        h: textEl.h ?? 1,
        fontSize: textEl.fontSize ?? 18,
        fontFace: textEl.fontFamily || theme.fonts.body,
        bold: textEl.bold,
        italic: textEl.italic,
        underline: textEl.underline ? { style: 'sng' } : undefined,
        color: normalizeColor(textEl.color, theme.colors.text),
        align: textEl.align || 'left',
      });
    }
  }

  // Tables
  if (data.tables) {
    for (const table of data.tables) {
      addTableToSlide(slide, table, theme);
    }
  }

  // Shapes
  if (data.shapes) {
    for (const shape of data.shapes) {
      addShapeToSlide(slide, shape, pptx, theme);
    }
  }

  // Charts
  if (data.charts) {
    for (const chart of data.charts) {
      addChartToSlide(slide, chart, pptx, theme);
    }
  }

  // Images
  if (data.images) {
    for (const img of data.images) {
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
}

// ============================================================
// LAYOUT RENDERERS
// ============================================================

function renderTitleSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 1.2,
      fontSize: 44,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
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
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
    });
  }
}

function renderSectionSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 2.2,
      w: 9,
      h: 1,
      fontSize: 40,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
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
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
    });
  }
}

function renderContentSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  if (data.content && data.content.length > 0) {
    const bulletItems = data.content.map(text => ({
      text: text + '\n',
      options: {
        bullet: { type: 'bullet' },
        color: theme.colors.text,
        fontFace: theme.fonts.body,
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

function renderTwoColumnSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  if (data.content && data.content.length > 0) {
    const midpoint = Math.ceil(data.content.length / 2);
    const leftContent = data.content.slice(0, midpoint);
    const rightContent = data.content.slice(midpoint);

    if (leftContent.length > 0) {
      const leftItems = leftContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 18 },
      }));
      slide.addText(leftItems, { x: 0.5, y: 1.3, w: 4.25, h: 4, valign: 'top' });
    }

    if (rightContent.length > 0) {
      const rightItems = rightContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 18 },
      }));
      slide.addText(rightItems, { x: 5, y: 1.3, w: 4.25, h: 4, valign: 'top' });
    }
  }
}

function renderComparisonSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  if (data.content && data.content.length >= 2) {
    // Headers
    slide.addText(data.content[0], {
      x: 0.5,
      y: 1.0,
      w: 4.25,
      h: 0.5,
      fontSize: 20,
      bold: true,
      fontFace: theme.fonts.title,
      color: theme.colors.accent,
      align: 'center',
    });

    slide.addText(data.content[1], {
      x: 5,
      y: 1.0,
      w: 4.25,
      h: 0.5,
      fontSize: 20,
      bold: true,
      fontFace: theme.fonts.title,
      color: theme.colors.accentAlt,
      align: 'center',
    });

    // Content
    const remaining = data.content.slice(2);
    const midpoint = Math.ceil(remaining.length / 2);
    const leftContent = remaining.slice(0, midpoint);
    const rightContent = remaining.slice(midpoint);

    if (leftContent.length > 0) {
      const leftItems = leftContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 16 },
      }));
      slide.addText(leftItems, { x: 0.5, y: 1.6, w: 4.25, h: 3.5, valign: 'top' });
    }

    if (rightContent.length > 0) {
      const rightItems = rightContent.map(text => ({
        text: text + '\n',
        options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 16 },
      }));
      slide.addText(rightItems, { x: 5, y: 1.6, w: 4.25, h: 3.5, valign: 'top' });
    }
  }
}

function renderHeroSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.75,
      y: 1.5,
      w: 8.5,
      h: 2.5,
      fontSize: 54,
      bold: true,
      align: 'center',
      valign: 'middle',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 1.5,
      y: 4.2,
      w: 7,
      h: 0.6,
      fontSize: 20,
      align: 'center',
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
    });
  }
}

function renderStatsSlide(slide: any, data: PptxSlide, theme: ResolvedTheme, pptx: any) {
  // Title
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.7,
      fontSize: 28,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Stats - max 3 for best layout
  const stats = data.stats || [];
  const statCount = Math.min(stats.length, 3);
  const cardWidth = 2.8;
  const gap = 0.4;
  const totalWidth = statCount * cardWidth + (statCount - 1) * gap;
  const startX = (10 - totalWidth) / 2;

  for (let i = 0; i < statCount; i++) {
    const stat = stats[i];
    const x = startX + i * (cardWidth + gap);

    // Card background
    if (theme.enableShadows) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: 1.3,
        w: cardWidth,
        h: 3.8,
        fill: { color: theme.colors.surface },
        shadow: convertShadow(theme.shadows.card),
        rectRadius: 0.1,
      });
    } else {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: 1.3,
        w: cardWidth,
        h: 3.8,
        fill: { color: theme.colors.surface },
        rectRadius: 0.1,
      });
    }

    // Big number
    slide.addText(stat.value, {
      x: x,
      y: 1.8,
      w: cardWidth,
      h: 1.5,
      fontSize: 48,
      bold: true,
      align: 'center',
      valign: 'middle',
      color: normalizeColor(stat.color, theme.colors.accent),
      fontFace: theme.fonts.title,
    });

    // Label
    slide.addText(stat.label, {
      x: x,
      y: 3.5,
      w: cardWidth,
      h: 1.2,
      fontSize: 14,
      align: 'center',
      valign: 'top',
      color: theme.colors.text,
      fontFace: theme.fonts.body,
    });
  }
}

function renderQuoteSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  const quote = data.quote;

  // Decorative quote mark (already added via decorative shapes)

  // Quote text
  if (quote?.text) {
    slide.addText(quote.text, {
      x: 1.5,
      y: 1.5,
      w: 7,
      h: 2.5,
      fontSize: 32,
      align: 'center',
      valign: 'middle',
      fontFace: theme.fonts.body,
      color: theme.colors.primary,
      italic: true,
    });
  }

  // Attribution
  if (quote?.attribution) {
    slide.addText('— ' + quote.attribution, {
      x: 1.5,
      y: 4.2,
      w: 7,
      h: 0.5,
      fontSize: 18,
      align: 'center',
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
    });
  }
}

function renderClosingSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 1.8,
      w: 9,
      h: 1.2,
      fontSize: 48,
      bold: true,
      align: 'center',
      valign: 'middle',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }
  if (data.subtitle) {
    slide.addText(data.subtitle, {
      x: 0.5,
      y: 3.2,
      w: 9,
      h: 0.6,
      fontSize: 24,
      align: 'center',
      fontFace: theme.fonts.body,
      color: theme.colors.secondary,
    });
  }
  // Contact info from content
  if (data.content && data.content.length > 0) {
    slide.addText(data.content.join(' | '), {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.8,
      fontSize: 16,
      align: 'center',
      fontFace: theme.fonts.body,
      color: theme.colors.text,
    });
  }
}

function renderImageLeftSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  // Title on right
  if (data.title) {
    slide.addText(data.title, {
      x: 5.0,
      y: 0.5,
      w: 4.5,
      h: 0.8,
      fontSize: 28,
      bold: true,
      align: 'left',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Content on right
  if (data.content && data.content.length > 0) {
    const bulletItems = data.content.map(text => ({
      text: text + '\n',
      options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 18 },
    }));
    slide.addText(bulletItems, { x: 5.0, y: 1.5, w: 4.5, h: 3.8, valign: 'top' });
  }

  // Image placeholder on left (actual image added via advanced content)
}

function renderImageRightSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  // Title on left
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.5,
      w: 4.5,
      h: 0.8,
      fontSize: 28,
      bold: true,
      align: 'left',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Content on left
  if (data.content && data.content.length > 0) {
    const bulletItems = data.content.map(text => ({
      text: text + '\n',
      options: { bullet: { type: 'bullet' }, color: theme.colors.text, fontFace: theme.fonts.body, fontSize: 18 },
    }));
    slide.addText(bulletItems, { x: 0.5, y: 1.5, w: 4.5, h: 3.8, valign: 'top' });
  }

  // Image placeholder on right (actual image added via advanced content)
}

function renderAgendaSlide(slide: any, data: PptxSlide, theme: ResolvedTheme) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.8,
      fontSize: 32,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Numbered agenda items
  if (data.content && data.content.length > 0) {
    const agendaItems = data.content.map((text, i) => ({
      text: `${i + 1}. ${text}\n`,
      options: {
        color: theme.colors.text,
        fontFace: theme.fonts.body,
        fontSize: 22,
        paraSpaceAfter: 12,
      },
    }));
    slide.addText(agendaItems, { x: 1.5, y: 1.3, w: 7, h: 4, valign: 'top' });
  }
}

function renderGridSlide(slide: any, data: PptxSlide, theme: ResolvedTheme, layout: string, pptx: any) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Grid items from content
  const items = data.content || [];
  const cols = layout === 'grid-2x2' ? 2 : 3;
  const rows = layout === 'grid-2x2' ? 2 : 1;
  const cardWidth = cols === 2 ? 4.25 : 2.8;
  const cardHeight = rows === 2 ? 2.0 : 4.2;
  const gap = 0.25;

  for (let i = 0; i < items.length && i < cols * rows; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.5 + col * (cardWidth + gap);
    const y = 1.1 + row * (cardHeight + gap);

    // Card background
    if (theme.enableShadows) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x,
        y: y,
        w: cardWidth,
        h: cardHeight,
        fill: { color: theme.colors.surface },
        shadow: convertShadow(theme.shadows.card),
        rectRadius: 0.1,
      });
    }

    // Text
    slide.addText(items[i], {
      x: x + 0.2,
      y: y + 0.2,
      w: cardWidth - 0.4,
      h: cardHeight - 0.4,
      fontSize: 16,
      align: 'center',
      valign: 'middle',
      fontFace: theme.fonts.body,
      color: theme.colors.text,
    });
  }
}

function renderTimelineSlide(slide: any, data: PptxSlide, theme: ResolvedTheme, pptx: any) {
  if (data.title) {
    slide.addText(data.title, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 28,
      bold: true,
      align: 'center',
      fontFace: theme.fonts.title,
      color: theme.colors.primary,
    });
  }

  // Timeline items from content
  const items = data.content || [];
  const itemCount = Math.min(items.length, 4);
  const gap = 9 / (itemCount + 1);

  // Timeline line (decorative shapes handle this)

  // Timeline points and labels
  for (let i = 0; i < itemCount; i++) {
    const x = 0.5 + gap * (i + 1);

    // Point
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x - 0.15,
      y: 2.35,
      w: 0.3,
      h: 0.3,
      fill: { color: theme.colors.accent },
    });

    // Label
    slide.addText(items[i], {
      x: x - 1,
      y: 3.0,
      w: 2,
      h: 2,
      fontSize: 14,
      align: 'center',
      valign: 'top',
      fontFace: theme.fonts.body,
      color: theme.colors.text,
    });
  }
}
