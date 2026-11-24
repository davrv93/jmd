import { defineConfig } from 'astro/config';

export default defineConfig({
  base: '/cursos/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  }
});
