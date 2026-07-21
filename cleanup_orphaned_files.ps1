$filesToDelete = @(
    "src/containers/HomeContainer.jsx",
    "src/containers/LibraryContainer.jsx",
    "src/containers/LiveConnectContainer.jsx",
    "src/containers/SearchContainer.jsx",
    "src/components/GenresList.jsx",
    "src/components/MusicalGalaxy.jsx",
    "src/components/MusicalGalaxy.css",
    "src/components/ProfileSettings.jsx",
    "src/components/ProfileSettings.css",
    "src/components/VibesList.jsx",
    "src/components/ArtistList.jsx",
    "src/components/ArtistList.css",
    "src/components/AllSongsList.jsx",
    "src/components/AllSongsList.css",
    "src/components/create_settings.js",
    "src/utils/playerUtils.js",
    "src/remove_play_song.js",
    "src/replace_player.cjs"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "Skipped (not found): $file" -ForegroundColor Yellow
    }
}

# Also try to remove empty container directory
if (Test-Path "src/containers") {
    $isEmpty = (Get-ChildItem "src/containers").Count -eq 0
    if ($isEmpty) {
        Remove-Item -Path "src/containers" -Force
        Write-Host "Deleted empty folder: src/containers" -ForegroundColor Green
    }
}

Write-Host "Cleanup complete." -ForegroundColor Cyan
