import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileList } from '@/components/FileList';
import { mockFiles } from '@/data/mockFiles';
import { HardDrive, Plus } from 'lucide-react';
import type { DataRoomFile, GoogleDriveStatus } from '@/types/file';

function App() {
  const [files, setFiles] = useState<DataRoomFile[]>(mockFiles);
  const [driveStatus] = useState<GoogleDriveStatus>('connected'); // Mock as connected for now

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
    // TODO: Open Google Drive picker
    alert('Google Drive picker will open here');
  };

  const handleConnectDrive = () => {
    // TODO: Initiate OAuth flow
    alert('OAuth flow will start here');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold">Data Room</h1>
          {driveStatus === 'connected' ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <HardDrive className="h-4 w-4" />
              Google Drive Connected
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
