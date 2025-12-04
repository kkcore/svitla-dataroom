import { Button } from '@/components/ui/button';
import { FileList } from '@/components/FileList';
import { Plus, Loader2 } from 'lucide-react';
import type { DataRoomFile, GoogleDriveStatus } from '@/types/file';

interface FileSectionProps {
  files: DataRoomFile[];
  driveStatus: GoogleDriveStatus;
  isLoading: boolean;
  isImporting: boolean;
  onImport: () => void;
  onViewFile: (file: DataRoomFile) => void;
  onDeleteFile: (file: DataRoomFile) => void;
}

export function FileSection({
  files,
  driveStatus,
  isLoading,
  isImporting,
  onImport,
  onViewFile,
  onDeleteFile,
}: FileSectionProps) {
  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium">Files</h2>
          {driveStatus === 'connected' && (
            <Button onClick={onImport} disabled={isImporting}>
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
            onViewFile={onViewFile}
            onDeleteFile={onDeleteFile}
          />
        )}
      </div>
    </main>
  );
}
