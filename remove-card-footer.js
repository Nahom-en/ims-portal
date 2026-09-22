const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/OverviewCards.tsx', 'utf8');

// Replace all <CardFooter>...</CardFooter> blocks with empty string
code = code.replace(/<CardFooter[\s\S]*?<\/CardFooter>/g, '');

// Also remove CardFooter from import if it's unused
// code = code.replace(/, CardFooter/, '');

fs.writeFileSync('src/components/dashboard/OverviewCards.tsx', code);
