const fs = require('fs');

function replaceFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    code = code.replace(from, to);
  }
  fs.writeFileSync(path, code);
}

replaceFile('src/app/department/risks/page.tsx', [
  [/<h1 className="text-2xl font-bold tracking-tight">Risk Register<\/h1>/g, '<h1 className="text-2xl font-bold tracking-tight">Risks</h1>']
]);

replaceFile('src/app/department/kpis/page.tsx', [
  [/<h1 className="text-2xl font-bold tracking-tight">Key Performance Indicators<\/h1>/g, '<h1 className="text-2xl font-bold tracking-tight">KPIs</h1>']
]);

replaceFile('src/components/sidebar/app-sidebar.tsx', [
  [/title: "Risk Register"/g, 'title: "Risks"'],
  [/title: "KPI Tracking"/g, 'title: "KPIs"']
]);

replaceFile('src/components/layout/TopHeader.tsx', [
  [/if \(segment\.toLowerCase\(\) === 'risks'\) label = 'Risk Register'/g, "if (segment.toLowerCase() === 'risks') label = 'Risks'"],
  [/if \(segment\.toLowerCase\(\) === 'kpis'\) label = 'KPI Tracking'/g, "if (segment.toLowerCase() === 'kpis') label = 'KPIs'"]
]);

replaceFile('src/components/forms/ReportForm.tsx', [
  [/<p className="text-sm font-semibold">Risk Register<\/p>/g, '<p className="text-sm font-semibold">Risks</p>']
]);

console.log("Labels updated");
