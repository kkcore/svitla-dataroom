import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileList } from '@/components/FileList';
import { DrivePicker, type DrivePickerFile } from '@/components/DrivePicker';
import { mockFiles } from '@/data/mockFiles';
import { HardDrive, Plus, Lock } from 'lucide-react';
import type { DataRoomFile, GoogleDriveStatus } from '@/types/file';

// Google Cloud credentials for the Drive Picker (client-side)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const GOOGLE_APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || 'YOUR_APP_ID';

// Backend URL for server-side OAuth
const BACKEND_URL = 'http://localhost:5001';

function App() {
  const [files, setFiles] = useState<DataRoomFile[]>(mockFiles);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>('disconnected');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Handle OAuth callback from backend (URL params after redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');
    const token = params.get('access_token');
    const session = params.get('session_token');

    if (authSuccess && token && session) {
      setAccessToken(token);
      setSessionToken(session);
      setDriveStatus('connected');
      // Store in localStorage for persistence
      localStorage.setItem('session_token', session);
      localStorage.setItem('access_token', token);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
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
    if (storedSession && storedToken) {
      setSessionToken(storedSession);
      setAccessToken(storedToken);
      setDriveStatus('connected');
    }
  }, []);

  const handleViewFile = (file: DataRoomFile) => {
    // TODO: Open file in browser via backend endpoint
    console.log('View file:', file.name);
    alert(`Opening ${file.name} (will connect to backend)`);
  };

  const handleDeleteFile = (file: DataRoomFile) => {
    // TODO: Call backend API to delete
    if (confirm(`Delete "${file.name}"?`)) {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    }
  };

  const handleImport = () => {
    setPickerVisible(true);
  };

  const handleFilesPicked = (pickedFiles: DrivePickerFile[]) => {
    console.log('Files picked from Drive:', pickedFiles);
    // Convert to DataRoomFile format and add to list
    const newFiles: DataRoomFile[] = pickedFiles.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: file.mimeType,
      size: file.sizeBytes || 0,
      googleDriveId: file.id,
      importedAt: new Date().toISOString(),
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleOAuthSuccess = (token: string) => {
    console.log('OAuth token received:', token);
    setDriveStatus('connected');
  };

  const handleConnectDrive = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('access_token');
    setSessionToken(null);
    setAccessToken(null);
    setDriveStatus('disconnected');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Google Drive Picker */}
      <DrivePicker
        clientId={GOOGLE_CLIENT_ID}
        appId={GOOGLE_APP_ID}
        oauthToken={accessToken}
        visible={pickerVisible}
        onVisibilityChange={setPickerVisible}
        onPicked={handleFilesPicked}
        onCanceled={() => setPickerVisible(false)}
        onOAuthResponse={handleOAuthSuccess}
        onError={(err) => console.error('Drive Picker error:', err)}
      />

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
              <Button onClick={handleImport}>
                <Plus className="h-4 w-4" />
                Import from Drive
              </Button>
            )}
          </div>

          {/* File list */}
          <FileList
            files={files}
            onViewFile={handleViewFile}
            onDeleteFile={handleDeleteFile}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
