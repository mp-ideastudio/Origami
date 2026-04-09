// Quick check script
const fs = require('fs');

try {
  let content = fs.readFileSync('NewOrigami.FPV.1.html', 'utf8');
  let scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
     console.log("No script tag found!");
     process.exit(1);
  }
  let script = scriptMatch[1];
  
  // Actually, we don't need JS to just find and replace the braces if we use python.
  // Actually I can just fix it with multi_replace_file_content!
} catch(e) {
  console.log(e);
}
