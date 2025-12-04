import { useState, useEffect, useCallback } from 'react';
import type { GoogleDriveStatus } from '@/types/file';
import { getAccessToken } from '@/services/api';
import { BACKEND_URL } from '@/config/constants';

export interface UseAuthReturn {
  sessionToken: string | null;
  accessToken: string | null;
  driveStatus: GoogleDriveStatus;
  connectDrive: () => void;
  logout: () => void;
  clearSession: () => void;
  refreshAccessToken: () => Promise<string | null>;
}

/** Get initial auth state from URL params or localStorage */
function getInitialAuthState(): {
  sessionToken: string | null;
  accessToken: string | null;
  driveStatus: GoogleDriveStatus;
  needsTokenFetch: boolean;
  authError: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  const authSuccess = params.get('auth_success');
  const authError = params.get('auth_error');
  const urlSession = params.get('session_token');

  // OAuth callback takes precedence
  if (authSuccess && urlSession) {
    localStorage.setItem('session_token', urlSession);
    window.history.replaceState({}, '', window.location.pathname);
    return {
      sessionToken: urlSession,
      accessToken: null,
      driveStatus: 'connected',
      needsTokenFetch: true,
      authError: null,
    };
  }

  if (authError) {
    window.history.replaceState({}, '', window.location.pathname);
    return {
      sessionToken: null,
      accessToken: null,
      driveStatus: 'disconnected',
      needsTokenFetch: false,
      authError,
    };
  }

  // Try localStorage
  const storedSession = localStorage.getItem('session_token');
  const storedToken = localStorage.getItem('access_token');

  if (storedSession && storedToken) {
    return {
      sessionToken: storedSession,
      accessToken: storedToken,
      driveStatus: 'connected',
      needsTokenFetch: false,
      authError: null,
    };
  }

  if (storedSession) {
    return {
      sessionToken: storedSession,
      accessToken: null,
      driveStatus: 'disconnected',
      needsTokenFetch: true,
      authError: null,
    };
  }

  return {
    sessionToken: null,
    accessToken: null,
    driveStatus: 'disconnected',
    needsTokenFetch: false,
    authError: null,
  };
}

export function useAuth(): UseAuthReturn {
  const [initialState] = useState(getInitialAuthState);
  const [sessionToken, setSessionToken] = useState<string | null>(initialState.sessionToken);
  const [accessToken, setAccessToken] = useState<string | null>(initialState.accessToken);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>(initialState.driveStatus);

  // Show auth error if present
  useEffect(() => {
    if (initialState.authError) {
      console.error('OAuth error:', initialState.authError);
      alert(`Authentication failed: ${initialState.authError}`);
    }
  }, [initialState.authError]);

  // Fetch access token if needed (after OAuth redirect or session restore)
  useEffect(() => {
    if (!initialState.needsTokenFetch || !initialState.sessionToken) return;

    getAccessToken(initialState.sessionToken).then(token => {
      if (token) {
        setAccessToken(token);
        localStorage.setItem('access_token', token);
        setDriveStatus('connected');
      } else {
        // Session expired
        localStorage.removeItem('session_token');
        localStorage.removeItem('access_token');
        setSessionToken(null);
        setDriveStatus('disconnected');
      }
    });
  }, [initialState.needsTokenFetch, initialState.sessionToken]);

  const clearSession = useCallback(() => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('access_token');
    setSessionToken(null);
    setAccessToken(null);
    setDriveStatus('disconnected');
  }, []);

  const connectDrive = useCallback(() => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!sessionToken) return null;
    const freshToken = await getAccessToken(sessionToken);
    if (freshToken) {
      setAccessToken(freshToken);
      localStorage.setItem('access_token', freshToken);
      return freshToken;
    }
    return null;
  }, [sessionToken]);

  return {
    sessionToken,
    accessToken,
    driveStatus,
    connectDrive,
    logout,
    clearSession,
    refreshAccessToken,
  };
}
