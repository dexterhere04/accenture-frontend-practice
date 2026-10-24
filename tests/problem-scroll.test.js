const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('problem statement scrolls with the mouse and keyboard at all layout sizes', async () => {
  const root = path.join(__dirname, '..');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Use the real workspace and a real task without starting the grading server.
    const html = fs.readFileSync(path.join(root, 'ide.html'), 'utf8')
      .replace(/<script[^>]*src="ide.js"[^>]*><\/script>/, '')
      .replace(/<link[^>]*href="ide.css"[^>]*>/, '');
    await page.setContent(html);
    await page.addStyleTag({ content: fs.readFileSync(path.join(root, 'ide.css'), 'utf8') });
    const task = fs.readFileSync(path.join(root, 'exercises/03-click-counter/task.md'), 'utf8');
    await page.locator('#task').evaluate((el, text) => {
      for (const line of text.split('\n').filter(Boolean)) {
        const p = document.createElement('p'); p.textContent = line; el.append(p);
      }
    }, task);
    for (const size of [{ width: 1440, height: 900 }, { width: 1000, height: 800 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      const panel = page.getByRole('complementary', { name: 'Problem statement' });
      await panel.evaluate(el => { el.scrollTop = 0; });
      await panel.hover();
      await page.mouse.wheel(0, 300);
      await page.waitForFunction(() => document.querySelector('aside').scrollTop > 0);
      await panel.focus();
      await page.keyboard.press('End');
      await page.waitForFunction(() => {
        const panel = document.querySelector('aside');
        return panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
      });
      assert.ok(await panel.evaluate(el => el.scrollTop > 0));
    }
  } finally { await browser.close(); }
});
