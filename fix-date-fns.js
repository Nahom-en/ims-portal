const fs = require('fs');

const dateHelper = "function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }) {\n  const now = new Date();\n  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);\n  const suffix = options?.addSuffix ? ' ago' : '';\n  if (diffInSeconds < 60) return 'just now';\n  const diffInMinutes = Math.floor(diffInSeconds / 60);\n  if (diffInMinutes < 60) return diffInMinutes + ' minute' + (diffInMinutes !== 1 ? 's' : '') + suffix;\n  const diffInHours = Math.floor(diffInMinutes / 60);\n  if (diffInHours < 24) return diffInHours + ' hour' + (diffInHours !== 1 ? 's' : '') + suffix;\n  const diffInDays = Math.floor(diffInHours / 24);\n  if (diffInDays < 30) return diffInDays + ' day' + (diffInDays !== 1 ? 's' : '') + suffix;\n  const diffInMonths = Math.floor(diffInDays / 30);\n  if (diffInMonths < 12) return diffInMonths + ' month' + (diffInMonths !== 1 ? 's' : '') + suffix;\n  const diffInYears = Math.floor(diffInDays / 365);\n  return diffInYears + ' year' + (diffInYears !== 1 ? 's' : '') + suffix;\n}";

for (const file of ['src/components/dashboard/RecentActivity.tsx', 'src/components/dashboard/PendingActions.tsx']) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/import \{ formatDistanceToNow \} from "date-fns"/, dateHelper);
  fs.writeFileSync(file, code);
}
