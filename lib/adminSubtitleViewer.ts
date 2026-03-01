export type SubtitleArchiveResult = {
  found: boolean;
  message?: string;
  subtitleStatus?: string;
  source?: string;
  language?: string;
  dialogueLines?: number;
  storageKey?: string;
  storageBucket?: string;
  storageBytes?: number;
  uploadedAt?: number;
  transcript?: string;
};

export type SubtitleViewerState = {
  label: string;
  loading: boolean;
  found?: boolean;
  transcript?: string;
  message?: string;
  subtitleStatus?: string;
  source?: string;
  language?: string;
  dialogueLines?: number;
  storageKey?: string;
  storageBucket?: string;
  storageBytes?: number;
  uploadedAt?: number;
};

export function toSubtitleViewerState(
  label: string,
  result: SubtitleArchiveResult
): SubtitleViewerState {
  return {
    label,
    loading: false,
    found: result.found,
    transcript: result.found ? result.transcript : undefined,
    message: result.found ? undefined : result.message,
    subtitleStatus: result.subtitleStatus,
    source: result.source,
    language: result.language,
    dialogueLines: result.dialogueLines,
    storageKey: result.storageKey,
    storageBucket: result.storageBucket,
    storageBytes: result.storageBytes,
    uploadedAt: result.uploadedAt,
  };
}

export function toSubtitleViewerErrorState(
  label: string,
  message: string
): SubtitleViewerState {
  return {
    label,
    loading: false,
    found: false,
    message: `Failed to load archived subtitles: ${message}`,
  };
}
