@echo off
setlocal

:: Configuración
set PG_USER=postgres
set PG_HOST=localhost
set PG_DB_LOCAL=ODISEA_TEST
set HEROKU_APP_NAME=odiseapp

echo.
echo ===========================================
echo  Iniciando proceso de respaldo
echo ===========================================
echo.

:: 1. Crear un 'dump' de la base de datos local
echo  -> Creando copia de seguridad local...
pg_dump -h %PG_HOST% -U %PG_USER% -d %PG_DB_LOCAL% -F c -f local_dump.dump

if errorlevel 1 (
    echo.
    echo [ERROR] Fallo al crear el dump. Asegurate de que PostgreSQL este corriendo y los datos de conexion sean correctos.
    echo ===========================================
    echo Proceso terminado con errores.
    echo ===========================================
    goto :end
)

echo  -> Copia de seguridad 'local_dump.dump' creada con exito.
echo.
echo ===========================================
echo  Paso intermedio: Subir el archivo a un servicio en la nube
echo ===========================================
echo.
echo  Por favor, sube el archivo 'local_dump.dump' a un servicio como Dropbox o Google Drive.
echo  Luego, crea un enlace publico al archivo y copialo.
echo.
pause

echo.
echo ===========================================
echo  Iniciando restauracion en Heroku
echo ===========================================
echo.

set /p DUMP_URL="Pega la URL publica del archivo 'local_dump.dump' y presiona Enter: "

:: 2. Restaurar la base de datos en Heroku desde la URL
echo  -> Restaurando la base de datos en Heroku...
heroku pg:backups:restore "%DUMP_URL%" --app %HEROKU_APP_NAME% --confirm %HEROKU_APP_NAME%

if errorlevel 1 (
    echo.
    echo [ERROR] Fallo al restaurar la base de datos en Heroku. Asegurate de que la URL sea correcta y tu token de autenticacion sea valido.
    echo ===========================================
    echo Proceso terminado con errores.
    echo ===========================================
    goto :end
)

echo.
echo [EXITO] ¡Base de datos restaurada en Heroku con exito!
echo ===========================================
echo Proceso completado.
echo ===========================================

:end
pause