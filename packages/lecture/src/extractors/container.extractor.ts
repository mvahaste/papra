import JSZip from 'jszip';
import { defineTextExtractor } from '../extractors.models';
import { extractText } from '../extractors.usecases';

const MAX_ENTRIES = 100;
const MAX_TOTAL_TEXT_LENGTH = 10 * 1024 * 1024;

const EXTENSION_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  xml: 'application/xml',
  json: 'application/json',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  md: 'text/markdown',
  rtf: 'application/rtf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(EXTENSION_MIME_TYPES));

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? (EXTENSION_MIME_TYPES[ext] ?? 'application/octet-stream') : 'application/octet-stream';
}

function isPathTraversal(fileName: string): boolean {
  const normalized = fileName.replace(/\\/g, '/');
  return normalized.includes('..') || normalized.startsWith('/');
}

function isRootLevelFile(fileName: string): boolean {
  const normalized = fileName.replace(/\\/g, '/');
  return !normalized.includes('/');
}

function isFileSupported(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? SUPPORTED_EXTENSIONS.has(ext) : false;
}

export const containerExtractorDefinition = defineTextExtractor({
  name: 'container',
  mimeTypes: ['application/vnd.etsi.asic-e+zip'],
  extract: async ({ arrayBuffer, config, logger }) => {
    const zip = await JSZip.loadAsync(arrayBuffer);

    const contentFiles = Object.values(zip.files).filter((file) => {
      if (file.dir) {
        return false;
      }

      if (!isRootLevelFile(file.name)) {
        return false;
      }

      if (isPathTraversal(file.name)) {
        return false;
      }

      if (file.name.startsWith('META-INF/')) {
        return false;
      }

      if (file.name === 'mimetype') {
        return false;
      }

      if (!isFileSupported(file.name)) {
        return false;
      }

      return true;
    });

    if (contentFiles.length === 0) {
      return { content: '' };
    }

    if (contentFiles.length > MAX_ENTRIES) {
      logger?.warn({ count: contentFiles.length }, 'Too many entries in container archive');
      return { content: '' };
    }

    const parts: string[] = [];
    const subExtractors: string[] = [];
    let totalLength = 0;

    for (const file of contentFiles) {
      let entryBuffer: ArrayBuffer;

      try {
        entryBuffer = await file.async('arraybuffer');
      } catch (error) {
        logger?.warn({ fileName: file.name, error }, 'Failed to decompress entry in container archive');
        continue;
      }

      const mimeType = getMimeTypeFromFileName(file.name);

      const result = await extractText({
        arrayBuffer: entryBuffer,
        mimeType,
        config,
        logger,
      });

      if (result.textContent) {
        const text = `--- CONTAINER ENTRY: ${file.name} ---\n${result.textContent}`;
        parts.push(text);
        totalLength += text.length;

        if (totalLength > MAX_TOTAL_TEXT_LENGTH) {
          logger?.warn('Total extracted text size limit reached');
          break;
        }
      }

      if (result.extractorName && !subExtractors.includes(result.extractorName)) {
        subExtractors.push(result.extractorName);
      }
    }

    return {
      content: parts.join('\n\n'),
      subExtractorsUsed: subExtractors.length > 0 ? subExtractors : [],
    };
  },
});
