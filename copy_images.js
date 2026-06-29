const fs = require('fs');

try {
  fs.copyFileSync("C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\e09dd320-6290-4760-a629-ffc6b855f3a3\\mobile_app_mockup_1781613831207.png", "e:\\web\\public\\mobile_app_mockup.png");
  fs.copyFileSync("C:\\Users\\prath\\.gemini\\antigravity-ide\\brain\\e09dd320-6290-4760-a629-ffc6b855f3a3\\desktop_app_mockup_1781613859230.png", "e:\\web\\public\\desktop_app_mockup.png");
  console.log("Images copied successfully!");
} catch (e) {
  console.error("Error copying images:", e);
}
