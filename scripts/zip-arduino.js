const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const targetDir = path.join(__dirname, '../docs/arduino-beginner');
const zipPath = path.join(targetDir, 'arduino-beginner.zip');

// Validate config.json before zipping
const configPath = path.join(targetDir, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: config.json not found in', targetDir);
  process.exit(1);
}

let configJson;
try {
  configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('Error: config.json parsing failed.', e.message);
  process.exit(1);
}

if (!configJson.cards || !Array.isArray(configJson.cards) || configJson.cards.length === 0) {
  console.error('Error: config.json must contain a non-empty "cards" list.');
  process.exit(1);
}

if (!configJson.toc || !Array.isArray(configJson.toc)) {
  console.error('Error: config.json must contain a "toc" (Table of Contents) list.');
  process.exit(1);
}

const collectedFilenames = [];
function validateTocRecursive(nodes, path) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const currentPath = `${path}[${i}]`;

    if (!node.type || !['chapter', 'section', 'subsection'].includes(node.type)) {
      console.error(`Error: ${currentPath} item has invalid or missing type.`);
      process.exit(1);
    }

    if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
      console.error(`Error: ${currentPath} item title is missing.`);
      process.exit(1);
    }

    if (!node.description || typeof node.description !== 'string' || !node.description.trim()) {
      console.error(`Error: ${currentPath} item description is missing.`);
      process.exit(1);
    }

    const cleanFilename = node.filename ? node.filename.replace(/\.mdx?$/, '') : '';
    if (node.title.trim() === cleanFilename) {
      console.error(`Error: ${currentPath} title is same as filename '${cleanFilename}'. Please provide a readable title.`);
      process.exit(1);
    }

    if (node.description.trim() === '강좌 상세 카드를 확인하세요.') {
      console.error(`Error: ${currentPath} description is set to default placeholder.`);
      process.exit(1);
    }

    if (node.filename) {
      collectedFilenames.push(node.filename);
    }

    if (node.children) {
      if (!Array.isArray(node.children)) {
        console.error(`Error: ${currentPath} children must be an array.`);
        process.exit(1);
      }
      validateTocRecursive(node.children, `${currentPath}.children`);
    }
  }
}

validateTocRecursive(configJson.toc, 'toc');

const cardsSet = new Set(configJson.cards);
if (cardsSet.size !== configJson.cards.length) {
  console.error('Error: config.json contains duplicate cards.');
  process.exit(1);
}

const collectedSet = new Set(collectedFilenames);
if (collectedSet.size !== collectedFilenames.length) {
  console.error('Error: toc contains duplicate filenames.');
  process.exit(1);
}

if (cardsSet.size !== collectedSet.size) {
  console.error(`Error: cards count (${cardsSet.size}) and collected toc filenames count (${collectedSet.size}) do not match.`);
  process.exit(1);
}

for (const card of configJson.cards) {
  if (!collectedSet.has(card)) {
    console.error(`Error: card '${card}' in cards list is not defined in toc.`);
    process.exit(1);
  }
}

console.log('Generating arduino-beginner.zip...');

const zip = new AdmZip();

// Add config.json
zip.addLocalFile(path.join(targetDir, 'config.json'));

// Add wiki.md
zip.addLocalFile(path.join(targetDir, 'wiki.md'));

// Add cards folder
zip.addLocalFolder(path.join(targetDir, 'cards'), 'cards');

// Save zip
zip.writeZip(zipPath);

console.log('Successfully created arduino-beginner.zip at:', zipPath);
