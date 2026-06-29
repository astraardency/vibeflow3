const { execSync } = require('child_process');
try {
  const output = execSync('adb -s f2433508 logcat -d -t 500').toString();
  console.log("LOGCAT length: " + output.length);
  require('fs').writeFileSync('logcat.txt', output);
} catch (e) {
  console.error("Error running adb:", e.message);
}
