const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', '9041d62be6f8cfa835258a7ab3badd23.jpg');
const b64 = fs.readFileSync(imgPath).toString('base64');
const outPath = path.join(__dirname, '..', 'src', 'assets', 'logo.ts');
const content = `export const RADIOACTIVE_LOGO = 'data:image/jpeg;base64,${b64}';\n`;

fs.writeFileSync(outPath, content);
console.log('Successfully generated', outPath, 'size:', content.length);

