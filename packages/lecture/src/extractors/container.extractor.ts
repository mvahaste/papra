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

    const contentFiles = Object.values(zip.files).filter((file) => {
      // Filter out ignored paths
      if (IGNORED_PATHS.some(path => file.name.startsWith(path))) return false

      // Filter out unrecognized MIME types
      const mimeType = mime.lookup(file.name)
      if (!mimeType) return false

      // Filter out containers (no container within containers)
      if (CONTAINER_MIME_TYPES.includes(mimeType)) return false

      // Filter out unsupported MIME types
      const { extractor } = getExtractor({ mimeType })
      if (!extractor) return false

      return true
    })

    if (contentFiles.length === 0) return { content: '' }

    if (contentFiles.length > MAX_ENTRIES) return { content: '' }

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

      if (!mimeType) break

      const result = await extractText({
        arrayBuffer: entryBuffer,
        mimeType,
        config,
        logger,
      })

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
