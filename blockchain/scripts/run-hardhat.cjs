const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const home = path.join(os.tmpdir(), 'sih25007-hardhat');
const executable = process.platform === 'win32' ? 'hardhat.cmd' : 'hardhat';
const result = spawnSync(executable, process.argv.slice(2), {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    APPDATA: path.join(home, 'roaming'),
    LOCALAPPDATA: path.join(home, 'local'),
    XDG_CONFIG_HOME: path.join(home, 'config'),
    XDG_DATA_HOME: path.join(home, 'data'),
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
