import type { DataRoomFile } from '@/types/file';

/** Mock data for development - will be replaced with API calls */
export const mockFiles: DataRoomFile[] = [
  {
    id: '1',
    name: 'Acquisition_Agreement_v2.pdf',
    mimeType: 'application/pdf',
    size: 2457600, // 2.4 MB
    googleDriveId: 'gdrive_abc123',
    importedAt: '2025-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'NDA_Signed.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 156000, // 156 KB
    googleDriveId: 'gdrive_def456',
    importedAt: '2025-01-14T14:20:00Z',
  },
  {
    id: '3',
    name: 'Financial_Statements_Q4.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 1126400, // 1.1 MB
    googleDriveId: 'gdrive_ghi789',
    importedAt: '2025-01-12T09:15:00Z',
  },
  {
    id: '4',
    name: 'Company_Logo.png',
    mimeType: 'image/png',
    size: 245000, // 245 KB
    googleDriveId: 'gdrive_jkl012',
    importedAt: '2025-01-10T16:45:00Z',
  },
  {
    id: '5',
    name: 'Board_Presentation.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    size: 5242880, // 5 MB
    googleDriveId: 'gdrive_mno345',
    importedAt: '2025-01-08T11:00:00Z',
  },
];
