const fs = require('fs');

function replaceInFile(filePath, replacements) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = content;
        for (const [search, replace] of replacements) {
            modified = modified.split(search).join(replace);
        }
        if (content !== modified) {
            fs.writeFileSync(filePath, modified, 'utf8');
            console.log('Updated', filePath);
        }
    } catch (e) {
        console.error('Failed to process', filePath, e.message);
    }
}

// 1. Backend landing settings model
replaceInFile('src/modules/food/landing/models/landingSettings.model.js', [
    ['default: 250', 'default: 99']
]);

