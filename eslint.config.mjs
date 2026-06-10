import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url))
});

const generatedIgnores = [
  '.next/**',
  'node_modules/**',
  'data/local/**',
  'data/generated/**',
  'data/public/**',
  'public/generated/**',
  'uploads/**'
];

const config = [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: generatedIgnores
  }
];

export default config;
