import { useAuth } from '@/hooks/useAuth';
import { useFiles } from '@/hooks/useFiles';
import { Header } from '@/components/Header';
import { FileSection } from '@/components/FileSection';

function App() {
  const {
    sessionToken,
    accessToken,
    driveStatus,
    connectDrive,
    logout,
    clearSession,
    refreshAccessToken,
  } = useAuth();

  const {
    files,
    isLoading,
    isImporting,
    handleImport,
    handleViewFile,
    handleDeleteFile,
  } = useFiles({
    sessionToken,
    accessToken,
    clearSession,
    refreshAccessToken,
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        driveStatus={driveStatus}
        onConnect={connectDrive}
        onDisconnect={logout}
      />
      <FileSection
        files={files}
        driveStatus={driveStatus}
        isLoading={isLoading}
        isImporting={isImporting}
        onImport={handleImport}
        onViewFile={handleViewFile}
        onDeleteFile={handleDeleteFile}
      />
    </div>
  );
}

export default App;
