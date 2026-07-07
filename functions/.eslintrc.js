module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ["eslint:recommended", "google"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: ["lib/**/*"],
  rules: {
    indent: "off",
    "max-len": [
      "error",
      {
        code: 100,
        ignoreComments: true,
      },
    ],
    "object-curly-spacing": ["error", "always"],
    quotes: ["error", "double"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
  },
};
