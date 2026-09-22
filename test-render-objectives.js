const fs = require('fs');
const page = fs.readFileSync('src/app/department/objectives/page.tsx', 'utf8');
// Just checking if there are obvious errors in the JSX map functions
const lines = page.split('\n');
lines.forEach((l, i) => {
  if(l.includes('.map(') || l.includes('filter(') || l.includes('sort(')) {
    console.log(i+1, l);
  }
});
