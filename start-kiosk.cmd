@echo off
rem RCC-HIROS fingerprint kiosk service launcher (opened by Scheduled Task at logon)
title RCC-HIROS Kiosk Service
cd /d "%~dp0kiosk-service"
"C:\Users\USER.DESKTOP-CKVMD84\AppData\Local\Programs\Python\Python312\python.exe" main.py
