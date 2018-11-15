const fs = require('fs');
const rimraf = require('rimraf');
const path = require('path');
const sh = require('shelljs');
const spawn = require('cross-spawn');
const stripAnsi = require('strip-ansi');

const yoshiCliBin = path.resolve(__dirname, '../packages/yoshi/bin/yoshi.js');

class Test {
  constructor(...args) {
    const script = typeof args[0] === 'string' && args[0];
    const env = typeof args[0] === 'object' ? args[0] : args[1];
    this.script = script || yoshiCliBin;
    this.env = Object.assign({}, process.env, env);
    this.child = null;
    this.stdout = '';
    this.stderr = '';
    this.tmp = path.join(
      sh.tempdir().toString(),
      new Date().getTime().toString(),
    );
    this.silent = !this.env.VERBOSE_TESTS;

    // create a symlink from node_modules one level above testing directory to yoshi's node_modules
    const tmpNodeModules = path.join(this.tmp, '../node_modules');
    const yoshiNodeModulesPath = path.resolve(
      __dirname,
      '../packages/yoshi/node_modules',
    );
    // remove current tmp/node_modules directory
    rimraf.sync(tmpNodeModules);
    // creates a symlink from tmp/node_modules to yoshi/node_modules
    fs.symlinkSync(yoshiNodeModulesPath, tmpNodeModules);
  }

  setup(tree, hooks = []) {
    const flat = flattenTree(tree);

    Object.keys(flat).forEach(file => {
      this.write(file, flat[file]);
    });

    hooks.forEach(hook => hook(this.tmp));
    return this;
  }

  spawn(command, options, environment = {}) {
    if (this.hasTmp()) {
      try {
        options = options || [];
        options = Array.isArray(options) ? options : options.split(' ');

        const env = Object.assign({}, this.env, environment);
        this.child = spawn(
          'node',
          [`${this.script}`, `${command}`].concat(options),
          {
            cwd: this.tmp,
            env,
          },
        );
        this.child.stdout.on('data', buffer => {
          if (!this.silent) {
            console.log(buffer.toString());
          }
          this.stdout += stripAnsi(buffer.toString());
        });
        this.child.stderr.on('data', buffer => {
          if (!this.silent) {
            console.log(buffer.toString());
          }
          this.stderr += stripAnsi(buffer.toString());
        });
        console.log(sh.exec('lsof | grep inotify'));
        return this.child;
      } catch (e) {
        console.log(`Error running ${this.script} ${command}: ${e}`); // TODO: Use logger?
        return null;
      }
    }
    return null;
  }

  verbose() {
    this.silent = false;
    return this;
  }

  execute(command, cliArgs = [], environment = {}, execOptions = {}) {
    const args = [command].concat(cliArgs).join(' ');
    const env = Object.assign({}, this.env, environment);
    const options = Object.assign(
      {},
      { cwd: this.tmp, env, silent: this.silent },
      execOptions,
    );

    if (this.hasTmp()) {
      const result = sh.exec(`node '${this.script}' ${args}`, options);

      return Object.assign(result, {
        stdout: stripAnsi(result.stdout),
        stderr: stripAnsi(result.stderr),
      });
    }
  }

  teardown() {
    if (this.hasTmp()) {
      if (this.child) {
        // this.child.kill('SIGKILL');
        this.child = null;
        this.stdout = '';
        this.stderr = '';
      }

      if (this.silent) {
        sh.rm('-rf', this.tmp);
      }
    }
    return this;
  }

  hasTmp() {
    return this.tmp && sh.test('-d', this.tmp);
  }

  content(file) {
    return file && sh.cat(path.join(this.tmp, file)).stdout.trim();
  }

  modify(file, arg) {
    if (!arg) {
      sh.touch(path.join(this.tmp, file));
    } else {
      const content = typeof arg === 'function' ? arg(this.content(file)) : arg;
      this.write(file, content);
    }
    return this;
  }

  write(file, content) {
    const fullPath = path.join(this.tmp, file);
    content = content.replace(/'/g, `'\\''`);
    sh.mkdir('-p', path.dirname(fullPath));
    sh.exec(`echo '${content}'`, { silent: true }).to(fullPath);
    return this;
  }

  contains(fileOrDir) {
    const args = arguments.length > 1 ? Array.from(arguments) : [fileOrDir];
    return args.reduce(
      (acc, item) => acc && !!item && sh.test('-e', path.join(this.tmp, item)),
      true,
    );
  }

  list(dir, options) {
    const loc = path.join(this.tmp, dir || '');
    const args = (options ? [options] : []).concat(loc);
    return Array.from(sh.ls.apply(sh, args));
  }
}

function flattenTree(tree, prefix) {
  let result = {};
  prefix = prefix ? prefix + path.sep : '';
  Object.keys(tree).forEach(key => {
    const value = tree[key];
    if (typeof value === 'string') {
      result[prefix + key] = value;
    } else {
      result = Object.assign(result, flattenTree(value, prefix + key));
    }
  });
  return result;
}

module.exports = {
  create: (...args) => new Test(...args),
};
