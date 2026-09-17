const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    let fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.next')) { 
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.tsx') && !fullPath.includes('spinner.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Replace Loader2
  content = content.replace(/<Loader2\s+[^>]*animate-spin[^>]*\/>/g, '<Spinner inline />');
  content = content.replace(/<Loader2\s+className="[^"]*animate-spin[^"]*"\s*\/>/g, '<Spinner inline />');
  
  // 2. Replace generic div spinners
  // w-12 or w-8 -> Spinner
  content = content.replace(/<div\s+className="[^"]*w-(12|8)[^"]*animate-spin[^"]*"\s*(?:><\/div>|\/>)/g, '<Spinner />');
  // w-3, w-4, w-5, w-6 -> Spinner inline
  content = content.replace(/<div\s+className="[^"]*w-(3|4|5|6)\s+h-(3|4|5|6)[^"]*animate-spin[^"]*"\s*(?:><\/div>|\/>)/g, '<Spinner inline />');

  // 5. Add Spinner import if changed
  if (content !== original) {
    if (!content.includes("from '@/components/ui/spinner'") && !content.includes('from "@/components/ui/spinner"')) {
      const importMatches = [...content.matchAll(/^import /gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const nextLineIdx = content.indexOf('\n', lastMatch.index) + 1;
        content = content.slice(0, nextLineIdx) + "import { Spinner } from '@/components/ui/spinner';\n" + content.slice(nextLineIdx);
      } else {
        content = "import { Spinner } from '@/components/ui/spinner';\n" + content;
      }
    }
    fs.writeFileSync(file, content);
    changedCount++;
    console.log('Updated', file);
  }
});
console.log('Total files updated:', changedCount);
