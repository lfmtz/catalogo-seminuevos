@echo off
title Deteniendo Servidor
echo Deteniendo procesos de Node en ejecucion...
taskkill /f /im node.exe
echo Servidor detenido con exito.
timeout /t 3
