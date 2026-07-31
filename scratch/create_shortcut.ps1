$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.IO.Path]::Combine([Environment]::GetFolderPath('UserProfile'), "OneDrive", "Desktop")
if (-not (Test-Path $DesktopPath)) {
    $DesktopPath = [Environment]::GetFolderPath('Desktop')
}
$Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine($DesktopPath, "Iniciar Servidor Seminuevos.lnk"))
$Shortcut.TargetPath = "c:\Users\luism\Documents\catalogo-seminuevos\Iniciar-Servidor.bat"
$Shortcut.IconLocation = "shell32.dll, 74"
$Shortcut.Description = "Iniciar servidor del catalogo e ir a administracion"
$Shortcut.Save()
