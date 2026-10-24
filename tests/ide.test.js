const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:4181';
function files(slug, solution = false) {
  return Object.fromEntries(['index.html', 'style.css', 'script.js'].map(name => {
    const file = path.join(root, 'exercises', slug, solution ? 'solution' : '', name);
    return [name, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''];
  }));
}
test('browser IDE grades actual submissions and preserves drafts and starter files', { timeout: 180000 }, async () => {
  const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '4181' }, windowsHide: true });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(`Server exited: ${code}`))); });
    const post = (endpoint, value) => fetch(origin + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    const slug = '03-click-counter', starter = files(slug);
    let response = await post('/api/run', { slug: '../bad', files: starter }); assert.equal(response.status, 400);
    response = await fetch(origin + '/api/run', { method: 'POST', headers: { Origin: 'https://example.com' } }); assert.equal(response.status, 403);
    response = await fetch(origin + '/.git/config'); assert.equal(response.status, 404);
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(origin);
    await page.getByRole('link', { name: 'Start coding' }).nth(2).click();
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.getByRole('button', { name: 'Run Code', exact: false }).click();
    await page.waitForFunction(() => /passed/.test(document.getElementById('score').textContent), null, { timeout: 60000 });
    assert.notEqual(await page.locator('#score').textContent(), '4 / 4 passed');
    const solution = files(slug, true);
    for (const [file, label] of [['index.html', 'HTML'], ['style.css', 'CSS'], ['script.js', 'JavaScript']]) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await page.locator('#editor').fill(solution[file]);
    }
    await page.reload(); await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.getByRole('tab', { name: 'JavaScript', exact: true }).click();
    assert.equal(await page.locator('#editor').inputValue(), solution['script.js'].replace(/\r\n/g, '\n'));
    await page.getByRole('button', { name: 'Run Code', exact: false }).click();
    await page.waitForFunction(() => document.getElementById('score').textContent === '4 / 4 passed', null, { timeout: 60000 });
    assert.equal(await page.locator('#results li').count(), 4);
    assert.deepEqual(files(slug), starter);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const example of ['02-style-the-profile-card', '18-fetch-and-render', '19-persistent-todo']) {
      const result = await (await post('/api/run', { slug: example, files: files(example, true) })).json();
      assert.ok(result.total > 0, JSON.stringify(result)); assert.equal(result.passed, result.total, JSON.stringify(result));
    }
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset draft' }).click();
    assert.equal(await page.locator('#editor').inputValue(), starter['script.js'].replace(/\r\n/g, '\n'));
    await page.locator('#editor').fill('// My saved draft');
    await page.getByRole('tab', { name: 'Solution', exact: true }).click();
    assert.equal(await page.locator('#solution-panel').isVisible(), true);
    assert.equal(await page.getByLabel('JavaScript reference code', { exact: true }).textContent(), solution['script.js']);
    assert.equal(await page.locator('#editor').inputValue(), '// My saved draft');
    assert.equal(await page.locator('#problem-panel').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('tab', { name: 'Solution', exact: true }).press('ArrowLeft');
    assert.equal(await page.locator('#problem-panel').isVisible(), true);
    await page.getByRole('button', { name: 'Next question', exact: false }).click();
    await page.waitForURL('**/ide.html?exercise=04-center-it');
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    assert.equal(await page.locator('#question-number').textContent(), 'Question 4 / 20');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.getByRole('tab', { name: 'JavaScript', exact: true }).click();
    assert.equal(await page.locator('#editor').inputValue(), '// My saved draft');
    await page.goto(origin + '/ide.html?exercise=20-quiz');
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    assert.equal(await page.getByRole('button', { name: 'Last question' }).isDisabled(), true);
    await page.goto(origin + '/ide.html?exercise=02-style-the-profile-card');
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    await page.getByRole('tab', { name: 'Solution', exact: true }).click();
    assert.equal(await page.getByText('No reference code for this file.', { exact: true }).count(), 1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/ide.html?exercise=10-responsive-navbar');
    await page.waitForFunction(() => !document.getElementById('run').disabled);
    const navbar = files('10-responsive-navbar', true);
    for (const [file, label] of [['index.html', 'HTML'], ['style.css', 'CSS'], ['script.js', 'JavaScript']]) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await page.locator('#editor').fill(navbar[file]);
    }
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const frame = page.frameLocator('#preview');
    await frame.locator('.nav-toggle').waitFor({ state: 'attached' });
    await page.locator('#preview-device').selectOption('1280');
    await frame.locator('.nav-toggle').waitFor({ state: 'hidden' });
    assert.equal(await frame.locator('body').evaluate(() => innerWidth), 1280);
    await frame.locator('body').evaluate(() => { window.previewState = 'preserved'; });
    await page.locator('#preview-device').selectOption('390');
    await frame.locator('.nav-toggle').waitFor({ state: 'visible' });
    assert.equal(await frame.locator('body').evaluate(() => innerWidth), 390);
    await frame.locator('.nav-toggle').click();
    await frame.locator('.nav-links').waitFor({ state: 'visible' });
    await page.locator('#preview-device').selectOption('768');
    await frame.locator('.nav-toggle').waitFor({ state: 'hidden' });
    assert.equal(await frame.locator('body').evaluate(() => innerWidth), 768);
    await page.getByLabel('Preview width in pixels').fill('600');
    await page.getByLabel('Preview width in pixels').press('Tab');
    await frame.locator('.nav-toggle').waitFor({ state: 'visible' });
    await page.getByLabel('Preview width in pixels').fill('601');
    await page.getByLabel('Preview width in pixels').press('Tab');
    await frame.locator('.nav-toggle').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Expand preview', exact: true }).click();
    assert.equal(await page.locator('.output').evaluate(el => el.classList.contains('expanded')), true);
    assert.equal(await frame.locator('body').evaluate(() => window.previewState), 'preserved');
    await page.locator('.output').screenshot({ path: 'test-results/responsive-preview.png' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.output').evaluate(el => el.classList.contains('expanded')), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#preview-device').selectOption('1280');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

  } finally { await browser?.close(); server.kill(); }
});
