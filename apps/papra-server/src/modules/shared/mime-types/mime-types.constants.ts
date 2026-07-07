export const MIME_TYPES = {
  OCTET_STREAM: 'application/octet-stream',
  ZIP: 'application/zip',
};

export const COERCIBLE_MIME_TYPES: readonly string[] = [
  MIME_TYPES.OCTET_STREAM,
  MIME_TYPES.ZIP,
];

export const CUSTOM_EXTENSION_MIME_TYPES: Record<string, string> = {
  asice: 'application/vnd.etsi.asic-e+zip',
  bdoc: 'application/vnd.etsi.asic-e+zip',
  sce: 'application/vnd.etsi.asic-e+zip',
  asics: 'application/vnd.etsi.asic-s+zip',
  scs: 'application/vnd.etsi.asic-s+zip',
};
