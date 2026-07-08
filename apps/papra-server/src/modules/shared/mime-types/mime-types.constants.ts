export const MIME_TYPES = {
  OCTET_STREAM: 'application/octet-stream',
  ZIP: 'application/zip',
  ASICE: 'application/vnd.etsi.asic-e+zip',
  ASICS: 'application/vnd.etsi.asic-s+zip'
};

export const COERCIBLE_MIME_TYPES: readonly string[] = [
  MIME_TYPES.OCTET_STREAM,
  MIME_TYPES.ZIP,
];

export const CONTAINER_EXTENSION_MIME_TYPES: Record<string, string> = {
  asice: MIME_TYPES.ASICE,
  bdoc: MIME_TYPES.ASICE,
  sce: MIME_TYPES.ASICE,
  asics: MIME_TYPES.ASICS,
  scs: MIME_TYPES.ASICS
}

export const CUSTOM_EXTENSION_MIME_TYPES: Record<string, string> = {
  ...CONTAINER_EXTENSION_MIME_TYPES
};
