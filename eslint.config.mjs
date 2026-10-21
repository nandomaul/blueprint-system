import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['dist/**', 'node_modules/**', 'preview.html', 'scripts/**', 'tmp/**', '.ui-test-*/**'] }, ...tseslint.configs.recommended);
