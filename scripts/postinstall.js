import { execSync } from 'child_process';
import { platform } from 'os';

try {
  if (platform() === 'darwin') {
    console.log('Postinstall: Fetching mono-signtool for macOS...');
    execSync(
      'curl -Ls "https://github.com/dustinblackman/mono-signtool/releases/download/0.0.2/mono-signtool.tar.gz" | tar xz -C ./node_modules/electron-winstaller/vendor/',
      { stdio: 'inherit' }
    );
  }

  if (platform() === 'win32') {
    console.log('Postinstall: Rebuilding native modules for Windows...');
    execSync(
      '.\\node_modules\\.bin\\electron-rebuild.cmd -f -w runas',
      { stdio: 'inherit' }
    );
  }
} catch (err) {
  console.error('Postinstall script failed:', err);
  process.exit(1);
}
