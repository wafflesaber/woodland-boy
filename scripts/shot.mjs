// Reusable game screenshotter. Usage: node scripts/shot.mjs <outPath> [waitMs] [clicksToStart]
// Loads the game, clicks to start, waits for the world to render, screenshots.
import { chromium } from 'playwright';

const out = process.argv[2] || '/tmp/woodland-shot.png';
const waitMs = parseInt(process.argv[3] || '2500', 10);
const url = 'http://localhost:3000/woodland-boy/';

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2 });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);           // let PreloadScene finish
await page.mouse.click(512, 384);          // tap to play -> GameScene
await page.waitForTimeout(waitMs);         // let world render + camera settle
await page.screenshot({ path: out });

console.log('SHOT:', out);
console.log('--- console ---');
console.log(logs.join('\n'));
await browser.close();
