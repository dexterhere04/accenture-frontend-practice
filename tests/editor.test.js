const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('editor preserves selected lines and supports independent undo/redo per file', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const initial = 'first\nsecond\nthird';
    await page.route('http://ide.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/exercise') return route.fulfill({ json: { task: '# Test task', files: { 'index.html': initial, 'style.css': 'body {}', 'script.js': '' } } });
      if (pathname === '/api/preview') return route.fulfill({ json: { url: 'about:blank' } });
      const name = pathname.slice(1);
      if (!['ide.html', 'ide.js', 'ide.css', 'dashboard.js'].includes(name)) return route.abort();
      return route.fulfill({ body: fs.readFileSync(path.join(__dirname, '..', name)), contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html' });
    });
    await page.goto('http://ide.test/ide.html?exercise=test');
    await page.waitForFunction(() => !document.getElementById('editor').disabled);
    assert.equal(await page.getByRole('button', { name: 'Navigation unavailable' }).isDisabled(), true);
    // Legacy API responses omit next/number/total, but known exercises still navigate.
    await page.goto('http://ide.test/ide.html?exercise=03-click-counter');
    await page.waitForFunction(() => !document.getElementById('editor').disabled);
    assert.equal(await page.locator('#question-number').textContent(), 'Question 3 / 20');
    await page.getByRole('button', { name: 'Next question', exact: false }).click();
    await page.waitForURL('**exercise=04-center-it');
    await page.goto('http://ide.test/ide.html?exercise=20-quiz');
    await page.waitForFunction(() => !document.getElementById('editor').disabled);
    assert.equal(await page.getByRole('button', { name: 'Last question' }).isDisabled(), true);
    await page.goto('http://ide.test/ide.html?exercise=test');
    await page.waitForFunction(() => !document.getElementById('editor').disabled);
    const editor = page.locator('#editor');
    await editor.focus();
    await editor.press('Control+a'); await editor.press('Tab');
    assert.equal(await editor.inputValue(), '  first\n  second\n  third');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), initial);
    await editor.press('Control+y'); assert.equal(await editor.inputValue(), '  first\n  second\n  third');
    await editor.press('Shift+Tab'); assert.equal(await editor.inputValue(), initial);
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), '  first\n  second\n  third');
    await editor.press('Control+Shift+z'); assert.equal(await editor.inputValue(), initial);
    // Do not indent the following line when selection ends at its first column.
    await editor.evaluate(el => el.setSelectionRange(0, 6));
    await editor.press('Tab'); assert.equal(await editor.inputValue(), '  first\nsecond\nthird');
    await editor.press('Control+z');
    await editor.press('Control+End'); await editor.press('Tab');
    assert.equal(await editor.inputValue(), initial + '  ');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), initial);
    // Native typing, deletion and replacement must also use the same history.
    await editor.press('Control+End'); await editor.press('x');
    await editor.press('Backspace'); assert.equal(await editor.inputValue(), initial);
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), initial + 'x');
    await page.getByRole('tab', { name: 'CSS', exact: true }).click();
    await editor.focus(); await editor.press('Control+End'); await editor.press('y');
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await editor.focus(); await editor.press('Control+z'); assert.equal(await editor.inputValue(), initial);
    await page.getByRole('tab', { name: 'CSS', exact: true }).click();
    await editor.focus(); await editor.press('Control+z'); assert.equal(await editor.inputValue(), 'body {}');
    await editor.press('Control+a'); await page.keyboard.insertText('replacement\ntext');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), 'body {}');
    await editor.press('Control+y'); assert.equal(await editor.inputValue(), 'replacement\ntext');
    await editor.press('Control+z'); await editor.press('Control+End'); await editor.press('!');
    await editor.press('Control+y'); assert.equal(await editor.inputValue(), 'body {}!');
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('frontend-practice:draft:test')));
    assert.equal(draft['style.css'], 'body {}!');
    await editor.press('Escape'); await editor.press('Tab');
    assert.equal(await editor.evaluate(el => el === document.activeElement), false);
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await editor.fill('<bu');
    await page.getByRole('option', { name: 'button', exact: true }).waitFor();
    await editor.press('Enter');
    assert.equal(await editor.inputValue(), '<button');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), '<bu');
    await editor.press('Control+y'); assert.equal(await editor.inputValue(), '<button');
    await page.getByRole('tab', { name: 'CSS', exact: true }).click();
    await editor.fill('dis');
    await editor.press('ArrowDown'); await editor.press('Tab');
    assert.equal(await editor.inputValue(), 'display');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), 'dis');
    await editor.press('Control+Space');
    await editor.press('Escape');
    assert.equal(await page.locator('#suggestion-popup').isHidden(), true);
    await editor.press('Tab'); assert.equal(await editor.inputValue(), 'dis  ');
    await editor.fill('dis');
    await editor.press('Control+a'); await editor.press('Tab');
    assert.equal(await editor.inputValue(), '  dis');
    await page.getByRole('tab', { name: 'JavaScript', exact: true }).click();
    await editor.fill('button.addE');
    await page.getByRole('option', { name: 'addEventListener', exact: true }).click();
    assert.equal(await editor.inputValue(), 'button.addEventListener');
    await editor.press('Control+z'); assert.equal(await editor.inputValue(), 'button.addE');
    await editor.fill('');
    await page.getByRole('button', { name: 'Suggest · Ctrl+Space', exact: true }).click();
    await page.getByRole('option', { name: 'document.querySelector', exact: true }).click();
    assert.equal(await editor.inputValue(), 'document.querySelector');
    await editor.fill('document.que');
    await page.getByRole('tab', { name: 'CSS', exact: true }).click();
    assert.equal(await page.locator('#suggestion-popup').isHidden(), true);
    await editor.fill('dis');
    const firstPopup = await page.locator('#suggestion-popup').boundingBox();
    await editor.fill('    dis');
    const indentedPopup = await page.locator('#suggestion-popup').boundingBox();
    assert.ok(indentedPopup.x > firstPopup.x + 20, 'suggestions follow the cursor column');
    await editor.fill('\n\n    dis');
    const lowerPopup = await page.locator('#suggestion-popup').boundingBox();
    assert.ok(lowerPopup.y > indentedPopup.y + 30, 'suggestions follow the cursor line');
    await editor.fill('\n'.repeat(60) + 'dis');
    await editor.press('Control+End'); await editor.press('Control+Space');
    const scrolledPopup = await page.locator('#suggestion-popup').boundingBox();
    const editorBox = await editor.boundingBox();
    assert.ok(scrolledPopup && scrolledPopup.y >= editorBox.y && scrolledPopup.y + scrolledPopup.height <= editorBox.y + editorBox.height, 'popup stays visible after scrolling');
    await page.setViewportSize({ width: 390, height: 844 });
    await editor.fill('dis');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // CSS suggestions use the current property, and insert only a value/name.
    for (const [input, value, expected] of [
      ['.box { color: re', 'red', '.box { color: red'],
      ['background-color: lightb', 'lightblue', 'background-color: lightblue'],
      ['display: fl', 'flex', 'display: flex'],
      ['position: st', 'static', 'position: static'],
      ['border: 1px so', 'solid', 'border: 1px solid'],
      ['border: 1px solid bl', 'black', 'border: 1px solid black'],
      ['padding: 12p', '12px', 'padding: 12px'],
      ['font-size: 1.5r', '1.5rem', 'font-size: 1.5rem'],
      ['transition-duration: 200m', '200ms', 'transition-duration: 200ms'],
      ['.box { color: red; justify-c', 'justify-content', '.box { color: red; justify-content'],
      ['.box { /* color: red; */ display: gr', 'grid', '.box { /* color: red; */ display: grid']
    ]) {
      await editor.fill(input);
      await page.getByRole('option', { name: value, exact: true }).click();
      assert.equal(await editor.inputValue(), expected);
      await editor.press('Control+z'); assert.equal(await editor.inputValue(), input);
    }
    await editor.fill('color: ');
    await page.getByRole('option', { name: 'red', exact: true }).waitFor();
    assert.equal(await page.getByRole('option', { name: 'display', exact: true }).count(), 0);
    for (const input of ['color: #ff', '/* color: re', 'content: "red', 'color: rgb(12']) {
      await editor.fill(input);
      assert.equal(await page.locator('#suggestion-popup').isHidden(), true);
    }
    // Syntax colors must preserve source text and never execute HTML.
    for (const [tab, source, tokenClass] of [
      ['HTML', '<button class="primary">Click</button>', 'syntax-tag'],
      ['CSS', '.box { color: #ff0000; padding: 12px; }', 'syntax-property'],
      ['JavaScript', 'const count = 42; // counter', 'syntax-keyword']
    ]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await editor.fill(source);
      assert.equal(await page.locator('#highlight').textContent(), source);
      assert.ok(await page.locator('#highlight .' + tokenClass).count() > 0);
      assert.equal(await editor.inputValue(), source);
    }
    await page.getByRole('tab', { name: 'HTML', exact: true }).click();
    await editor.fill('<img src=x onerror="window.injected=true">');
    assert.equal(await page.locator('#highlight img').count(), 0);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    for (const tab of ['HTML', 'CSS', 'JavaScript']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await editor.fill('    example;');
      await editor.press('Enter');
      assert.equal(await editor.inputValue(), '    example;\n    ');
      await editor.press('Control+z'); assert.equal(await editor.inputValue(), '    example;');
      await editor.press('Control+y'); assert.equal(await editor.inputValue(), '    example;\n    ');
    }
    await editor.fill('\t\tvalue;'); await editor.press('Enter');
    assert.equal(await editor.inputValue(), '\t\tvalue;\n\t\t');
    await editor.fill('    first; second;');
    await editor.evaluate(el => el.setSelectionRange(10, 10));
    await editor.press('Enter');
    assert.equal(await editor.inputValue(), '    first;\n     second;');
    await page.setViewportSize({ width: 1440, height: 900 });
    await editor.fill(('    const value = 123; // ' + 'long '.repeat(80) + '\n').repeat(70));
    await editor.evaluate(el => { el.scrollTop = 400; el.scrollLeft = 200; el.dispatchEvent(new Event('scroll')); });
    const scroll = await editor.evaluate(el => ({ top: el.scrollTop, left: el.scrollLeft }));
    assert.deepEqual(await page.locator('#highlight').evaluate(el => ({ top: el.scrollTop, left: el.scrollLeft })), scroll);
    await editor.fill('const button = document.querySelector("button");\n\n// Update the counter when clicked\nbutton.addEventListener("click", () => {\n  const count = 42;\n  console.log(count);\n});');
    await editor.evaluate(el => { el.scrollTop = 0; el.scrollLeft = 0; el.dispatchEvent(new Event('scroll')); });
    await page.locator('.workspace').screenshot({ path: 'test-results/editor-colors.png' });
    for (const tab of ['CSS', 'JavaScript']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await editor.fill('  .block {}');
      await editor.press('ArrowLeft');
      await editor.press('Enter');
      assert.equal(await editor.inputValue(), '  .block {\n    \n  }');
      assert.equal(await editor.evaluate(el => el.selectionStart), 15);
      await editor.press('Control+z'); assert.equal(await editor.inputValue(), '  .block {}');
      await editor.press('Control+y'); assert.equal(await editor.inputValue(), '  .block {\n    \n  }');
      await editor.fill('\tif (true) {'); await editor.press('Enter');
      assert.equal(await editor.inputValue(), '\tif (true) {\n\t\t');
    }
  } finally { await browser.close(); }
});
