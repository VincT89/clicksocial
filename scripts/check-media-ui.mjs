import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkMediaUI({ page, origin, directory, images }) {
  const btn = (name, scope = page) => scope.getByRole('button', { name, exact:true });
  const visitMedia = () => page.getByRole('main').getByRole('link', { name:'Libreria media', exact:true }).click();
  await page.goto(origin + '/home');
  await page.getByRole('heading', { name:'Il tuo spazio social' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const credit = page.locator('.workspace-sidebar-brand');
  const link = page.getByRole('link', { name:'Sodano Consulting', exact:true });
  assert.equal(await link.count(), 1);
  assert.equal(await link.getAttribute('href'), 'https://sodanoconsulting.it/');
  const creditFits = () => credit.evaluate(group => {
    const mark = group.querySelector('a p span').getBoundingClientRect();
    const icon = group.querySelector('a img').getBoundingClientRect();
    const label = group.querySelector('.workspace-brand-credit span').getBoundingClientRect();
    const company = group.querySelector('.workspace-brand-credit a').getBoundingClientRect();
    return Math.abs(mark.left - label.left) < 1 && (mark.top + mark.bottom) / 2 + 4 < (icon.top + icon.bottom) / 2 &&
      mark.bottom <= label.top && label.top - mark.bottom < 14 && Math.abs((label.top + label.bottom) - (company.top + company.bottom)) < 2 &&
      label.right <= company.left && company.right <= group.closest('aside').getBoundingClientRect().right - 4;
  });
  assert.ok(await creditFits(), 'Attribuzione intera, orizzontale e sotto il marchio');
  await credit.screenshot({ path:join(directory, 'marchio-desktop.png') });
  for (const language of ['en', 'de', 'it']) {
    await page.locator('#header-language').click();
    await page.locator('[role="option"][data-option-value="' + language + '"]').click();
    assert.ok(await creditFits(), 'Attribuzione allineata nella lingua ' + language);
  }
  await visitMedia();
  await page.getByRole('heading', { name:'I tuoi media (1)' }).waitFor();
  const archive = page.getByRole('link', { name:'Post salvati', exact:true });
  assert.ok(await archive.evaluate(el => el.clientHeight >= 42 && parseFloat(getComputedStyle(el).borderTopWidth) >= 1 && getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'));
  const files = [0, 1, 2, 3, 4].map(i => ({ name:'prova-media-' + i + '.png', mimeType:'image/png', buffer:Buffer.from(i % 2 ? images.leftPhoto : images.photo, 'base64') }));
  await page.locator('.media-dropzone input').setInputFiles([...files, { name:'incompatibile.txt', mimeType:'text/plain', buffer:Buffer.from('dimostrativo') }]);
  await page.getByRole('heading', { name:'I tuoi media (6)' }).waitFor();
  await page.getByText('File caricati: 5.', { exact:true }).waitFor();
  await page.getByRole('alert').getByText('incompatibile.txt', { exact:true }).waitFor();
  assert.equal(await page.locator('.media-grid .media-tile').count(), 6);
  await btn('Grafica').click();
  await page.getByRole('heading', { name:'I tuoi media (0)' }).waitFor();
  await btn('Foto').click();
  await page.getByRole('heading', { name:'I tuoi media (6)' }).waitFor();
  await page.reload();
  await page.getByRole('heading', { name:'I tuoi media (6)' }).waitFor();
  await btn('Elenco').click();
  assert.equal(await page.locator('.media-list .media-file-details').count(), 6);
  await btn('Griglia').click();
  await btn('Apri prova-media-4.png').click();
  const preview = page.getByRole('dialog', { name:'Anteprima media' });
  await preview.waitFor();
  await btn('Media successivo', preview).click();
  await preview.getByText('prova-media-3.png', { exact:true }).waitFor();
  await btn('Chiudi', preview).click();
  await preview.waitFor({ state:'hidden' });
  assert.equal(await page.locator('.media-selected').count(), 1);
  await page.screenshot({ path:join(directory, 'libreria-media-desktop.png') });
  await btn('Anteprima iPhone').click();
  const phone = page.frameLocator('iframe[data-clicksocial-preview="iphone"]');
  await phone.getByRole('heading', { name:'I tuoi media (6)' }).waitFor();
  assert.equal(await phone.locator('.media-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 3);
  await page.getByRole('button', { name:'Ruota iPhone' }).click();
  await phone.getByRole('button', { name:'Seleziona file', exact:true }).waitFor();
  await page.locator('.cs-preview-preview-close').click();
  await page.locator('.cs-preview-preview-dialog').waitFor({ state:'hidden' });

  for (const viewport of [{ width:393, height:852 }, { width:320, height:568 }, { width:852, height:393 }]) {
    await page.setViewportSize(viewport);
    const grid = await page.locator('.media-grid').evaluate(el => ({
      columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
      width:document.documentElement.scrollWidth,
      sizes:[...el.querySelectorAll('.media-square')].map(tile => [tile.clientWidth, tile.clientHeight]),
    }));
    assert.ok(grid.width <= viewport.width);
    if (viewport.width < 500) assert.equal(grid.columns, 3);
    assert.ok(grid.sizes.every(([w,h]) => Math.abs(w-h) <= 1));
    await btn('Apri prova-media-4.png').click();
    await preview.locator('img').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.media-preview img')].some(image => image.complete && image.naturalWidth > 0));
    await btn('Chiudi', preview).click();
    await preview.waitFor({ state:'hidden' });
    if (viewport.width === 393) {
      await page.screenshot({ path:join(directory, 'libreria-media-iphone.png') });
      assert.equal(await page.getByRole('link', { name:'Sodano Consulting', exact:true }).count(), 1);
    }
  }
  await page.setViewportSize({ width:1280, height:900 });
  await archive.click();
  await page.getByRole('heading', { name:'Post salvati', exact:true }).waitFor();
  await visitMedia();
  await btn('Apri prova-media-4.png').click();
  await btn('Crea post', preview).click();
  await page.waitForURL('**/studio');
  await page.locator('#post-context').fill('Bozza temporanea da conservare');
  await page.getByRole('navigation', { name:'Sezioni dell’app' }).getByRole('link', { name:'Libreria media' }).click();
  await btn('Apri prova-media-2.png').click();
  await btn('Crea post', preview).click();
  const confirmation = page.getByRole('dialog', { name:'Sostituire la bozza aperta?' });
  await btn('Annulla', confirmation).click();
  await preview.waitFor();
  await btn('Chiudi', preview).click();
  await page.getByRole('navigation', { name:'Sezioni dell’app' }).getByRole('link', { name:'Crea post' }).click();
  assert.equal(await page.locator('#post-context').inputValue(), 'Bozza temporanea da conservare');
  await page.getByRole('navigation', { name:'Sezioni dell’app' }).getByRole('link', { name:'Libreria media' }).click();
  await btn('Apri prova-media-2.png').click();
  await btn('Crea post', preview).click();
  await btn('Sostituisci bozza', confirmation).click();
  await page.waitForURL('**/studio');
  assert.equal(await page.locator('#post-context').inputValue(), '');
}
