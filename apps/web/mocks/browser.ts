import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** The dev worker. Started by MockProvider only when NEXT_PUBLIC_API_MODE=mock. */
export const worker = setupWorker(...handlers);
