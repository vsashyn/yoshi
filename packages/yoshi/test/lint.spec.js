const { expect } = require('chai');
const tp = require('../../../test-helpers/test-phases');
const fx = require('../../../test-helpers/fixtures');
const { insideTeamCity } = require('../../../test-helpers/env-variables');

describe('Aggregator: Lint', () => {
  const test = tp.create();
  afterEach(() => test.teardown());

  describe('tslint', () => {
    it('should run tslint on files according to tsconfig.json', () => {
      const res = test
        .setup({
          'app/a.ts': `import '../not-in-glob/b';`,
          'not-in-glob/b.ts': 'parseInt("1")',
          'package.json': fx.packageJson(),
          'tsconfig.json': fx.tsconfig({ files: ['app/a.ts'] }),
          'tslint.json': fx.tslint({ radix: true }),
        })
        .execute('lint');

      expect(res.code).to.equal(1);
      expect(res.stdout).to.contain('radix  Missing radix parameter');
      expect(res.stderr).to.contain('tslint exited with 1 error');
    });

    it('should pass with no errors', () => {
      const res = test
        .setup({
          'app/a.ts': `import '../not-in-glob/b';`,
          'not-in-glob/b.ts': 'parseInt("1", 10)',
          'package.json': fx.packageJson(),
          'tsconfig.json': fx.tsconfig({ files: ['app/a.ts'] }),
          'tslint.json': fx.tslint({ radix: true }),
        })
        .execute('lint');

      expect(res.code).to.equal(0);
    });

    it('should pass with warnings', () => {
      const res = test
        .setup({
          'app/a.ts': `async function foo() { await 5 }`,
          'package.json': fx.packageJson(),
          'tsconfig.json': fx.tsconfig({ files: ['app/a.ts'] }),
          'tslint.json': fx.tslint({
            'await-promise': { severity: 'warning' },
          }),
        })
        .execute('lint');

      expect(res.code).to.equal(0);
      expect(res.stdout).to.contain('WARNING');
    });

    it('should fix linting errors and exit with exit code 0 if executed with --fix flag & there are only fixable errors', () => {
      const res = test
        .setup({
          'app/a.ts': `const a = "1"`,
          'package.json': fx.packageJson(),
          'tsconfig.json': fx.tsconfig(),
          'tslint.json': fx.tslint({ semicolon: [true, 'always'] }),
        })
        .execute('lint', ['--fix']);

      expect(res.code).to.equal(0);
      expect(test.content('app/a.ts')).to.equal(`const a = "1";`);
    });

    it('should support formatter flag', () => {
      const res = test
        .setup({
          'app/a.ts': `parseInt("1");`,
          'package.json': fx.packageJson(),
          'tsconfig.json': fx.tsconfig(),
          'tslint.json': fx.tslint({ radix: true }),
        })
        .execute('lint', ['--format json']);

      expect(res.code).to.equal(1);
      // endPoisition is a json only parameter
      expect(res.stdout).to.contain('endPosition');
      expect(res.stdout).to.contain('Missing radix parameter');
    });

    describe('when file paths supplied', () => {
      it('should work as expected if all files are within the files specified in tsconfig.json', () => {
        const res = test
          .setup({
            'app/a.ts': `parseInt("1");`,
            'other-dir/b.tsx': `parseInt("1");`,
            'app/dontrunonme.ts': `parseInt("1");`,
            'package.json': fx.packageJson(),
            'tsconfig.json': fx.tsconfig({
              include: ['app/a.ts', 'other-dir/b.tsx'],
            }),
            'tslint.json': fx.tslint({ radix: true }),
          })
          .execute('lint', ['app/a.ts', 'other-dir/b.tsx'], insideTeamCity);

        expect(res.code).to.equal(1);
        expect(res.stdout).to.contain('app/a.ts:1:1');
        expect(res.stdout).to.contain('Missing radix parameter');
        expect(res.stdout).to.contain('other-dir/b.tsx:1:1');
        expect(res.stderr).to.contain('tslint exited with 2 errors');
        expect(res.stdout).to.not.contain('app/dontrunonme.ts');
      });

      it('should log a warning if there are some files which are not specified in tsconfig.json', () => {
        const res = test
          .setup({
            'app/a.ts': `console.log();`,
            'other-dir/b.tsx': `parseInt("1");`,
            'package.json': fx.packageJson(),
            'tsconfig.json': fx.tsconfig({ include: ['app/a.ts'] }),
            'tslint.json': fx.tslint({ radix: true }),
          })
          .execute('lint', ['app/a.ts', 'other-dir/b.tsx'], insideTeamCity);

        expect(res.code).to.equal(0);
        expect(res.stderr).to.contain(
          '● Warning: The following files were supplied to "yoshi lint" as a pattern',
        );
      });
    });
  });

  describe('eslint', () => {
    function setup(data) {
      return test.setup(
        Object.assign(
          {
            'package.json': fx.packageJson(),
            '.eslintrc': fx.eslintrc(),
          },
          data,
        ),
      );
    }

    it('should use eslint and pass for a valid file', () => {
      const res = setup({ 'app/a.js': `parseInt("1", 10);` }).execute(
        'lint',
        [],
        insideTeamCity,
      );
      expect(res.code).to.equal(0);
    });

    it('should log warnings to the console when there are only warnings', () => {
      const res = setup({
        'app/a.js': `/*eslint radix: 1*/\n parseInt("1");`,
      }).execute('lint', [], insideTeamCity);
      expect(res.code).to.equal(0);
      expect(res.stderr).to.contain('warning  Missing radix parameter  radix');
    });

    it('should fail with exit code 1 for an invalid file', () => {
      const res = setup({
        'app/a.js': `parseInt("1");`,
      }).execute('lint', [], insideTeamCity);
      expect(res.code).to.equal(1);
      expect(res.stderr).to.contain(
        '1:1  error  Missing radix parameter  radix',
      );
    });

    it('should output fixes in case a "fix" option is passed', () => {
      const res = setup({
        'app/a.js':
          '/*eslint no-regex-spaces: "error"*/\nnew RegExp("foo  bar");',
      }).execute('lint', ['--fix']);

      expect(res.code).to.equal(0);
      expect(test.content('app/a.js')).to.equal(
        '/*eslint no-regex-spaces: "error"*/\nnew RegExp("foo {2}bar");',
      );
    });

    it('should support formatter flag', () => {
      const res = setup({ 'app/a.js': `parseInt("1");` }).execute(
        'lint',
        ['--format json'],
        insideTeamCity,
      );
      expect(res.code).to.equal(1);
      expect(JSON.parse(res.stderr)[0].messages[0].message).to.eq(
        'Missing radix parameter.',
      );
    });

    it('should support a list of files to run lint on', () => {
      const res = setup({
        'app/a.js': `parseInt("1");`,
        'app/b.js': `parseInt("1");`,
        'app/dontrunonme.js': `parseInt("1");`,
      }).execute('lint', ['app/a.js', 'app/b.js'], insideTeamCity);

      expect(res.code).to.equal(1);
      expect(res.stderr).to.contain('app/a.js');
      expect(res.stderr).to.contain('Missing radix parameter');
      expect(res.stderr).to.contain('app/b.js');
    });
  });

  describe('stylelint', () => {
    it('does nothing when no configurations are given', () => {
      const res = test
        .setup({
          'src/some.scss': `.hello { world: #yes; }`,
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
          }),
        })
        .execute('lint');

      expect(res.code).to.equal(0);
      expect(res.stdout).not.to.contain('stylelint');
      expect(res.stderr).not.to.contain('stylelint');
    });

    it('should be able to use default config from stylelint-config-yoshi', () => {
      const res = test
        .setup({
          'src/some.scss': `.hello { world: #yes; }`,
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
            stylelint: {
              extends: 'stylelint-config-yoshi',
            },
          }),
        })
        .execute('lint');

      expect(res.code).to.equal(1);
      expect(res.stderr).to.contain('src/some.scss');
    });

    it('fixes stylesheets when --fix flag is given', () => {
      const css = `.hello { color: #000;
      }`;
      const res = test
        .setup({
          'src/some.scss': css,
          'package.json': JSON.stringify({
            name: 'a',
            version: '1.0.0',
            stylelint: {
              extends: 'stylelint-config-yoshi',
            },
          }),
        })
        .execute('lint', '--fix');

      expect(res.code).to.equal(0);
      expect(test.content('src/some.scss')).not.to.equal(css);
    });

    it('should use yoshi-stylelint', () => {
      const goodStyle = `
p {
  $color: #ff0;
  color: #ff0;
}`;
      const res = test
        .setup({
          'src/a.scss': goodStyle,
          'src/b.scss': goodStyle,
          'a.less': goodStyle,
          'package.json': `{
            "name": "a",\n
            "version": "1.0.0",\n
            "stylelint": {
              "rules": {
                "max-empty-lines": 1
              }
            }
          }`,
        })
        .execute('lint', []);

      expect(res.stdout).to.contain(`running stylelint`);
      expect(res.code).to.equal(0);
    });

    it('should fail with exit code 1', () => {
      const badStyle = `
p {
  color: #ff0;
}



`;

      const res = test
        .setup({
          'src/a.scss': badStyle,
          'src/b.scss': badStyle,
          'package.json': `{
            "name": "a",\n
            "version": "1.0.0",\n
            "stylelint": {
              "rules": {
                "max-empty-lines": 1
              }
            }
          }`,
        })
        .execute('lint', []);

      expect(res.stderr).to.contain('Expected no more than 1 empty line');
      expect(res.stderr).to.contain('max-empty-lines');
      expect(res.code).to.equal(1);
    });

    it('should support a list of files to run stylelint on', () => {
      const badStyle = `
p {
  color: #ff0;
}



`;
      const res = test
        .setup({
          'src/a.less': badStyle,
          'src/b.scss': badStyle,
          'src/dontrunonme.scss': badStyle,
          'package.json': `{
            "name": "a",\n
            "version": "1.0.0",\n
            "stylelint": {
              "rules": {
                "max-empty-lines": 1
              }
            }
          }`,
        })
        .execute('lint', ['src/a.less', 'src/b.scss']);

      expect(res.stderr).to.contain('Expected no more than 1 empty line');
      expect(res.stderr).to.contain('src/a.less');
      expect(res.stderr).to.contain('src/b.scss');
      expect(res.stderr).to.not.contain('src/dontrunonme.scss');
      expect(res.code).to.equal(1);
    });
  });

  describe('Empty state', () => {
    it('should pass out of the box if no relevant files exist', () => {
      const res = test
        .setup({
          'package.json': fx.packageJson(),
        })
        .execute('lint');

      expect(res.code).to.equal(0);
    });
  });

  describe('hooks', () => {
    describe('prelint', () => {
      it('should run a bash command before lint', () => {
        const res = test
          .setup({
            '.eslintrc': fx.eslintrc(),
            'app/a.js': `parseInt("1");`,
            'package.json': fx.packageJson({
              hooks: { prelint: 'echo "hello world" && exit 1' },
            }),
          })
          .execute('lint', [], insideTeamCity);

        expect(res.code).to.equal(1);
        expect(res.stdout).to.contain('hello world');
        expect(res.stderr).to.not.contain('Missing radix parameter');
      });
    });
  });
});
