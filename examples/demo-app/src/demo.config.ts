import { defineConfig } from '@nestjs-live-configs/core';

export const demoMessageConfig = defineConfig<string>({
  key: 'demo.message',
  defaultValue: 'Hello from live config',
  validate: (value) => {
    if (value.trim().length === 0 || value.length > 512) {
      throw new Error('demo.message must be between 1 and 512 characters');
    }
  },
});

export const demoThemeConfig = defineConfig<string>({
  key: 'demo.theme',
  defaultValue: 'light',
  validate: (value) => {
    if (value !== 'light' && value !== 'dark') {
      throw new Error('demo.theme must be either "light" or "dark"');
    }
  },
});
