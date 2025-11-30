import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileList } from '@/components/FileList';
import useDrivePicker from 'react-google-drive-picker';
import { HardDrive, Plus, Lock, Loader2 } from 'lucide-react';
import type { DataRoomFile, GoogleDriveStatus } from '@/types/file';
import axios from 'axios';

// Google Cloud credentials for the Drive Picker (client-side)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

// Allowed MIME types for file picker
const ALLOWED_MIME_TYPES = [
  'image/*',
  'application/pdf',
  'application/vnd.google-apps.document',      // Google Docs
  'application/vnd.google-apps.spreadsheet',   // Google Sheets
  'application/vnd.google-apps.presentation',  // Google Slides
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword',                        // .doc
  'application/vnd.ms-excel',                  // .xls
  'application/vnd.ms-powerpoint',             // .ppt
  'text/plain',                                // .txt
  'text/csv',                                  // .csv
].join(',');

/** Transform snake_case API response to camelCase */
function transformFile(data: Record<string, unknown>): DataRoomFile {
  return {
    id: data.id as string,
    name: data.name as string,
    mimeType: data.mime_type as string,
    size: data.size as number,
    googleDriveId: data.google_drive_id as string,
    importedAt: data.imported_at as string,
  };
}

/** Import a file from Google Drive */
async function importFileFromDrive(googleDriveId: string, sessionToken: string): Promise<DataRoomFile> {
  const response = await axios.post(
    `${BACKEND_URL}/files/import`,
    { google_drive_id: googleDriveId },
    { headers: { 'X-Session-Token': sessionToken } }
  );
  return transformFile(response.data);
}

/** Check if error is a 401 unauthorized */
function isUnauthorizedError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

/** Get all files in the Data Room */
async function fetchFiles(): Promise<DataRoomFile[]> {
  const response = await axios.get(`${BACKEND_URL}/files`);
  return response.data.map(transformFile);
}

/** Delete a file from the Data Room */
async function deleteFileFromRoom(fileId: string, sessionToken: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/files/${fileId}`, {
    headers: { 'X-Session-Token': sessionToken }
  });
}

/** Get access token from backend using session token */
async function getAccessToken(sessionToken: string): Promise<string | null> {
  try {
    const response = await axios.get(`${BACKEND_URL}/auth/status`, {
      params: { session_token: sessionToken }
    });
    if (response.data.authenticated) {
      return response.data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

function App() {
  const [files, setFiles] = useState<DataRoomFile[]>([]);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>('disconnected');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [openPicker] = useDrivePicker();

  // Handle OAuth callback from backend (URL params after redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');
    const session = params.get('session_token');

    if (authSuccess && session) {
      setSessionToken(session);
      setDriveStatus('connected');
      // Store in localStorage for persistence
      localStorage.setItem('session_token', session);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Fetch access token from backend
      getAccessToken(session).then(token => {
        if (token) {
          setAccessToken(token);
          localStorage.setItem('access_token', token);
        }
      });
    } else if (authError) {
      console.error('OAuth error:', authError);
      alert(`Authentication failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedSession = localStorage.getItem('session_token');
    const storedToken = localStorage.getItem('access_token');
    if (storedSession) {
      setSessionToken(storedSession);
      if (storedToken) {
        setAccessToken(storedToken);
        setDriveStatus('connected');
      } else {
        // Try to get access token from backend
        getAccessToken(storedSession).then(token => {
          if (token) {
            setAccessToken(token);
            localStorage.setItem('access_token', token);
            setDriveStatus('connected');
          } else {
            // Session expired
            localStorage.removeItem('session_token');
            localStorage.removeItem('access_token');
          }
        });
      }
    }
  }, []);

  // Load files from backend on mount and when session changes
  useEffect(() => {
    setIsLoading(true);
    fetchFiles()
      .then(setFiles)
      .catch(err => console.error('Failed to load files:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleViewFile = useCallback((file: DataRoomFile) => {
    // Open file in new tab via backend download endpoint
    window.open(`${BACKEND_URL}/files/${file.id}/download`, '_blank');
  }, []);

  const handleDeleteFile = useCallback(async (file: DataRoomFile) => {
    if (!sessionToken) {
      alert('Please connect to Google Drive first');
      return;
    }

    if (confirm(`Delete "${file.name}"?`)) {
      try {
        await deleteFileFromRoom(file.id, sessionToken);
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (err) {
        console.error('Failed to delete file:', err);
        // Handle session expiration
        if (isUnauthorizedError(err)) {
          alert('Session expired. Please reconnect to Google Drive.');
          localStorage.removeItem('session_token');
          localStorage.removeItem('access_token');
          setSessionToken(null);
          setAccessToken(null);
          setDriveStatus('disconnected');
          return;
        }
        alert('Failed to delete file. Please try again.');
      }
    }
  }, [sessionToken]);

  const handleImport = useCallback(() => {
    openPicker({
      clientId: GOOGLE_CLIENT_ID,
      developerKey: '',
      viewId: 'DOCS',
      token: accessToken || undefined,
      showUploadView: false,
      showUploadFolders: false,
      supportDrives: true,
      multiselect: true,
      viewMimeTypes: ALLOWED_MIME_TYPES,
      callbackFunction: async (data) => {
        if (data.action === 'cancel') {
          console.log('Picking canceled')
          return;
        }
        if (data.action === 'picked' && data.docs) {
          console.log('Files picked from Drive:', JSON.stringify(data.docs, null, 2));
          if (!sessionToken) {
            alert('Please connect to Google Drive first');
            return;
          }

          setIsImporting(true);
          try {
            for (const file of data.docs) {
              console.log('Importing file:', file.id, file.name, file);
              try {
                const imported = await importFileFromDrive(file.id, sessionToken);
                setFiles((prev) => [...prev, imported]);
              } catch (err) {
                console.error(`Failed to import ${file.name}:`, err);
                // Handle session expiration - force re-authentication
                if (isUnauthorizedError(err)) {
                  alert('Session expired. Please reconnect to Google Drive.');
                  localStorage.removeItem('session_token');
                  localStorage.removeItem('access_token');
                  setSessionToken(null);
                  setAccessToken(null);
                  setDriveStatus('disconnected');
                  return; // Stop importing more files
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
  }, [openPicker, accessToken, sessionToken]);

  const handleConnectDrive = useCallback(() => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${BACKEND_URL}/auth/google`;
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('access_token');
    setSessionToken(null);
    setAccessToken(null);
    setDriveStatus('disconnected');
  }, []);


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">

            <div className="h-10 w-10 bg-slate-900 dark:bg-slate-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-5 w-5 text-white dark:text-slate-900" />
              </div>
            <div>
              <h1 className="text-xl font-semibold">Data Room</h1>
              <p className="text-xs">Secure Document Repository</p>
            </div>
          </div>
          {driveStatus === 'connected' ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <HardDrive className="h-4 w-4" />
                Google Drive Connected
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnectDrive}>
              <HardDrive className="h-4 w-4" />
              Connect Google Drive
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Files</h2>
            {driveStatus === 'connected' && (
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Import from Drive
                  </>
                )}
              </Button>
            )}
          </div>

          {/* File list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <FileList
              files={files}
              onViewFile={handleViewFile}
              onDeleteFile={handleDeleteFile}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
