# ==============================================================================
# Consultation de la Main Courante (PowerShell - Jour 3)
# ==============================================================================
$ErrorActionPreference = "Stop"

if (-not (Test-Path "data/main_courante.jsonl")) {
    Write-Host "[INFO] Aucun acte consigné dans data/main_courante.jsonl." -ForegroundColor Yellow
    exit 0
}

$rawLines = Get-Content "data/main_courante.jsonl"
$dict = @{}

foreach ($line in $rawLines) {
    if ($line.Trim()) {
        try {
            $obj = $line | ConvertFrom-Json
            if ($obj.acte_id) { $dict[$obj.acte_id] = $obj }
        } catch {}
    }
}

$records = $dict.Values | Sort-Object -Property ts -Descending

Write-Host "===================================================================================================" -ForegroundColor Cyan
Write-Host "   MAIN COURANTE DES ACTES DE SERVICE - FASOMATRIX (JOUR 3)" -ForegroundColor Cyan
Write-Host "===================================================================================================" -ForegroundColor Cyan

$fmt = "{0,-36} | {1,-20} | {2,-20} | {3,-15} | {4,-20}"
Write-Host ([string]::Format($fmt, "ACTE ID", "DESTINATAIRE", "ÉCHÉANCE", "STATUT", "HORODATAGE")) -ForegroundColor Yellow
Write-Host ("-" * 115) -ForegroundColor DarkGray

foreach ($r in $records) {
    $aid = if ($r.acte_id) { $r.acte_id.Substring(0, [Math]::Min(36, $r.acte_id.Length)) } else { "" }
    $dst = if ($r.destinataire) { $r.destinataire.Substring(0, [Math]::Min(20, $r.destinataire.Length)) } else { "" }
    $dl = if ($r.deadline) { $r.deadline.Substring(0, [Math]::Min(20, $r.deadline.Length)) } else { "" }
    $st = if ($r.statut) { $r.statut.Substring(0, [Math]::Min(15, $r.statut.Length)) } else { "" }
    $ts = if ($r.ts) { $r.ts.Substring(0, [Math]::Min(20, $r.ts.Length)) } else { "" }
    
    $color = "White"
    if ($st -eq "accuse" -or $st -eq "accuse_apres_escalade") { $color = "Green" }
    elseif ($st -eq "escalade") { $color = "Red" }
    elseif ($st -eq "annule") { $color = "DarkGray" }
    
    Write-Host ([string]::Format($fmt, $aid, $dst, $dl, $st, $ts)) -ForegroundColor $color
}
Write-Host "===================================================================================================" -ForegroundColor Cyan
Write-Host "Total : $($records.Count) acte(s) enregistré(s)."
