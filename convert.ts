import fs from 'fs';
const img = fs.readFileSync('assets/logocbmpacedec.png');
fs.writeFileSync('assets/logoBase64.ts', 'export const logoCBMPABase64 = "data:image/png;base64,' + img.toString('base64') + '";\n');
