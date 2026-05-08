import nextVitals from 'eslint-config-next/core-web-vitals';

const ignoredPaths = [
  '.next/**',
  'node_modules/**',
  'out/**',
];

const eslintConfig = [
  { ignores: ignoredPaths },
  ...nextVitals,
];

export default eslintConfig;
