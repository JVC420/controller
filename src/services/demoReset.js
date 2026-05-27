import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

/**
 * Invoca la Cloud Function `resetDemoData` (definida en functions/index.js).
 * Solo funciona en el demo HOSPEDADO (no en emulators locales: ahí los datos
 * se regeneran reiniciando `npm run demo`).
 */
export const triggerDemoReset = async () => {
  const callable = httpsCallable(functions, 'resetDemoData');
  const result = await callable({});
  return result.data;
};
