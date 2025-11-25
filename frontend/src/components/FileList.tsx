import { FileText, FileSpreadsheet, FileImage, File, Presentation, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DataRoomFile } from '@/types/file';

interface FileListProps {
  files: DataRoomFile[];
  onViewFile: (file: DataRoomFile) => void;
  onDeleteFile: (file: DataRoomFile) => void;
}

/** Get appropriate icon based on MIME type */
function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf' || mimeType.includes('word')) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-5 w-5 text-purple-600" />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <Presentation className="h-5 w-5 text-orange-600" />;
  }
  return <File className="h-5 w-5 text-gray-600" />;
}

/** Format file size to human readable string */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
}

/** Format date to locale string */
function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FileList({ files, onViewFile, onDeleteFile }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No files imported yet</p>
        <p className="text-sm">Connect Google Drive and import your first file</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_120px_50px] gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
        <div>Name</div>
        <div>Size</div>
        <div>Imported</div>
        <div></div>
      </div>

      {/* File rows */}
      <div className="divide-y">
        {files.map((file) => (
          <div
            key={file.id}
            className="grid grid-cols-[1fr_100px_120px_50px] gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer items-center"
            onClick={() => onViewFile(file)}
          >
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(file.mimeType)}
              <span className="truncate">{file.name}</span>
            </div>
            <div className="text-sm text-gray-600">{formatFileSize(file.size)}</div>
            <div className="text-sm text-gray-600">{formatDate(file.importedAt)}</div>
            <div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(file);
                }}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
