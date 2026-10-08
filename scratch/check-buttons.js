const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const buttonRegex = /<button\b([^>]*)>/g;
let match;
let untypedButtons = 0;
const issues = [];

while ((match = buttonRegex.exec(html)) !== null) {
  const attrs = match[1];
  if (!attrs.includes('type=')) {
    untypedButtons++;
    issues.push(match[0]);
  }
}

console.log('Total untyped <button> tags:', untypedButtons);
issues.forEach(i => console.log('Untyped button:', i));
