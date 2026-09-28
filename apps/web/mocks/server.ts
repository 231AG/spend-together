import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** The same handlers for Vitest (Node). */
export const server = setupServer(...handlers);
