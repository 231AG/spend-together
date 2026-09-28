import type { StorybookConfig } from '@storybook/nextjs-vite';

// Storybook is the F3 review artefact (ADR-007): every component, variant and state.
const config: StorybookConfig = {
  framework: { name: '@storybook/nextjs-vite', options: {} },
  stories: ['../components/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  staticDirs: [{ from: '../app/fonts', to: '/fonts' }],
  core: { disableTelemetry: true },
};

export default config;
