// Copyright (C) 2026 ading2210
// Written by NorthernChicken

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STANDALONE_DIR = __dirname;
const PROJECT_ROOT = path.dirname(STANDALONE_DIR);
const DIST_DIR = path.join(STANDALONE_DIR, 'dist');
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

console.log('Reading source files');

// so at least the original html/css can be used.
const popupHtml = fs.readFileSync(
  path.join(PROJECT_ROOT, 'app/html/popup.html'),
  'utf8'
);

const consoleHtml = fs.readFileSync(
  path.join(PROJECT_ROOT, 'app/html/console.html'),
  'utf8'
);

const popupCss = fs.readFileSync(
  path.join(PROJECT_ROOT, 'app/css/popup.css'),
  'utf8'
);

const entryJs = fs.readFileSync(
  path.join(STANDALONE_DIR, 'entry.js'),
  'utf8'
);

console.log('Inlining resources');

let bundledJs = entryJs;

function escapeForJs(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
}
bundledJs = bundledJs.replace(
  '__POPUP_HTML__',
  '`' + escapeForJs(popupHtml) + '`'
);

bundledJs = bundledJs.replace(
  '__CONSOLE_HTML__',
  '`' + escapeForJs(consoleHtml) + '`'
);

bundledJs = bundledJs.replace(
  '__POPUP_CSS__',
  '`' + escapeForJs(popupCss) + '`'
);

// temp file for minification
const tempBundlePath = path.join(DIST_DIR, 'temp.bundle.js');
fs.writeFileSync(tempBundlePath, bundledJs);

// minify with terser. (install w/ npm i)
// still works without terser but larger file, browsers might not like
console.log('Minifying');
try {
  const consolePastePath = path.join(DIST_DIR, 'console-paste.js');

  execSync(`npx --no-install terser "${tempBundlePath}" -o "${consolePastePath}" --compress --mangle`, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe'
  });

  const minStats = fs.statSync(consolePastePath);
  const minSizeKB = (minStats.size / 1024).toFixed(2);
  console.log('Wrote minified to:', consolePastePath);
  console.log(`  Size: ${minSizeKB} KB`);

} catch (e) {
  console.log('Minification failed (terser not available?)');
  const consolePastePath = path.join(DIST_DIR, 'console-paste.js');
  fs.copyFileSync(tempBundlePath, consolePastePath);
  console.log('wrote unminified to:', consolePastePath);
} finally {
  // Cleanup temp
  if (fs.existsSync(tempBundlePath)) {
    fs.unlinkSync(tempBundlePath);
  }
}

console.log('Build Complete');
console.log('Output: standalone/dist/console-paste.js');