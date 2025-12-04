// Google Cloud credentials for the Drive Picker (client-side)
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

// Allowed MIME types for file picker
export const ALLOWED_MIME_TYPES = [
  'image/*',
  'application/pdf',
  'application/vnd.google-apps.document',      // Google Docs
  'application/vnd.google-apps.spreadsheet',   // Google Sheets
  'application/vnd.google-apps.presentation',  // Google Slides
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword',                        // .doc
  'application/vnd.ms-excel',                  // .xls
  'application/vnd.ms-powerpoint',             // .ppt
  'text/plain',                                // .txt
  'text/csv',                                  // .csv
].join(',');
