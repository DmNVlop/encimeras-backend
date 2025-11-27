// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
// 1. IMPORTAR PLUGIN DE IMPORTS
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**'], // Ignoramos build y config
  },
  {
    // Configuración Base
    languageOptions: {
      globals: globals.node, // <--- IMPORTANTE: Entorno NODE, no Browser
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json', // Ruta a tu config de TS
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // 2. CONFIGURAR RESOLVER PARA QUE ENTIENDA RUTAS DE NEST
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    plugins: {
      import: importPlugin,
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      // ...tseslint.configs.stylistic, // Opcional: si quieres reglas de estilo extra estricto
    ],
    rules: {
      // --- REGLAS ESPECÍFICAS DE NESTJS (DEFAULTS) ---
      // Nest suele desactivar estas para ser flexible, las dejamos así para no romper tu código actual
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      // --- TUS REGLAS DE CALIDAD ---
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }], // En Nest a veces el log es útil, ajústalo a gusto
      'no-unused-vars': 'off', // Apagamos la regla base para usar la de TS
      '@typescript-eslint/no-unused-vars': ['warn'], // Variables no usadas = Warning
      
      // --- REGLA ANTI-CICLOS ---
      'import/no-cycle': 'error', // <--- Esto salvará tu arquitectura
    },
  },
  // 3. PRETTIER SIEMPRE AL FINAL
  eslintConfigPrettier,
);