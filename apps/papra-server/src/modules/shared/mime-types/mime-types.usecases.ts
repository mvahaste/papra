import { safely } from '@corentinth/chisels';
import { fileTypeFromBlob } from 'file-type';
import { isNilOrEmptyString } from '../utils';
import { COERCIBLE_MIME_TYPES, MIME_TYPES } from './mime-types.constants';
import { getMimeTypeFromFileName } from './mime-types.models';

export async function coerceFileMimeType({ file }: { file: File }): Promise<{ mimeType: string }> {
  const declaredMimeType = file.type;

  if (!isNilOrEmptyString(declaredMimeType) && !COERCIBLE_MIME_TYPES.includes(declaredMimeType)) {
    return { mimeType: declaredMimeType };
  }

  const [detected] = await safely(fileTypeFromBlob(file));
  if (detected) {
    if (COERCIBLE_MIME_TYPES.includes(detected.mime)) {
      const extensionMimeType = getMimeTypeFromFileName(file.name);
      if (extensionMimeType !== MIME_TYPES.OCTET_STREAM) {
        return { mimeType: extensionMimeType };
      }
    }
    return { mimeType: detected.mime };
  }

  const extensionMimeType = getMimeTypeFromFileName(file.name);

  return { mimeType: extensionMimeType };
}
