/** File imported into the Data Room */
export interface DataRoomFile {
  /** Unique identifier in our system */
  id: string;

  /** Filename */
  name: string;

  /** MIME type (e.g., "application/pdf", "image/png") */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Google Drive file ID (for reference/deduplication) */
  googleDriveId: string;

  /** When the file was imported into Data Room (ISO 8601) */
  importedAt: string;
}


/** Request to import a file from Google Drive */
export interface ImportFileRequest {
  googleDriveId: string;
}

/** Google Drive connection status */
export type GoogleDriveStatus = 'disconnected' | 'connected' | 'expired';
