import { Button } from '@/components/ui/button';
import { HardDrive, Lock } from 'lucide-react';
import type { GoogleDriveStatus } from '@/types/file';

interface HeaderProps {
  driveStatus: GoogleDriveStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({ driveStatus, onConnect, onDisconnect }: HeaderProps) {
  return (
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
            <Button variant="outline" size="sm" onClick={onDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={onConnect}>
            <HardDrive className="h-4 w-4" />
            Connect Google Drive
          </Button>
        )}
      </div>
    </header>
  );
}
