import { exec } from 'child_process';
import os from 'os';

console.log("Checking for ghost ytmusic_server instances...");

const isWindows = os.platform() === 'win32';
// We use ytmusic_server* to catch both ytmusic_server.exe and ytmusic_server-x86_64-pc-windows-msvc.exe
const cmd = isWindows 
  ? 'taskkill /F /IM ytmusic_server* /T 2>nul' 
  : 'pkill -f ytmusic_server';

exec(cmd, (err) => {
  // It will throw an error if no process is found, which is completely fine!
  if (!err) {
    console.log("Successfully terminated ghost ytmusic_server processes.");
  }
  process.exit(0);
});
