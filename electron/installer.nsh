; Custom NSIS hooks used by electron-builder.
; Adds LAN firewall rules for mobile companion connectivity.

!macro customInit
  MessageBox MB_ICONINFORMATION|MB_OK "Installer will configure Windows Firewall for Elite Training mobile connectivity (Private network)."
!macroend

!macro customInstall
  SetDetailsPrint both
  DetailPrint "Configuring firewall access for local mobile companion..."
  ; Allow default desktop app ports on Private networks.
  ; 8765 is default Electron port, 8889 is a common override used in testing.
  ExecWait '$SYSDIR\netsh.exe advfirewall firewall add rule name="Elite Training LAN 8765" dir=in action=allow protocol=TCP localport=8765 profile=private'
  ExecWait '$SYSDIR\netsh.exe advfirewall firewall add rule name="Elite Training LAN 8889" dir=in action=allow protocol=TCP localport=8889 profile=private'
  DetailPrint "Firewall configuration complete."
!macroend

!macro customUnInstall
  SetDetailsPrint both
  DetailPrint "Removing installer-added firewall rules..."
  ; Remove installer-added rules on uninstall.
  ExecWait '$SYSDIR\netsh.exe advfirewall firewall delete rule name="Elite Training LAN 8765"'
  ExecWait '$SYSDIR\netsh.exe advfirewall firewall delete rule name="Elite Training LAN 8889"'
  DetailPrint "Firewall rule cleanup complete."
!macroend
