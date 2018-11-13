const puppeteer = require('puppeteer');
const tempy = require('tempy');
const execa = require('execa');
const chalk = require('chalk');
const waitPort = require('wait-port');
const Answers = require('../src/Answers');
const { createApp, verifyRegistry, projects } = require('../src/index');
const prompts = require('prompts');
const expect = require('expect');
const {
  publishMonorepo,
  authenticateToRegistry,
} = require('../../../scripts/utils/publishMonorepo');
const {
  killSpawnProcessAndHisChildren,
} = require('../../../test-helpers/process');

// verbose logs and output
const verbose = process.env.VERBOSE_TESTS;
// A regex pattern to run a focus test on the matched projects types
const focusProjectPattern = process.env.FOCUS_PATTERN;

verbose && console.log(`using ${chalk.yellow('VERBOSE')} mode`);

const stdio = verbose ? 'inherit' : 'pipe';

verifyRegistry();

const filteredProjects = projects.filter(
  projectType =>
    !focusProjectPattern ? true : projectType.match(focusProjectPattern),
);

focusProjectPattern &&
  console.log(
    `using the pattern ${chalk.magenta(
      focusProjectPattern,
    )} to filter projects`,
  );

console.log('Running e2e tests for the following projects:\n');
filteredProjects.forEach(type => console.log(`> ${chalk.cyan(type)}`));

const testTemplate = mockedAnswers => {
  describe(mockedAnswers.fullProjectType, () => {
    const tempDir = tempy.directory();

    // Important Notice: this test case sets up the environment
    // for the following test cases. So test case execution order is important!
    // If you nest a describe here (and the tests are run by mocha) the test cases
    // in the desctivbe block will run first!

    it('should generate project successfully', async () => {
      prompts.inject(mockedAnswers);
      verbose && console.log(chalk.cyan(tempDir));

      // This adds a `.npmrc` so dependencies are installed from local registry
      authenticateToRegistry(tempDir);

      await createApp(tempDir);
    });

    if (mockedAnswers.transpiler === 'typescript') {
      it('should not have errors on typescript strict check', () => {
        console.log('checking strict typescript...');
        execa.shellSync('./node_modules/.bin/tsc --noEmit --strict', {
          cwd: tempDir,
          stdio,
        });
      });
    }

    describe('npm test', () => {
      it(`should run npm test with no configuration warnings`, () => {
        console.log('running npm test...');
        const { stderr } = execa.shellSync('npm test', {
          cwd: tempDir,
          stdio,
        });

        expect(stderr).not.toContain('Warning: Invalid configuration object');
      });
    });

    describe('npm start', () => {
      let browser;
      let child;
      const serverPort = 3000;
      afterEach(async () => {
        await browser.close();
        return killSpawnProcessAndHisChildren(child);
      });

      it('should render a page without errors', async () => {
        const consoleMessages = [];
        child = execa.shell('npm start', {
          cwd: tempDir,
          stdio,
        });

        await waitPort({ port: serverPort, output: 'silent' });

        browser = await puppeteer.launch();
        const page = await browser.newPage();
        page.on('console', msg => consoleMessages.push(msg));
        await page.goto(`http://localhost:${serverPort}`);
        const errors = consoleMessages.filter(e => e.type() !== 'debug');

        expect(errors.map(e => e.text())).toEqual([]);
      });
    });
  });
};

describe('create-yoshi-app + yoshi e2e tests', () => {
  let cleanup;

  before(async () => {
    cleanup = await publishMonorepo();
  });

  after(() => cleanup());

  filteredProjects
    .map(
      projectType =>
        new Answers({
          projectName: `test-${projectType}`,
          authorName: 'rany',
          authorEmail: 'rany@wix.com',
          organization: 'wix',
          projectType: projectType.replace('-typescript', ''),
          transpiler: projectType.endsWith('-typescript')
            ? 'typescript'
            : 'babel',
        }),
    )
    .forEach(testTemplate);
});
