const { request } = require('../../utils');

describe('public folder', () => {
  it('serves static assets', async () => {
    const response = await request('http://localhost:3200/assets/hello.txt');
    expect(response).toBe('Hello from public folder!');
  });

  it('shows the contents of assets dir', async () => {
    await page.goto('http://localhost:3200/assets');

    const list = await page.$$eval('#files li a .name', nameSpans => {
      return nameSpans.map(li => li.textContent);
    });

    expect(list).toEqual(expect.arrayContaining(['hello.txt']));
  });

  it('shows the contents of static assets', async () => {
    await page.goto('http://localhost:3200');

    const list = await page.$$eval('#files li a .name', nameSpans => {
      return nameSpans.map(li => li.textContent);
    });

    expect(list).toEqual(
      expect.arrayContaining(['components', 'app.bundle.js', 'assets']),
    );
  });
});
