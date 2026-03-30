/**
 * Vision tools executor - implements analyze_image and extract_text_from_image
 * Uses server-side tRPC calls to Ollama vision models
 */

import type { ToolDefinition, ToolExecutor } from '../tools/tools.types';
import { VISION_TOOLS } from './vision.tools';
import { apiAsync } from '~/common/util/trpc.client';


/**
 * Execute analyze_image tool
 */
const analyzeImageExecutor: ToolExecutor = async (args) => {
  try {
    const { image_base64, question, detail_level } = args;

    if (!image_base64 || typeof image_base64 !== 'string') {
      return { error: 'Missing or invalid "image_base64" parameter. Please provide a base64-encoded image.' };
    }

    if (image_base64.length < 100) {
      return { error: 'Image data appears too short. Please provide valid base64-encoded image data.' };
    }

    const questionText = typeof question === 'string' ? question : 'What is in this image?';
    const detailLevel = (detail_level === 'brief' || detail_level === 'detailed') ? detail_level : 'normal';

    const response = await apiAsync.vision.analyzeImage.mutate({
      imageBase64: image_base64,
      question: questionText,
      detailLevel,
    });

    return {
      result: response.result,
      metadata: {
        model: response.model,
        processingTimeMs: response.processingTimeMs,
        source: 'ollama-vision',
      },
    };

  } catch (error: any) {
    // Check for common errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Cannot connect')) {
      return {
        error: 'Vision service unavailable. Please ensure Ollama is running with a vision model (like llava) installed. You can install it with: ollama pull llava',
      };
    }

    if (error.message?.includes('model') && error.message?.includes('not found')) {
      return {
        error: 'Vision model not found. Please install a vision model like llava: ollama pull llava',
      };
    }

    return {
      error: `Image analysis failed: ${error.message}`,
    };
  }
};


/**
 * Execute extract_text_from_image tool
 */
const extractTextExecutor: ToolExecutor = async (args) => {
  try {
    const { image_base64, content_type } = args;

    if (!image_base64 || typeof image_base64 !== 'string') {
      return { error: 'Missing or invalid "image_base64" parameter. Please provide a base64-encoded image.' };
    }

    if (image_base64.length < 100) {
      return { error: 'Image data appears too short. Please provide valid base64-encoded image data.' };
    }

    const contentType = (content_type === 'text' || content_type === 'code' || content_type === 'table')
      ? content_type
      : 'auto';

    const response = await apiAsync.vision.extractText.mutate({
      imageBase64: image_base64,
      contentType,
    });

    return {
      result: response.result,
      metadata: {
        model: response.model,
        processingTimeMs: response.processingTimeMs,
        source: 'ollama-vision',
        contentType,
      },
    };

  } catch (error: any) {
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Cannot connect')) {
      return {
        error: 'Vision service unavailable. Please ensure Ollama is running with a vision model (like llava) installed.',
      };
    }

    return {
      error: `Text extraction failed: ${error.message}`,
    };
  }
};


/**
 * Vision tools definitions for registry
 */
export const VISION_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'analyze_image',
    category: 'image',
    name: 'Analyze Image',
    description: 'Analyze an image using a vision AI model and get a text description',
    aixDefinition: VISION_TOOLS[0],
    executor: analyzeImageExecutor,
    requiresNetwork: true,
    browserAPIs: [],
    defaultTimeout: 60000,  // Vision models can be slow
  },
  {
    id: 'extract_text_from_image',
    category: 'image',
    name: 'Extract Text (OCR)',
    description: 'Extract text, code, or data from an image using vision AI',
    aixDefinition: VISION_TOOLS[1],
    executor: extractTextExecutor,
    requiresNetwork: true,
    browserAPIs: [],
    defaultTimeout: 60000,
  },
];
