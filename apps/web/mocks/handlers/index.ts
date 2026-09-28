import { authHandlers } from './auth';
import { categoryHandlers } from './categories';
import { coupleHandlers } from './couple';
import { currencyHandlers } from './currencies';
import { goalHandlers } from './goals';
import { meHandlers } from './me';
import { overviewHandlers } from './overview';
import { transactionHandlers } from './transactions';

// One handler per endpoint in the frozen contract. The same list serves the browser
// worker (dev), the Node server (tests) and Storybook (F4-11).
export const handlers = [
  ...authHandlers,
  ...meHandlers,
  ...transactionHandlers,
  ...overviewHandlers,
  ...goalHandlers,
  ...coupleHandlers,
  ...categoryHandlers,
  ...currencyHandlers,
];
