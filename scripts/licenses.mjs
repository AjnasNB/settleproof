/** Regenerate shipped production-dependency notices without network access. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
const entries = Object.entries(lock.packages).filter(([location, info]) => location.startsWith('node_modules/') && !info.dev);
const components = [];
// This published package omits its repository LICENSE. Freeze the exact npm
// gitHead's notice in our source rather than changing node_modules or guessing.
const frozenNotices = {
  '@paypal/paypal-js@11.2.2': {
    file: 'licenses/paypal-js-11.2.2-LICENSE.txt',
    source: 'https://github.com/paypal/paypal-js/blob/f58396a4cc57552e475fb198234d8e822c25e6b4/LICENSE',
  },
  'agent-base@6.0.2': {
    file: 'licenses/agent-base-6.0.2-LICENSE.txt',
    source: 'https://github.com/TooTallNate/node-agent-base/blob/c4b8ea2e1a11bae023bb09b708050a50418204e9/README.md#license',
  },
  'https-proxy-agent@5.0.1': {
    file: 'licenses/https-proxy-agent-5.0.1-LICENSE.txt',
    source: 'https://github.com/TooTallNate/node-https-proxy-agent/blob/d0d80cc0482f20495aa8595f802e1a9f3b1b3409/README.md#license',
  },
};
for (const [location, info] of entries.sort(([a], [b]) => a.localeCompare(b))) {
  const folder = path.join(root, location);
  const pkg = JSON.parse(await readFile(path.join(folder, 'package.json'), 'utf8'));
  const files = (await readdir(folder)).filter(name => /^(?:licen[sc]e|copying|notice|copyright|ofl)(?:\.|$)/i.test(name)).sort();
  const notices = [];
  if (!files.length) {
    const frozen = frozenNotices[`${pkg.name}@${pkg.version}`];
    if (!frozen) throw new Error(`Missing installed license text for ${pkg.name}; inspect before publishing.`);
    const body = await readFile(path.join(root, frozen.file), 'utf8');
    notices.push(`Source: ${frozen.source}\n\n\`\`\`text\n${body.trim()}\n\`\`\`\n`);
  }
  for (const name of files) {
    const body = await readFile(path.join(folder, name), 'utf8');
    notices.push(`### ${name}\n\n\`\`\`text\n${body.trim()}\n\`\`\`\n`);
  }
  components.push({ name: pkg.name, version: pkg.version || info.version, license: pkg.license || info.license || 'See text', notices: notices.join('\n') });
}
const content = `# Third-party notices\n\nSettleProof's own source is MIT licensed. This file preserves notices from installed production dependencies recorded in package-lock.json. Regenerate with \`node scripts/licenses.mjs\` after dependency changes. Development tools retain their notices in their respective packages.\n\nAG Grid Community is used; no Enterprise package or license is included. Fonts retain their own font license. The runtime AI model is accessed through an external provider binding; its weights are not distributed here, and this project's MIT license does not relicense the model or provider services.\n\n| Component | Installed version | Declared license |\n|---|---|---|\n${components.map(item => `| ${item.name} | ${item.version} | ${item.license} |`).join('\n')}\n\n${components.map(item => `## ${item.name} ${item.version}\n\n${item.notices}`).join('\n')}`;
await writeFile(path.join(root, 'THIRD-PARTY-NOTICES.md'), content.replace(/[\t ]+$/gm, ''));
console.log(`Wrote production dependency notices for ${components.length} installed packages.`);
