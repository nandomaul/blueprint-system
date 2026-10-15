import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['dist/**', 'node_modules/**', 'preview.html', 'scripts/**'] }, ...tseslint.configs.recommended);
