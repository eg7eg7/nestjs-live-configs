import { defineConfig } from '../../../src/index.ts';

export const demoMessageConfig = defineConfig<string>({
  key: 'demo.message',
  defaultValue: 'Hello from live config',
});

export const demoThemeConfig = defineConfig<string>({
  key: 'demo.theme',
  defaultValue: 'light',
});
