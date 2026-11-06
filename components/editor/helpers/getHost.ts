import { getApiBase } from '../utils/auth/api';

/** Where API calls go. The host app sets it through WriteGridEditorProvider. */
export const getHost = (_params: { purpose?: string } = {}): string => getApiBase();
export const browserApiBase = (): string => getApiBase();
