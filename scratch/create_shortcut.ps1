$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), "Administrador de Autos.lnk"))
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"c:\Users\luism\Documents\catalogo-seminuevos\Iniciar-Servidor-Silencioso.vbs`""
$Shortcut.IconLocation = "shell32.dll, 74"
$Shortcut.Description = "Iniciar servidor local de catalogo y abrir administracion"
$Shortcut.Save()
