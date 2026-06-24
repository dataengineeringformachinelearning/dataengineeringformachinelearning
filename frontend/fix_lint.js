const fs = require('fs');
function replace(file, search, replaceStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(search, replaceStr);
  fs.writeFileSync(file, content);
}

replace(
  'src/app/app.config.ts',
  'useFactory: () => () => {},',
  '// eslint-disable-next-line @typescript-eslint/no-empty-function\n      useFactory: () => () => {},',
);
replace('src/app/components/search-dialog/search-dialog.ts', '  ngOnInit() {}\n\n', '');
replace('src/app/components/sidebar/sidebar.ts', '  IncidentData,\n  MonitoredServiceData,\n', '');
replace('src/app/pages/compliance/compliance.spec.ts', '(destination: any)', '(_destination: any)');
replace('src/app/pages/login/login.ts', '  callback() {}\n\n', '');
replace('src/app/pages/settings/settings.ts', '  callback() {}\n\n', '');
replace(
  'src/app/services/auth.service.spec.ts',
  '      useValue: {\n        checkAuth: () => {},\n      },',
  '      useValue: {\n        // eslint-disable-next-line @typescript-eslint/no-empty-function\n        checkAuth: () => {},\n      },',
);

let authContent = fs.readFileSync('src/app/services/auth.service.ts', 'utf8');
authContent = authContent.replace('  RecaptchaVerifier,\n  signInWithPhoneNumber,\n', '');
authContent = authContent.replace('  MultiFactorResolver,\n  MultiFactorAssertion,\n', '');
authContent = authContent.replace(/catch \(e\) \{/g, 'catch (_e) {');
authContent = authContent.replace(/catch \(e: any\) \{/g, 'catch (_e: any) {');
authContent = authContent.replace(/console\.error\(_e\);/g, 'console.error(_e);');
fs.writeFileSync('src/app/services/auth.service.ts', authContent);

replace('src/app/services/cookie-consent.service.ts', 'catch (e) {', 'catch (_e) {');
replace(
  'src/environments/environment.development.ts',
  "const getBackendUrl = () => {\n  if (typeof window !== 'undefined') {\n    return `http://${window.location.hostname}:8000`;\n  }\n  return 'http://127.0.0.1:8000';\n};\n\n",
  '',
);

let testContent = fs.readFileSync('src/test-setup.ts', 'utf8');
testContent = testContent.replace(
  /addListener: \(\) => \{\},/g,
  '// eslint-disable-next-line @typescript-eslint/no-empty-function\n    addListener: () => {},',
);
testContent = testContent.replace(
  /removeListener: \(\) => \{\},/g,
  '// eslint-disable-next-line @typescript-eslint/no-empty-function\n    removeListener: () => {},',
);
testContent = testContent.replace(
  /addEventListener: \(\) => \{\},/g,
  '// eslint-disable-next-line @typescript-eslint/no-empty-function\n    addEventListener: () => {},',
);
testContent = testContent.replace(
  /removeEventListener: \(\) => \{\},/g,
  '// eslint-disable-next-line @typescript-eslint/no-empty-function\n    removeEventListener: () => {},',
);
fs.writeFileSync('src/test-setup.ts', testContent);

console.log('Fixed');
