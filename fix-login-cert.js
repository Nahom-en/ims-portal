const fs = require('fs');
let code = fs.readFileSync('src/app/auth/login/page.tsx', 'utf8');

code = code.replace(/ShieldCheck/g, 'Certificate');

fs.writeFileSync('src/app/auth/login/page.tsx', code);
