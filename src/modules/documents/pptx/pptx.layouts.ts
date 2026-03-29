/**
 * Professional Layout Definitions for PowerPoint Generation
 *
 * Each layout defines regions (positions/sizes) for content placement
 * and optional decorative elements for visual polish.
 */

/**
 * Layout region - defines where content goes on a slide
 */
export interface LayoutRegion {
  name: 'title' | 'subtitle' | 'content' | 'leftContent' | 'rightContent' | 'image' |
        'quote' | 'attribution' | 'stat1' | 'stat2' | 'stat3' | 'stat4' |
        'leftHeader' | 'rightHeader' | 'timelineBar' | 'agendaItems' | 'contactInfo';
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

/**
 * Decorative shape configuration
 */
export interface DecorativeShapeConfig {
  type: 'rectangle' | 'line' | 'text' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  colorKey: 'background' | 'surface' | 'primary' | 'secondary' | 'text' | 'accent' | 'accentAlt' | 'muted';
  opacity?: number;
  lineWidth?: number;
  cornerRadius?: number;
  shadow?: boolean;
  text?: string;
  fontSize?: number;
}

/**
 * All available layout types
 */
export type PptxLayoutId =
  // Basic layouts (existing)
  | 'title'           // Full title slide
  | 'content'         // Title + bullet points
  | 'two-column'      // Two columns of content
  | 'section'         // Section divider
  | 'comparison'      // Side-by-side comparison
  | 'blank'           // Empty canvas
  // New professional layouts
  | 'hero'            // Large statement/quote
  | 'image-left'      // Image on left, text on right
  | 'image-right'     // Image on right, text on left
  | 'image-full'      // Full-bleed image with text overlay
  | 'grid-2x2'        // 4 equal boxes
  | 'grid-3'          // 3 columns
  | 'timeline'        // Horizontal timeline
  | 'agenda'          // Numbered agenda items
  | 'team'            // Team/profile cards
  | 'stats'           // Big number statistics
  | 'quote'           // Centered quote with attribution
  | 'closing';        // Thank you / Q&A slide

/**
 * Full layout definition
 */
export interface LayoutDefinition {
  id: PptxLayoutId;
  name: string;
  description: string;
  regions: LayoutRegion[];
  decorativeShapes?: DecorativeShapeConfig[];
}

/**
 * All layout definitions
 * Coordinates are in inches (10" wide x 5.625" tall for 16:9)
 */
export const LAYOUT_DEFINITIONS: Record<PptxLayoutId, LayoutDefinition> = {

  // ============================================================
  // EXISTING LAYOUTS (Enhanced)
  // ============================================================

  title: {
    id: 'title',
    name: 'Title Slide',
    description: 'Opening slide with centered title and subtitle',
    regions: [
      { name: 'title', x: 0.5, y: 2.0, w: 9, h: 1.2, fontSize: 44, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'subtitle', x: 0.5, y: 3.4, w: 9, h: 0.8, fontSize: 24, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0, y: 4.8, w: 10, h: 0.825, colorKey: 'accent', opacity: 1 },
    ],
  },

  content: {
    id: 'content',
    name: 'Content',
    description: 'Standard slide with title and bullet points',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 32, fontWeight: 'bold', align: 'left' },
      { name: 'content', x: 0.5, y: 1.3, w: 9, h: 4, fontSize: 20, align: 'left', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'line', x: 0.5, y: 1.1, w: 1.5, h: 0, colorKey: 'accent', lineWidth: 4 },
    ],
  },

  'two-column': {
    id: 'two-column',
    name: 'Two Column',
    description: 'Split content into two columns',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 32, fontWeight: 'bold', align: 'left' },
      { name: 'leftContent', x: 0.5, y: 1.3, w: 4.25, h: 4, fontSize: 18, align: 'left', valign: 'top' },
      { name: 'rightContent', x: 5, y: 1.3, w: 4.25, h: 4, fontSize: 18, align: 'left', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'line', x: 4.85, y: 1.3, w: 0, h: 3.5, colorKey: 'muted', lineWidth: 1 },
    ],
  },

  section: {
    id: 'section',
    name: 'Section Divider',
    description: 'Section header to divide major topics',
    regions: [
      { name: 'title', x: 0.5, y: 2.0, w: 9, h: 1.2, fontSize: 40, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'subtitle', x: 0.5, y: 3.4, w: 9, h: 0.6, fontSize: 20, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0, y: 0, w: 0.3, h: 5.625, colorKey: 'accent', opacity: 1 },
    ],
  },

  comparison: {
    id: 'comparison',
    name: 'Comparison',
    description: 'Side-by-side comparison with headers',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'leftHeader', x: 0.5, y: 1.0, w: 4.25, h: 0.5, fontSize: 20, fontWeight: 'bold', align: 'center' },
      { name: 'rightHeader', x: 5, y: 1.0, w: 4.25, h: 0.5, fontSize: 20, fontWeight: 'bold', align: 'center' },
      { name: 'leftContent', x: 0.5, y: 1.6, w: 4.25, h: 3.5, fontSize: 16, align: 'left', valign: 'top' },
      { name: 'rightContent', x: 5, y: 1.6, w: 4.25, h: 3.5, fontSize: 16, align: 'left', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0.5, y: 1.0, w: 4.25, h: 0.5, colorKey: 'accent', opacity: 0.15 },
      { type: 'rectangle', x: 5, y: 1.0, w: 4.25, h: 0.5, colorKey: 'accentAlt', opacity: 0.15 },
    ],
  },

  blank: {
    id: 'blank',
    name: 'Blank',
    description: 'Empty slide for custom content',
    regions: [],
  },

  // ============================================================
  // NEW PROFESSIONAL LAYOUTS
  // ============================================================

  hero: {
    id: 'hero',
    name: 'Hero Statement',
    description: 'Large impactful statement for key messages',
    regions: [
      { name: 'title', x: 0.75, y: 1.5, w: 8.5, h: 2.5, fontSize: 54, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'subtitle', x: 1.5, y: 4.2, w: 7, h: 0.6, fontSize: 20, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'line', x: 4, y: 4.0, w: 2, h: 0, colorKey: 'accent', lineWidth: 4 },
    ],
  },

  'image-left': {
    id: 'image-left',
    name: 'Image Left',
    description: 'Image on left with text content on right',
    regions: [
      { name: 'image', x: 0.3, y: 0.3, w: 4.4, h: 5.0 },
      { name: 'title', x: 5.0, y: 0.5, w: 4.5, h: 0.8, fontSize: 28, fontWeight: 'bold', align: 'left' },
      { name: 'content', x: 5.0, y: 1.5, w: 4.5, h: 3.8, fontSize: 18, align: 'left', valign: 'top' },
    ],
  },

  'image-right': {
    id: 'image-right',
    name: 'Image Right',
    description: 'Text content on left with image on right',
    regions: [
      { name: 'title', x: 0.5, y: 0.5, w: 4.5, h: 0.8, fontSize: 28, fontWeight: 'bold', align: 'left' },
      { name: 'content', x: 0.5, y: 1.5, w: 4.5, h: 3.8, fontSize: 18, align: 'left', valign: 'top' },
      { name: 'image', x: 5.3, y: 0.3, w: 4.4, h: 5.0 },
    ],
  },

  'image-full': {
    id: 'image-full',
    name: 'Full Image',
    description: 'Full-bleed background image with text overlay',
    regions: [
      { name: 'image', x: 0, y: 0, w: 10, h: 5.625 },
      { name: 'title', x: 0.5, y: 2.0, w: 9, h: 1.2, fontSize: 48, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'subtitle', x: 0.5, y: 3.4, w: 9, h: 0.6, fontSize: 24, align: 'center', valign: 'top' },
    ],
  },

  'grid-2x2': {
    id: 'grid-2x2',
    name: '2x2 Grid',
    description: 'Four equal sections for related content',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'stat1', x: 0.5, y: 1.1, w: 4.25, h: 2.0, fontSize: 16, align: 'center', valign: 'middle' },
      { name: 'stat2', x: 5.25, y: 1.1, w: 4.25, h: 2.0, fontSize: 16, align: 'center', valign: 'middle' },
      { name: 'stat3', x: 0.5, y: 3.3, w: 4.25, h: 2.0, fontSize: 16, align: 'center', valign: 'middle' },
      { name: 'stat4', x: 5.25, y: 3.3, w: 4.25, h: 2.0, fontSize: 16, align: 'center', valign: 'middle' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0.5, y: 1.1, w: 4.25, h: 2.0, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 5.25, y: 1.1, w: 4.25, h: 2.0, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 0.5, y: 3.3, w: 4.25, h: 2.0, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 5.25, y: 3.3, w: 4.25, h: 2.0, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
    ],
  },

  'grid-3': {
    id: 'grid-3',
    name: '3 Column Grid',
    description: 'Three equal columns for related content',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'stat1', x: 0.5, y: 1.1, w: 2.8, h: 4.2, fontSize: 16, align: 'center', valign: 'top' },
      { name: 'stat2', x: 3.6, y: 1.1, w: 2.8, h: 4.2, fontSize: 16, align: 'center', valign: 'top' },
      { name: 'stat3', x: 6.7, y: 1.1, w: 2.8, h: 4.2, fontSize: 16, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0.5, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 3.6, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 6.7, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
    ],
  },

  timeline: {
    id: 'timeline',
    name: 'Timeline',
    description: 'Horizontal timeline for showing progression',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'timelineBar', x: 0.5, y: 2.5, w: 9, h: 0.1 },
      { name: 'stat1', x: 0.5, y: 3.0, w: 2.0, h: 2.0, fontSize: 14, align: 'center', valign: 'top' },
      { name: 'stat2', x: 2.9, y: 3.0, w: 2.0, h: 2.0, fontSize: 14, align: 'center', valign: 'top' },
      { name: 'stat3', x: 5.3, y: 3.0, w: 2.0, h: 2.0, fontSize: 14, align: 'center', valign: 'top' },
      { name: 'stat4', x: 7.5, y: 3.0, w: 2.0, h: 2.0, fontSize: 14, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'line', x: 0.5, y: 2.5, w: 9, h: 0, colorKey: 'accent', lineWidth: 4 },
      { type: 'ellipse', x: 1.4, y: 2.35, w: 0.3, h: 0.3, colorKey: 'accent' },
      { type: 'ellipse', x: 3.8, y: 2.35, w: 0.3, h: 0.3, colorKey: 'accent' },
      { type: 'ellipse', x: 6.2, y: 2.35, w: 0.3, h: 0.3, colorKey: 'accent' },
      { type: 'ellipse', x: 8.4, y: 2.35, w: 0.3, h: 0.3, colorKey: 'accent' },
    ],
  },

  agenda: {
    id: 'agenda',
    name: 'Agenda',
    description: 'Numbered agenda items',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 32, fontWeight: 'bold', align: 'center' },
      { name: 'agendaItems', x: 1.5, y: 1.3, w: 7, h: 4, fontSize: 22, align: 'left', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'line', x: 4, y: 1.15, w: 2, h: 0, colorKey: 'accent', lineWidth: 3 },
    ],
  },

  team: {
    id: 'team',
    name: 'Team',
    description: 'Team member profile cards',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'stat1', x: 0.5, y: 1.1, w: 2.8, h: 4.2, fontSize: 14, align: 'center', valign: 'top' },
      { name: 'stat2', x: 3.6, y: 1.1, w: 2.8, h: 4.2, fontSize: 14, align: 'center', valign: 'top' },
      { name: 'stat3', x: 6.7, y: 1.1, w: 2.8, h: 4.2, fontSize: 14, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0.5, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.15 },
      { type: 'rectangle', x: 3.6, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.15 },
      { type: 'rectangle', x: 6.7, y: 1.1, w: 2.8, h: 4.2, colorKey: 'surface', shadow: true, cornerRadius: 0.15 },
    ],
  },

  stats: {
    id: 'stats',
    name: 'Statistics',
    description: 'Big numbers with labels for key statistics',
    regions: [
      { name: 'title', x: 0.5, y: 0.3, w: 9, h: 0.7, fontSize: 28, fontWeight: 'bold', align: 'center' },
      { name: 'stat1', x: 0.5, y: 1.3, w: 2.8, h: 2.5, fontSize: 48, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'stat2', x: 3.6, y: 1.3, w: 2.8, h: 2.5, fontSize: 48, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'stat3', x: 6.7, y: 1.3, w: 2.8, h: 2.5, fontSize: 48, fontWeight: 'bold', align: 'center', valign: 'middle' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0.5, y: 1.3, w: 2.8, h: 3.8, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 3.6, y: 1.3, w: 2.8, h: 3.8, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
      { type: 'rectangle', x: 6.7, y: 1.3, w: 2.8, h: 3.8, colorKey: 'surface', shadow: true, cornerRadius: 0.1 },
    ],
  },

  quote: {
    id: 'quote',
    name: 'Quote',
    description: 'Centered quote with attribution',
    regions: [
      { name: 'quote', x: 1.5, y: 1.5, w: 7, h: 2.5, fontSize: 32, align: 'center', valign: 'middle' },
      { name: 'attribution', x: 1.5, y: 4.2, w: 7, h: 0.5, fontSize: 18, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'text', text: '\u201C', x: 0.3, y: 0.8, w: 1, h: 1.5, fontSize: 120, colorKey: 'accent', opacity: 0.2 },
    ],
  },

  closing: {
    id: 'closing',
    name: 'Closing',
    description: 'Thank you / Q&A / Contact slide',
    regions: [
      { name: 'title', x: 0.5, y: 1.8, w: 9, h: 1.2, fontSize: 48, fontWeight: 'bold', align: 'center', valign: 'middle' },
      { name: 'subtitle', x: 0.5, y: 3.2, w: 9, h: 0.6, fontSize: 24, align: 'center', valign: 'top' },
      { name: 'contactInfo', x: 0.5, y: 4.2, w: 9, h: 0.8, fontSize: 16, align: 'center', valign: 'top' },
    ],
    decorativeShapes: [
      { type: 'rectangle', x: 0, y: 0, w: 10, h: 0.3, colorKey: 'accent', opacity: 1 },
      { type: 'rectangle', x: 0, y: 5.325, w: 10, h: 0.3, colorKey: 'accent', opacity: 1 },
    ],
  },
};

/**
 * Get a layout definition by ID
 */
export function getLayoutDefinition(layoutId: PptxLayoutId): LayoutDefinition | undefined {
  return LAYOUT_DEFINITIONS[layoutId];
}

/**
 * List all available layout IDs
 */
export function getLayoutIds(): PptxLayoutId[] {
  return Object.keys(LAYOUT_DEFINITIONS) as PptxLayoutId[];
}

/**
 * Check if a layout ID is valid
 */
export function isValidLayout(layoutId: string): layoutId is PptxLayoutId {
  return layoutId in LAYOUT_DEFINITIONS;
}
