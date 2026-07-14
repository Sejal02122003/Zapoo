import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directory = path.join(__dirname, 'src');

const replaceRules = [
    { regex: /Appzeto/g, replacement: "Zapoo" },
    { regex: /appzeto/g, replacement: "zapoo" },
    { regex: /Indian Bites/g, replacement: "Zapoo" },
    { regex: /Indian bites/g, replacement: "Zapoo" },
    { regex: /indian bites/g, replacement: "zapoo" },
    { regex: /IndianBites/g, replacement: "Zapoo" },
    { regex: /indianbites/g, replacement: "zapoo" },
    { regex: /Foodelo/g, replacement: "Zapoo" },
    { regex: /foodelo/g, replacement: "zapoo" }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else {
            const ext = path.extname(fullPath);
            if (['.js', '.jsx', '.css', '.html', '.json', '.md'].includes(ext)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let newContent = content;
                
                replaceRules.forEach(rule => {
                    newContent = newContent.replace(rule.regex, rule.replacement);
                });
                
                if (newContent !== content) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Updated: ${fullPath}`);
                }
            }
        }
    });
}

console.log("Starting brand replacement in src directory...");
processDirectory(directory);
console.log("Brand replacement complete.");
