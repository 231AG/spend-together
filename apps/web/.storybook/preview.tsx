import type { Preview } from '@storybook/nextjs-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { handlers } from '../mocks/handlers';
import '../app/globals.css';
import './fonts.css';

const preview: Preview = {
  // F4-11: stories that fetch are answered by the same handlers as dev and tests.
  loaders: [mswLoader()],
  parameters: {
    layout: 'padded',
    msw: [...handlers],
    controls: { expanded: true },
    // axe runs on every story; a violation fails the story in the a11y panel and in CI
    // (components/ui/stories.a11y.test.tsx runs the same stories through axe).
    a11y: { test: 'error' },
    viewport: {
      options: {
        mobile: { name: 'Mobile 360', styles: { width: '360px', height: '780px' } },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '800px' } },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-bg-app p-4 text-fg-body">
        <Story />
      </div>
    ),
  ],
};

export default preview;
