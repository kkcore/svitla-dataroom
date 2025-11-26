import { useEffect, useRef } from 'react';
import type {
  DrivePickerElement,
  DrivePickerDocsViewElement,
  DrivePickerElementProps,
  DrivePickerDocsViewElementProps,
  PickerPickedEvent,
} from '@googleworkspace/drive-picker-element';

// Extend JSX IntrinsicElements so TypeScript recognizes the web component tags
declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'drive-picker': React.DetailedHTMLProps<
        React.HTMLAttributes<DrivePickerElement> & DrivePickerElementProps,
        DrivePickerElement
      >;
      'drive-picker-docs-view': React.DetailedHTMLProps<
        React.HTMLAttributes<DrivePickerDocsViewElement> &
          DrivePickerDocsViewElementProps,
        DrivePickerDocsViewElement
      >;
    }
  }
}

export interface DrivePickerFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
}

interface DrivePickerProps {
  clientId: string;
  appId: string;
  visible: boolean;
  oauthToken?: string | null;
  onVisibilityChange?: (visible: boolean) => void;
  onPicked?: (files: DrivePickerFile[]) => void;
  onCanceled?: () => void;
  onOAuthResponse?: (token: string) => void;
  onError?: (error: unknown) => void;
  multiselect?: boolean;
  mimeTypes?: string;
  title?: string;
}

export function DrivePicker({
  clientId,
  appId,
  visible,
  oauthToken,
  onVisibilityChange,
  onPicked,
  onCanceled,
  onOAuthResponse,
  onError,
  multiselect = true,
  mimeTypes,
  title,
}: DrivePickerProps) {
  const pickerRef = useRef<DrivePickerElement>(null);

  // Import the web component on mount
  useEffect(() => {
    import('@googleworkspace/drive-picker-element');
  }, []);

  // Control visibility
  useEffect(() => {
    if (pickerRef.current) {
      pickerRef.current.visible = visible;
    }
  }, [visible]);

  // Set up event listeners
  useEffect(() => {
    const pickerElement = pickerRef.current;
    if (!pickerElement) return;

    const handlePicked = (e: Event) => {
      const event = e as PickerPickedEvent;
      const files = (event.detail.docs || []) as DrivePickerFile[];
      onPicked?.(files);
      onVisibilityChange?.(false);
    };

    const handleCanceled = () => {
      onCanceled?.();
      onVisibilityChange?.(false);
    };

    const handleOAuthResponse = (e: Event) => {
      const event = e as CustomEvent<{ access_token: string }>;
      onOAuthResponse?.(event.detail.access_token);
    };

    const handleOAuthError = (e: Event) => {
      onError?.(e);
    };

    const handlePickerError = (e: Event) => {
      onError?.(e);
    };

    pickerElement.addEventListener('picker-picked', handlePicked);
    pickerElement.addEventListener('picker-canceled', handleCanceled);
    pickerElement.addEventListener('picker-oauth-response', handleOAuthResponse);
    pickerElement.addEventListener('picker-oauth-error', handleOAuthError);
    pickerElement.addEventListener('picker-error', handlePickerError);

    return () => {
      pickerElement.removeEventListener('picker-picked', handlePicked);
      pickerElement.removeEventListener('picker-canceled', handleCanceled);
      pickerElement.removeEventListener('picker-oauth-response', handleOAuthResponse);
      pickerElement.removeEventListener('picker-oauth-error', handleOAuthError);
      pickerElement.removeEventListener('picker-error', handlePickerError);
    };
  }, [onPicked, onCanceled, onOAuthResponse, onError, onVisibilityChange]);

  return (
    <drive-picker
      ref={pickerRef}
      client-id={clientId}
      app-id={appId}
      oauth-token={oauthToken || undefined}
      multiselect={multiselect}
      title={title}
    >
      <drive-picker-docs-view
        include-folders="false"
        mime-types={mimeTypes}
      />
    </drive-picker>
  );
}
