const { exec } = require('child_process');

exec('keytool -list -v -keystore e:\\\\web\\\\android\\\\vibeflow-release-key.jks -alias vibeflow -storepass Vibeflow@2026', (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    const lines = stdout.split('\\n');
    const sha1Line = lines.find(l => l.trim().startsWith('SHA1:'));
    console.log(sha1Line);
});
