import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const newFn = fs.readFileSync('new_open_detail.txt', 'utf8');

const lines = html.split('\r\n');
const before = lines.slice(0, 3364);   // 0-indexed: lines before line 3365
const after = lines.slice(3485);        // 0-indexed: lines after line 3485

const newLines = [...before, ...newFn.split('\n'), ...after];
fs.writeFileSync('index.html', newLines.join('\r\n'), 'utf8');

console.log('Done. before:', before.length, 'fn lines:', newFn.split('\n').length, 'after:', after.length, 'total:', newLines.length);
