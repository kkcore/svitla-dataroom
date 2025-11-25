import { FileText, FileSpreadsheet, FileImage, File, Presentation, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DataRoomFile } from '@/types/file';

interface FileListProps {
  files: DataRoomFile[];
  onViewFile: (file: DataRoomFile) => void;
  onDeleteFile: (file: DataRoomFile) => void;
}

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
}

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
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead className="min-w-[100px]">Size</TableHead>
            <TableHead className="min-w-[120px]">Imported</TableHead>
            <TableHead className="text-right min-w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow
              key={file.id}
              className="cursor-pointer"
              onClick={() => onViewFile(file)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  {getFileIcon(file.mimeType)}
                  <span className="truncate">{file.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(file.size)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(file.importedAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file);
                  }}
                >
                <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file);
                  }}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
