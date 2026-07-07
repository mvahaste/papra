import type { Component } from 'solid-js';
import { createMemo, createResource, onCleanup, Show, Suspense } from 'solid-js';
import JSZip from 'jszip';
import { SimplePdfViewer } from '../pdf-viewer/simple-pdf-viewer.component';
import { Card } from '@/modules/ui/components/card';
import { useI18n } from '@/modules/i18n/i18n.provider';

// TODO: This should either:
// TODO: - Present a way to view any supported files within the container
// TODO: - Not support viewing files within the container (content extraction is still supported)
export const ContainerViewer: Component<{ blob: Blob }> = (props) => {
  const { t } = useI18n();

  const [pdfBlob] = createResource(
    () => props.blob,
    async (blob) => {
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const pdfFile = Object.values(zip.files).find((file) => {
        if (file.dir) {
          return false;
        }

        if (file.name.includes('/')) {
          return false;
        }

        return file.name.toLowerCase().endsWith('.pdf');
      });

      if (!pdfFile) {
        return null
      }

      const pdfData = await pdfFile.async('arraybuffer');
      return new Blob([pdfData], { type: 'application/pdf' });
    },
  );

  const pdfUrl = createMemo(() => {
    const blob = pdfBlob();
    return blob ? URL.createObjectURL(blob) : undefined;
  });

  onCleanup(() => {
    const url = pdfUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  });

  return (
    <Suspense
      fallback={
        <Card class="px-6 py-12 text-center text-sm text-muted-foreground">
          <p>{t('documents.preview.extracting-pdf-from-container')}</p>
        </Card>
      }
    >
      <Show when={!pdfBlob.error} fallback={
        <Card class="px-6 py-12 text-center text-sm text-destructive">
          <p>{t('documents.preview.failed-to-extract-pdf-from-container')}</p>
        </Card>
      }>
        <Show when={pdfUrl()} fallback={
          <Card class="px-6 py-12 text-center text-sm text-muted-foreground">
            <p>{t('documents.preview.no-pdf-in-container')}</p>
          </Card>
        }>
          <SimplePdfViewer url={pdfUrl()!} />
        </Show>
      </Show>
    </Suspense>
  );
};
