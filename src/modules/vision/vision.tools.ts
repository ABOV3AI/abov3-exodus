/**
 * Vision tools AIX definitions
 * Enables image analysis for text-only models by using a dedicated vision model
 */

import type { AixTools_ToolDefinition } from '../aix/server/api/aix.wiretypes';


export const VISION_TOOLS: AixTools_ToolDefinition[] = [
  {
    type: 'function_call',
    function_call: {
      name: 'analyze_image',
      description: 'Analyze an image and get a detailed description. Use this tool when the user shares an image and asks you to describe, analyze, or answer questions about it. The tool uses a vision-capable AI model to understand the image content and returns a text description. You can then use this description to respond to the user\'s question about the image.',
      input_schema: {
        properties: {
          image_base64: {
            type: 'string',
            description: 'Base64-encoded image data (with or without data URL prefix). The image should be PNG, JPG, GIF, or WebP format.',
          },
          question: {
            type: 'string',
            description: 'Question or prompt about the image. Examples: "What is in this image?", "Describe this screenshot", "What code is shown?", "Read the text in this image"',
          },
          detail_level: {
            type: 'string',
            description: 'Level of detail for the analysis: "brief" (1-2 sentences), "normal" (paragraph), or "detailed" (comprehensive analysis)',
            enum: ['brief', 'normal', 'detailed'],
          },
        },
        required: ['image_base64', 'question'],
      },
    },
  },
  {
    type: 'function_call',
    function_call: {
      name: 'extract_text_from_image',
      description: 'Extract and read text/code from an image (OCR). Use this when you need to get the exact text content from a screenshot, photo of a document, code snippet image, etc. Returns the text content found in the image.',
      input_schema: {
        properties: {
          image_base64: {
            type: 'string',
            description: 'Base64-encoded image containing text to extract',
          },
          content_type: {
            type: 'string',
            description: 'Type of content to focus on: "text" (general text), "code" (programming code), "table" (tabular data), or "auto" (detect automatically)',
            enum: ['text', 'code', 'table', 'auto'],
          },
        },
        required: ['image_base64'],
      },
    },
  },
];
