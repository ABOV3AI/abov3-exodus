import * as z from 'zod/v4';

import { createTRPCRouter, publicProcedure } from '~/server/trpc/trpc.server';
import { env } from '~/server/env';
import { fetchJsonOrTRPCThrow, fetchResponseOrTRPCThrow } from '~/server/trpc/trpc.router.fetchers';


// configuration
const SAFETY_TEXT_LENGTH = 1000;
const MIN_CHUNK_SIZE = 4096; // Minimum chunk size in bytes


// Schema definitions
export type SpeechInputSchema = z.infer<typeof speechInputSchema>;
export const speechInputSchema = z.object({
  endpoint: z.string().optional(),
  voiceId: z.string().optional(),
  text: z.string(),
  nonEnglish: z.boolean(),
  audioStreaming: z.boolean(),
  audioTurbo: z.boolean(),
});

export type VoiceSchema = z.infer<typeof voiceSchema>;
const voiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  previewUrl: z.string().nullable(),
  category: z.string(),
  default: z.boolean(),
});

export type VoiceCloneInputSchema = z.infer<typeof voiceCloneInputSchema>;
export const voiceCloneInputSchema = z.object({
  endpoint: z.string().optional(),
  name: z.string(),
  audioSamples: z.array(z.string()), // base64 encoded audio
  description: z.string().optional(),
});


export const paulineRouter = createTRPCRouter({

  /**
   * List Voices available from ABOV3 Pauline
   */
  listVoices: publicProcedure
    .input(z.object({
      endpoint: z.string().optional(),
    }))
    .output(z.object({
      voices: z.array(voiceSchema),
    }))
    .query(async ({ input }) => {

      const { endpoint } = input;
      const { url } = paulineAccess(endpoint, '/v1/models');

      // Return all 28 Chatterbox TTS voices
      return {
        voices: [
          {
            id: 'Emily.wav',
            name: 'Emily',
            description: 'Clear and professional female voice',
            previewUrl: null,
            category: 'professional',
            default: true,
          },
          {
            id: 'Abigail.wav',
            name: 'Abigail',
            description: 'Friendly female voice',
            previewUrl: null,
            category: 'friendly',
            default: false,
          },
          {
            id: 'Adrian.wav',
            name: 'Adrian',
            description: 'Confident male voice',
            previewUrl: null,
            category: 'confident',
            default: false,
          },
          {
            id: 'Alexander.wav',
            name: 'Alexander',
            description: 'Authoritative male voice',
            previewUrl: null,
            category: 'authoritative',
            default: false,
          },
          {
            id: 'Alice.wav',
            name: 'Alice',
            description: 'Warm and friendly female voice',
            previewUrl: null,
            category: 'warm',
            default: false,
          },
          {
            id: 'Austin.wav',
            name: 'Austin',
            description: 'Casual male voice',
            previewUrl: null,
            category: 'casual',
            default: false,
          },
          {
            id: 'Axel.wav',
            name: 'Axel',
            description: 'Strong male voice',
            previewUrl: null,
            category: 'strong',
            default: false,
          },
          {
            id: 'Connor.wav',
            name: 'Connor',
            description: 'Youthful male voice',
            previewUrl: null,
            category: 'youthful',
            default: false,
          },
          {
            id: 'Cora.wav',
            name: 'Cora',
            description: 'Gentle female voice',
            previewUrl: null,
            category: 'gentle',
            default: false,
          },
          {
            id: 'Elena.wav',
            name: 'Elena',
            description: 'Elegant female voice',
            previewUrl: null,
            category: 'elegant',
            default: false,
          },
          {
            id: 'Eli.wav',
            name: 'Eli',
            description: 'Bright male voice',
            previewUrl: null,
            category: 'bright',
            default: false,
          },
          {
            id: 'Everett.wav',
            name: 'Everett',
            description: 'Mature male voice',
            previewUrl: null,
            category: 'mature',
            default: false,
          },
          {
            id: 'Gabriel.wav',
            name: 'Gabriel',
            description: 'Smooth male narrator voice',
            previewUrl: null,
            category: 'narrator',
            default: false,
          },
          {
            id: 'Gianna.wav',
            name: 'Gianna',
            description: 'Expressive female voice',
            previewUrl: null,
            category: 'expressive',
            default: false,
          },
          {
            id: 'Henry.wav',
            name: 'Henry',
            description: 'Distinguished male voice',
            previewUrl: null,
            category: 'distinguished',
            default: false,
          },
          {
            id: 'Ian.wav',
            name: 'Ian',
            description: 'Dynamic male voice',
            previewUrl: null,
            category: 'dynamic',
            default: false,
          },
          {
            id: 'Jade.wav',
            name: 'Jade',
            description: 'Sophisticated female voice',
            previewUrl: null,
            category: 'sophisticated',
            default: false,
          },
          {
            id: 'Jeremiah.wav',
            name: 'Jeremiah',
            description: 'Deep male voice',
            previewUrl: null,
            category: 'deep',
            default: false,
          },
          {
            id: 'Jordan.wav',
            name: 'Jordan',
            description: 'Versatile neutral voice',
            previewUrl: null,
            category: 'versatile',
            default: false,
          },
          {
            id: 'Julian.wav',
            name: 'Julian',
            description: 'Energetic male voice',
            previewUrl: null,
            category: 'energetic',
            default: false,
          },
          {
            id: 'Layla.wav',
            name: 'Layla',
            description: 'Melodic female voice',
            previewUrl: null,
            category: 'melodic',
            default: false,
          },
          {
            id: 'Leonardo.wav',
            name: 'Leonardo',
            description: 'Artistic male voice',
            previewUrl: null,
            category: 'artistic',
            default: false,
          },
          {
            id: 'Michael.wav',
            name: 'Michael',
            description: 'Classic male voice',
            previewUrl: null,
            category: 'classic',
            default: false,
          },
          {
            id: 'Miles.wav',
            name: 'Miles',
            description: 'Smooth male voice',
            previewUrl: null,
            category: 'smooth',
            default: false,
          },
          {
            id: 'Olivia.wav',
            name: 'Olivia',
            description: 'Cheerful female voice',
            previewUrl: null,
            category: 'cheerful',
            default: false,
          },
          {
            id: 'Ryan.wav',
            name: 'Ryan',
            description: 'Reliable male voice',
            previewUrl: null,
            category: 'reliable',
            default: false,
          },
          {
            id: 'Taylor.wav',
            name: 'Taylor',
            description: 'Modern neutral voice',
            previewUrl: null,
            category: 'modern',
            default: false,
          },
          {
            id: 'Thomas.wav',
            name: 'Thomas',
            description: 'Professional male voice',
            previewUrl: null,
            category: 'professional',
            default: false,
          },
        ],
      };

    }),

  /**
   * Speech synthesis procedure using tRPC streaming
   */
  speech: publicProcedure
    .input(speechInputSchema)
    .mutation(async function* ({ input: { endpoint, text, voiceId, nonEnglish, audioStreaming, audioTurbo }, ctx }) {

      // start streaming back
      yield { control: 'start' };

      // Safety check: trim text that's too long
      if (text.length > SAFETY_TEXT_LENGTH) {
        text = text.slice(0, SAFETY_TEXT_LENGTH);
        yield { warningMessage: 'text was truncated to maximum length' };
      }

      let response: Response;
      try {

        // Prepare the upstream request (OpenAI-compatible API)
        const { headers, url } = paulineAccess(endpoint, '/v1/audio/speech');

        // Always use speed 1.0 to avoid librosa time-stretch artifacts (reverb/echo)
        // Speed/tempo adjustment handled client-side using Web Audio API playbackRate
        const body: PaulineWire.TTSRequest = {
          model: audioTurbo ? 'tts-1-hd' : 'tts-1',
          input: text,
          voice: voiceId || 'Emily.wav',
          response_format: 'mp3',
          speed: 1.0,
        };

        // Blocking fetch
        response = await fetchResponseOrTRPCThrow({ url, method: 'POST', headers, body, signal: ctx.reqSignal, name: 'Pauline' });

      } catch (error: any) {
        yield { errorMessage: `fetch issue: ${error.message || 'Unknown error'}` };
        return;
      }

      // Parse headers
      const responseHeaders = _safeParseTTSResponseHeaders(response.headers);

      // If not streaming, return the entire audio
      if (!audioStreaming) {
        const audioArrayBuffer = await response.arrayBuffer();
        yield {
          audio: {
            base64: Buffer.from(audioArrayBuffer).toString('base64'),
            contentType: responseHeaders.contentType,
            characterCost: text.length,
            ttsLatencyMs: 0, // Pauline doesn't provide this
          },
        };
        yield { control: 'end' };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { errorMessage: 'stream issue: No reader' };
        return;
      }

      // STREAM the audio chunks back to the client
      try {

        // Initialize a buffer to accumulate chunks
        const accumulatedChunks: Uint8Array[] = [];
        let accumulatedSize = 0;

        // Read loop
        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          if (!value) continue;

          // Accumulate chunks
          accumulatedChunks.push(value);
          accumulatedSize += value.length;

          // When accumulated size reaches or exceeds MIN_CHUNK_SIZE, yield the chunk
          if (accumulatedSize >= MIN_CHUNK_SIZE) {
            yield {
              audioChunk: {
                base64: Buffer.concat(accumulatedChunks).toString('base64'),
              },
            };
            // Reset the accumulation
            accumulatedChunks.length = 0;
            accumulatedSize = 0;
          }
        }

        // If there's any remaining data, yield it as well
        if (accumulatedSize) {
          yield {
            audioChunk: {
              base64: Buffer.concat(accumulatedChunks).toString('base64'),
            },
          };
        }
      } catch (error: any) {
        yield { errorMessage: `stream issue: ${error.message || 'Unknown error'}` };
        return;
      }

      // end streaming (if a control error wasn't thrown)
      yield { control: 'end' };
    }),

  /**
   * Clone a voice from audio samples
   * NOTE: Voice cloning not currently implemented
   */
  cloneVoice: publicProcedure
    .input(voiceCloneInputSchema)
    .mutation(async ({ input }) => {
      // Voice cloning not yet implemented
      return {
        success: false,
        errorMessage: 'Voice cloning is not currently available for ABOV3 Pauline',
      };
    }),

});

/**
 * Helper function to construct ABOV3 Pauline API access details
 */
export function paulineAccess(endpoint: string | undefined, apiPath: string): { headers: HeadersInit; url: string } {
  // API endpoint
  let host = (endpoint || env.PAULINE_ENDPOINT || 'http://localhost:8080').trim();
  if (!host.startsWith('http'))
    host = `http://${host}`;
  if (host.endsWith('/') && apiPath.startsWith('/'))
    host = host.slice(0, -1);

  return {
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
    },
    url: host + apiPath,
  };
}

export function paulineVoiceId(voiceId?: string): string {
  return voiceId?.trim() || env.PAULINE_VOICE_ID || 'Emily.wav';
}


function _safeParseTTSResponseHeaders(headers: Headers): PaulineWire.TTSResponseHeaders {
  return {
    contentType: headers.get('content-type') || 'audio/mpeg',
  };
}


/// OpenAI-compatible TTS API wire types (for XTTS server)
export namespace PaulineWire {
  export interface TTSRequest {
    model: 'tts-1' | 'tts-1-hd';
    input: string;
    voice: string;
    response_format?: 'mp3' | 'opus' | 'aac' | 'flac';
    speed?: number;
  }

  export interface TTSResponseHeaders {
    contentType: string;
  }

  export interface VoicesList {
    voices: Voice[];
  }

  interface Voice {
    id: string;
    name: string;
    description?: string;
    preview_url?: string;
    category?: string;
  }

  export interface VoiceCloneRequest {
    name: string;
    samples: string[]; // base64 audio samples
    description?: string;
  }

  export interface VoiceCloneResponse {
    voice_id: string;
    message?: string;
  }
}
