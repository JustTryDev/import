import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code 스킬/에이전트 템플릿 (실제 프로젝트 코드 아님)
    ".claude/**",
  ]),
  // 에디터/뷰어 컴포넌트에서 img 태그 허용 (동적 이미지 처리)
  {
    files: [
      "src/components/ui/RichTextEditor.tsx",
      "src/components/ui/RichTextViewer.tsx",
      "src/components/ui/editor/**/*.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
