const fs = require('fs');
function replace(file, search, replaceStr) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(search, replaceStr);
  fs.writeFileSync(file, content);
}

// remove callback() {} in login.ts
replace('src/app/pages/login/login.ts', '  callback() {}\n', '');
// remove callback() {} in settings.ts
replace('src/app/pages/settings/settings.ts', '  callback() {}\n', '');

// fix empty function in auth.service.spec.ts
replace(
  'src/app/services/auth.service.spec.ts',
  '      useValue: {\n        // eslint-disable-next-line @typescript-eslint/no-empty-function\n        checkAuth: () => {},\n      },',
  '      useValue: {\n        checkAuth: () => undefined,\n      },',
);

// environment
replace(
  'src/environments/environment.development.ts',
  "const getBackendUrl = () => {\n  if (typeof window !== 'undefined') {\n    return `http://${window.location.hostname}:8000`;\n  }\n  return 'http://127.0.0.1:8000';\n};",
  '',
);

// remove all unused _e in catch
let authContent = fs.readFileSync('src/app/services/auth.service.ts', 'utf8');
authContent = authContent.replace(/catch \(_e: any\) \{/g, 'catch {');
authContent = authContent.replace(/catch \(_e\) \{/g, 'catch {');
fs.writeFileSync('src/app/services/auth.service.ts', authContent);

let cookieContent = fs.readFileSync('src/app/services/cookie-consent.service.ts', 'utf8');
cookieContent = cookieContent.replace(/catch \(_e\) \{/g, 'catch {');
fs.writeFileSync('src/app/services/cookie-consent.service.ts', cookieContent);

// compliance spec
replace('src/app/pages/compliance/compliance.spec.ts', '(_destination: any)', '()');

console.log('Fixed more');
