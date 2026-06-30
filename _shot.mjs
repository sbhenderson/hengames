import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173/?preview=game";
const out = process.argv[3] || "C:/Users/texas/.copilot/session-state/99e94b50-7f12-4d3c-a51b-f87d3c745d6b/files/shot.png";
const width = Number(process.argv[4] || 402);
const height = Number(process.argv[5] || 860);
const fullPage = process.argv[6] === "full";

const channels = ["msedge", "chrome", undefined];
let browser = null;
let lastErr = null;
for (const channel of channels) {
  try {
    browser = await chromium.launch(channel ? { channel } : {});
    break;
  } catch (err) {
    lastErr = err;
  }
}
if (!browser) {
  console.error("Could not launch a browser:", lastErr?.message);
  process.exit(1);
}

const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage });
await browser.close();
console.log("Saved", out);
