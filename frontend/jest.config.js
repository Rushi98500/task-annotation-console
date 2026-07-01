/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "esnext",
          moduleResolution: "bundler",
          paths: { "@/*": ["./src/*"] },
          strict: true,
          esModuleInterop: true,
          resolveJsonModule: true,
          isolatedModules: true,
          skipLibCheck: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-markdown|remark-gfm|rehype-sanitize|rehype-raw|unified|bail|is-plain-obj|trough|vfile|devlop|mdast-util-from-markdown|mdast-util-to-markdown|mdast-util-to-hast|micromark|parse-entities|character-entities|decode-named-character-reference|ccount|escape-string-regexp|trim-lines|zwitch|html-void-elements|stringify-entities|character-entities-html4|lucide-react)/)",
  ],
};

module.exports = config;
