# Firebase Storage CORS Setup Script
# This script automates the CORS configuration process for Firebase Storage

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Firebase Storage CORS Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "flashcard3-e9cf1"
$BUCKET_NAME = "$PROJECT_ID.firebasestorage.app"
$CORS_FILE = "cors.json"

# Check if gcloud is installed
Write-Host "Step 1: Checking Google Cloud SDK..." -ForegroundColor Yellow
$gcloudInstalled = Get-Command gcloud -ErrorAction SilentlyContinue

if (-not $gcloudInstalled) {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host "2. Or run this command in PowerShell (as Admin):" -ForegroundColor White
    Write-Host ""
    Write-Host '(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")' -ForegroundColor Gray
    Write-Host '& $env:Temp\GoogleCloudSDKInstaller.exe' -ForegroundColor Gray
    Write-Host ""
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Google Cloud SDK found!" -ForegroundColor Green
Write-Host ""

# Check if gsutil is available
Write-Host "Step 2: Checking gsutil..." -ForegroundColor Yellow
$gsutilInstalled = Get-Command gsutil -ErrorAction SilentlyContinue

if (-not $gsutilInstalled) {
    Write-Host "❌ gsutil not found!" -ForegroundColor Red
    Write-Host "Please ensure Google Cloud SDK is fully installed." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ gsutil found!" -ForegroundColor Green
Write-Host ""

# Check if cors.json exists
Write-Host "Step 3: Checking cors.json file..." -ForegroundColor Yellow
if (-not (Test-Path $CORS_FILE)) {
    Write-Host "❌ cors.json not found in current directory!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ cors.json found!" -ForegroundColor Green
Write-Host ""
Write-Host "CORS Configuration:" -ForegroundColor Cyan
Get-Content $CORS_FILE | Write-Host -ForegroundColor Gray
Write-Host ""

# Check authentication
Write-Host "Step 4: Checking authentication..." -ForegroundColor Yellow
$authCheck = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null

if (-not $authCheck) {
    Write-Host "❌ Not authenticated with Google Cloud!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Attempting to authenticate..." -ForegroundColor Yellow
    Write-Host "A browser window will open. Please sign in with your Google account." -ForegroundColor White
    Write-Host ""
    
    gcloud auth login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Authentication failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
} else {
    Write-Host "✅ Already authenticated as: $authCheck" -ForegroundColor Green
}
Write-Host ""

# Set project
Write-Host "Step 5: Setting project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to set project!" -ForegroundColor Red
    Write-Host "Please check if you have access to project: $PROJECT_ID" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available projects:" -ForegroundColor Yellow
    gcloud projects list
    exit 1
}

Write-Host "✅ Project set to: $PROJECT_ID" -ForegroundColor Green
Write-Host ""

# Apply CORS configuration
Write-Host "Step 6: Applying CORS configuration to gs://$BUCKET_NAME..." -ForegroundColor Yellow
Write-Host ""

gsutil cors set $CORS_FILE gs://$BUCKET_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to apply CORS configuration!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "  1. You don't have permission to modify this bucket" -ForegroundColor White
    Write-Host "  2. The bucket name is incorrect" -ForegroundColor White
    Write-Host "  3. The bucket doesn't exist" -ForegroundColor White
    Write-Host ""
    Write-Host "Available buckets:" -ForegroundColor Yellow
    gsutil ls
    exit 1
}

Write-Host ""
Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
Write-Host ""

# Verify CORS configuration
Write-Host "Step 7: Verifying CORS configuration..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Current CORS settings for gs://$BUCKET_NAME:" -ForegroundColor Cyan

gsutil cors get gs://$BUCKET_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to verify CORS configuration!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CORS Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait 2-3 minutes for changes to propagate" -ForegroundColor White
Write-Host "  2. Clear your browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  3. Restart your Expo dev server" -ForegroundColor White
Write-Host "  4. Test audio generation in your app" -ForegroundColor White
Write-Host ""
Write-Host "If you still see CORS errors:" -ForegroundColor Yellow
Write-Host "  - Check Firebase Storage Rules in Firebase Console" -ForegroundColor White
Write-Host "  - Try using an incognito/private browser window" -ForegroundColor White
Write-Host "  - See CORS_SETUP_GUIDE.md for troubleshooting" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

