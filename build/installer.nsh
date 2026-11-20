; Installeur Windows de NeoScenar : toujours installé dans le compte de l'élève (« pour moi seulement »).
; Les PC de l'école n'ont pas de droits administrateur : le choix « pour tous les utilisateurs » est masqué.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend
