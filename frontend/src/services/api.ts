import axios from 'axios';
import type { DataRoomFile } from '@/types/file';
import { BACKEND_URL } from '@/config/constants';

/** Transform snake_case API response to camelCase */
export function transformFile(data: Record<string, unknown>): DataRoomFile {
  return {
    id: data.id as string,
    name: data.name as string,
    mimeType: data.mime_type as string,
    size: data.size as number,
    googleDriveId: data.google_drive_id as string,
    importedAt: data.imported_at as string,
  };
}

/** Get all files in the Data Room */
export async function fetchFiles(): Promise<DataRoomFile[]> {
  const response = await axios.get(`${BACKEND_URL}/files`);
  return response.data.map(transformFile);
}

/** Import a file from Google Drive */
export async function importFileFromDrive(googleDriveId: string, sessionToken: string): Promise<DataRoomFile> {
  const response = await axios.post(
    `${BACKEND_URL}/files/import`,
    { google_drive_id: googleDriveId },
    { headers: { 'X-Session-Token': sessionToken } }
  );
  return transformFile(response.data);
}

/** Delete a file from the Data Room */
export async function deleteFile(fileId: string, sessionToken: string): Promise<void> {
  await axios.delete(`${BACKEND_URL}/files/${fileId}`, {
    headers: { 'X-Session-Token': sessionToken }
  });
}

/** Get access token from backend using session token */
export async function getAccessToken(sessionToken: string): Promise<string | null> {
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

/** Check if error is a 401 unauthorized */
export function isUnauthorizedError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}
