const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Capture the last 2000 lines of logcat for Capacitor
  console.log("Running adb...");
  const output = execSync('adb -s 10.165.62.141:5555 logcat -d -t 2000').toString();
  console.log("Saving logcat...");
  fs.writeFileSync('e:/web/logcat_tv.txt', output);
  console.log("Done.");
} catch (error) {
  console.error("Error executing adb:", error);
}
