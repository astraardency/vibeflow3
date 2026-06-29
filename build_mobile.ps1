# Install the new dependencies added to package.json
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

# Build the Vite project into the dist directory
Write-Host "Building web application..." -ForegroundColor Green
npm run build

# Add Android platform for Capacitor
Write-Host "Adding Android platform to Capacitor..." -ForegroundColor Green
npx cap add android

# Sync web assets with the native code
Write-Host "Syncing web assets to Android..." -ForegroundColor Green
npx cap sync android

Write-Host "Conversion complete! The Android project has been created in the 'android' directory." -ForegroundColor Cyan
Write-Host "To compile the APK or run it on a device, open the 'android' folder in Android Studio." -ForegroundColor Yellow
