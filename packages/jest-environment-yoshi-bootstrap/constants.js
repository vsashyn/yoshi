const childProcess = require('child_process');
const { processIsJest, getProcessIdOnPort } = require('yoshi-helpers');

const JEST_WORKER_ID = parseInt(process.env.JEST_WORKER_ID, 10);

let COUNTER = 1;

module.exports.appConfDir = `./target/configs-${process.env.JEST_WORKER_ID}`;

module.exports.getPort = () => {
  const generatedPort = 1000 + JEST_WORKER_ID * 300 + COUNTER++;

  try {
    const pid = getProcessIdOnPort(generatedPort);

    if (pid) {
      if (processIsJest(pid)) {
        // exit process if it's running by jest
        childProcess.execSync(`kill -9 ${pid}`);
      } else {
        // try to increment port if current process isn't jest
        COUNTER++;
        return module.exports.getPort();
      }
    }
  } catch (err) {
    // we don't care if we "getProcessIdOnPort" fails
  }

  return generatedPort;
};
