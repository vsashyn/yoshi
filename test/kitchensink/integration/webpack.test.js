const { matchCSS, matchJS, initTest, request } = require('../../utils');

describe('webpack', () => {
  describe('css', () => {
    it('css inclusion', async () => {
      await initTest('css-inclusion');

      const className = await page.$eval('#css-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('css-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('global css inclusion', async () => {
      await initTest('global-css-inclusion');

      await matchCSS('global-css-inclusion', page, [
        /\.global-css-modules-inclusion\{background:#ccc;color:#000;*}/,
      ]);
    });

    it('css camelcase inclusion', async () => {
      await initTest('css-camelcase-inclusion');

      const className = await page.$eval('#css-camelcase-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('css-camelcase-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('auto-prefixer', async () => {
      await initTest('css-auto-prefixer');

      await matchCSS('css-auto-prefixer', page, [
        /-webkit-appearance:.+;-moz-appearance:.+;appearance:.+/,
      ]);
    });

    it('css url() uses relative paths', async () => {
      await initTest('css-image-url');

      await matchCSS('css-image-url', page, [
        /background-image:url\(media\/large-bart-simpson.gif.+\)/,
      ]);
    });
  });

  describe('scss', () => {
    it('scss inclusion', async () => {
      await initTest('scss-inclusion');

      const className = await page.$eval('#scss-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('scss-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('global scss inclusion', async () => {
      await initTest('global-scss-inclusion');

      await matchCSS('global-scss-inclusion', page, [
        /\.global-scss-modules-inclusion\{background:#ccc;color:#000;*}/,
      ]);
    });

    it('scss camelcase inclusion', async () => {
      await initTest('scss-camelcase-inclusion');

      const className = await page.$eval('#scss-camelcase-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('scss-camelcase-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('auto-prefixer', async () => {
      await initTest('scss-auto-prefixer');

      await matchCSS('scss-auto-prefixer', page, [
        /-webkit-appearance:.+;-moz-appearance:.+;appearance:.+/,
      ]);
    });

    it('import external scss files', async () => {
      await initTest('scss-import-external');

      const className = await page.$eval('#scss-import-external', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('scss-import-external', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('supports imports to compass', async () => {
      await initTest('scss-import-compass');

      const className = await page.$eval('#scss-import-compass', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('scss-import-compass', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });
  });

  describe('sass', () => {
    it('sass inclusion', async () => {
      await initTest('sass-inclusion');

      const className = await page.$eval('#sass-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('sass-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('global sass inclusion', async () => {
      await initTest('global-sass-inclusion');

      await matchCSS('global-sass-inclusion', page, [
        /\.global-sass-modules-inclusion\{background:#ccc;color:#000;*}/,
      ]);
    });

    it('sass camelcase inclusion', async () => {
      await initTest('sass-camelcase-inclusion');

      const className = await page.$eval('#sass-camelcase-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('sass-camelcase-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('auto-prefixer', async () => {
      await initTest('sass-auto-prefixer');

      await matchCSS('sass-auto-prefixer', page, [
        /-webkit-appearance:.+;-moz-appearance:.+;appearance:.+/,
      ]);
    });
  });

  describe('less', () => {
    it('less inclusion', async () => {
      await initTest('less-inclusion');

      const className = await page.$eval('#less-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('less-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('global less inclusion', async () => {
      await initTest('global-less-inclusion');

      await matchCSS('global-less-inclusion', page, [
        /\.global-less-modules-inclusion\{background:#ccc;color:#000;*}/,
      ]);
    });

    it('less camelcase inclusion', async () => {
      await initTest('less-camelcase-inclusion');

      const className = await page.$eval('#less-camelcase-inclusion', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('less-camelcase-inclusion', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });

    it('auto-prefixer', async () => {
      await initTest('less-auto-prefixer');

      await matchCSS('less-auto-prefixer', page, [
        /-webkit-appearance:.+;-moz-appearance:.+;appearance:.+/,
      ]);
    });

    it('import external less files', async () => {
      await initTest('less-import-external');

      const className = await page.$eval('#less-import-external', elm =>
        elm.getAttribute('class'),
      );

      await matchCSS('less-import-external', page, [
        new RegExp(`.${className}{background:#ccc;color:#000;*}`),
      ]);
    });
  });

  describe('markdown', () => {
    it('markdown inclusion', async () => {
      await initTest('markdown-inclusion');

      const innerHTML = await page.$eval(
        '#markdown-inclusion',
        elm => elm.innerHTML,
      );

      expect(innerHTML).toEqual('## Hello World');
    });
  });

  describe('graphql', () => {
    it('graphql inclusion', async () => {
      await initTest('graphql-inclusion');

      const innerHTML = await page.$eval(
        '#graphql-inclusion',
        elm => elm.innerHTML,
      );

      expect(JSON.parse(innerHTML)).toMatchObject({ kind: 'Document' });
    });
  });

  describe('images', () => {
    it('small image inclusion', async () => {
      await initTest('small-image-inclusion');

      const imageSource = await page.$eval(
        '#small-image-inclusion',
        elm => elm.src,
      );

      expect(imageSource).toMatch(/^data:image\/jpeg;base64.+==$/);
    });

    it('large image inclusion', async () => {
      await initTest('large-image-inclusion');

      const imageSource = await page.$eval(
        '#large-image-inclusion',
        elm => elm.src,
      );

      expect(imageSource).toMatch(/^.+media\/large-bart-simpson.gif.+$/);
    });

    it('inline svg inclusion', async () => {
      await initTest('inline-svg-inclusion');

      const imageSource = await page.$eval(
        '#inline-svg-inclusion',
        elm => elm.src,
      );

      expect(imageSource).toMatch(/svg/);
    });
  });

  describe('json', () => {
    it('json inclusion', async () => {
      await initTest('json-inclusion');

      const result = await page.$eval(
        '#json-inclusion',
        elm => elm.textContent,
      );

      expect(result).toBe('This is an abstract.');
    });
  });

  describe('external unprocessed modules', () => {
    it('transpiles javascript for wix-style-react', async () => {
      await initTest('transpile-default-external');

      const result = await page.$eval(
        '#transpile-default-external',
        elm => elm.textContent,
      );

      expect(result).toBe('Wix style react.');
    });

    it('transpiles javascript for configured projects', async () => {
      await initTest('transpile-configured-external');

      const result = await page.$eval(
        '#transpile-configured-external',
        elm => elm.textContent,
      );

      expect(result).toBe('External untranspiled dependency.');
    });
  });

  describe('moment', () => {
    it('exclude locales imported from moment', async () => {
      await initTest('exclude-moment');

      // should not include the `en` locale
      await matchJS('exclude-moment', page, [/^((?!hello).)*$/]);
    });

    it('include locales imported outside of moment', async () => {
      await initTest('exclude-moment');

      // should include the `de` locale
      await matchJS('exclude-moment', page, [/hallo/]);
    });
  });

  describe('public folder', () => {
    it('serves static assets', async () => {
      const response = await request('http://localhost:3200/assets/hello.txt');
      expect(response).toBe('Hello from public folder!');
    });

    it('shows the contents of static assets', async () => {
      await page.goto('http://localhost:3200');

      const list = await page.$$eval('#files li a', lis => {
        return lis.map(li => li.textContent);
      });

      expect(list).toEqual(
        expect.arrayContaining(['app.bundle.js', 'media/', 'assets/']),
      );
    });
  });

  describe('entries', () => {
    it('configures multiple entries', async () => {
      await initTest('other');

      const innerHTML = await page.$eval('#other', elm => elm.innerHTML);

      expect(innerHTML).toEqual('Other App');
    });
  });
});
