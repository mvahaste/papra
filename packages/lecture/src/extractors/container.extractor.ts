import JSZip from 'jszip'
import { defineTextExtractor } from '../extractors.models'
import { extractText } from '../extractors.usecases'
import { getExtractor } from '../extractors.registry'
import mime from 'mime-types'

const MAX_ENTRIES = 100
const MAX_TOTAL_TEXT_LENGTH = 10 * 1024 * 1024
const CONTAINER_MIME_TYPES = [
  'application/vnd.etsi.asic-e+zip',
  'application/vnd.etsi.asic-s+zip',
  'application/x-bdoc',
  'application/bdoc',
]
const IGNORED_PATHS = [
  'META-INF', // Contains metadata for ASiC-E/ASiC-S containers
]

export const containerExtractorDefinition = defineTextExtractor({
  name: 'container',
  mimeTypes: CONTAINER_MIME_TYPES,
  extract: async ({ arrayBuffer, config, logger }) => {

    const zip = await JSZip.loadAsync(arrayBuffer)

    const contentFiles: JSZip.JSZipObject[] = []
    for (const file of Object.values(zip.files)) {
      if (contentFiles.length >= MAX_ENTRIES) {
        logger?.warn('Container document entry limit reached')
        break
      }

      if (IGNORED_PATHS.some(path => file.name.startsWith(path))) continue

      const mimeType = mime.lookup(file.name)
      if (!mimeType) continue

      if (CONTAINER_MIME_TYPES.includes(mimeType)) continue

      const { extractor } = getExtractor({ mimeType })
      if (!extractor) continue

      contentFiles.push(file)
    }

    if (contentFiles.length === 0) return { content: '' }

    const parts: string[] = []
    const subExtractors: string[] = []
    let totalLength = 0

    for (const file of contentFiles) {
      let entryBuffer: ArrayBuffer

      try {
        entryBuffer = await file.async('arraybuffer')
      } catch (error) {
        logger?.warn({ fileName: file.name, error }, 'Failed to decompress entry in container archive')
        continue
      }

      const mimeType = mime.lookup(file.name)

      if (!mimeType) continue

      const result = await extractText({
        arrayBuffer: entryBuffer,
        mimeType,
        config,
        logger,
      })

      if (result.error) {
        logger?.warn({ fileName: file.name, error: result.error }, 'Failed to extract text from container entry')
      }

      if (result.textContent) {
        const text = `--- CONTAINER ENTRY: ${file.name} ---\n${result.textContent}`
        parts.push(text)
        totalLength += text.length

        if (totalLength > MAX_TOTAL_TEXT_LENGTH) {
          logger?.warn('Total extracted text size limit reached')
          break
        }
      }

      if (result.extractorName && !subExtractors.includes(result.extractorName)) {
        subExtractors.push(result.extractorName)
      }
    }

    return {
      content: parts.join('\n\n'),
      subExtractorsUsed: subExtractors.length > 0 ? subExtractors : [],
    }
  },
})
