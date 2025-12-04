import { useState, useEffect, useCallback } from 'react';
import useDrivePicker from 'react-google-drive-picker';
import type { DataRoomFile } from '@/types/file';
import { fetchFiles, importFileFromDrive, deleteFile, isUnauthorizedError } from '@/services/api';
import { GOOGLE_CLIENT_ID, BACKEND_URL, ALLOWED_MIME_TYPES } from '@/config/constants';

interface UseFilesParams {
  sessionToken: string | null;
  accessToken: string | null;
  clearSession: () => void;
  refreshAccessToken: () => Promise<string | null>;
}

export interface UseFilesReturn {
  files: DataRoomFile[];
  isLoading: boolean;
  isImporting: boolean;
  handleImport: () => Promise<void>;
  handleViewFile: (file: DataRoomFile) => void;
  handleDeleteFile: (file: DataRoomFile) => Promise<void>;
}

export function useFiles({
  sessionToken,
  accessToken,
  clearSession,
  refreshAccessToken,
}: UseFilesParams): UseFilesReturn {
  const [files, setFiles] = useState<DataRoomFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [openPicker] = useDrivePicker();

  // Load files on mount
  useEffect(() => {
    setIsLoading(true);
    fetchFiles()
      .then(setFiles)
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleViewFile = useCallback((file: DataRoomFile) => {
    window.open(`${BACKEND_URL}/files/${file.id}/download`, '_blank');
  }, []);

  const handleDeleteFile = useCallback(async (file: DataRoomFile) => {
    if (!sessionToken) {
      alert('Please connect to Google Drive first');
      return;
    }

    if (confirm(`Delete "${file.name}"?`)) {
      try {
        await deleteFile(file.id, sessionToken);
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (err) {
        console.error('Failed to delete file:', err);
        if (isUnauthorizedError(err)) {
          alert('Session expired. Please reconnect to Google Drive.');
          clearSession();
          return;
        }
        alert('Failed to delete file. Please try again.');
      }
    }
  }, [sessionToken, clearSession]);

  const handleImport = useCallback(async () => {
    // Get fresh token before opening picker
    let tokenToUse = accessToken;
    if (sessionToken) {
      const freshToken = await refreshAccessToken();
      if (!freshToken) {
        alert('Session expired. Please reconnect to Google Drive.');
        clearSession();
        return;
      }
      tokenToUse = freshToken;
    }

    openPicker({
      clientId: GOOGLE_CLIENT_ID,
      developerKey: '',
      viewId: 'DOCS',
      token: tokenToUse || undefined,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: true,
      viewMimeTypes: ALLOWED_MIME_TYPES,
      callbackFunction: async (data) => {
        if (data.action === 'cancel') {
          return;
        }
        if (data.action === 'picked' && data.docs) {
          if (!sessionToken) {
            alert('Please connect to Google Drive first');
            return;
          }

          setIsImporting(true);
          try {
            for (const file of data.docs) {
              try {
                const imported = await importFileFromDrive(file.id, sessionToken);
                setFiles((prev) => [...prev, imported]);
              } catch (err) {
                console.error(`Failed to import ${file.name}:`, err);
                if (isUnauthorizedError(err)) {
                  alert('Session expired. Please reconnect to Google Drive.');
                  clearSession();
                  return;
                }
                alert(`Failed to import "${file.name}". Please try again.`);
              }
            }
          } finally {
            setIsImporting(false);
          }
        }
      },
    });
  }, [openPicker, accessToken, sessionToken, clearSession, refreshAccessToken]);

  return {
    files,
    isLoading,
    isImporting,
    handleImport,
    handleViewFile,
    handleDeleteFile,
  };
}
