# ==============================================================================
# Registre des Mandats de Suppléance (PowerShell - Jour 3)
# ==============================================================================
param(
    [switch]$All
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path "data/delegations.jsonl")) {
    Write-Host "[INFO] Aucune délégation enregistrée dans data/delegations.jsonl." -ForegroundColor Yellow
    exit 0
}

$rawLines = Get-Content "data/delegations.jsonl"
$dict = @{}

foreach ($line in $rawLines) {
    if ($line.Trim()) {
        try {
            $obj = $line | ConvertFrom-Json
            if ($obj.delegation_id) { $dict[$obj.delegation_id] = $obj }
        } catch {}
    }
}

$allRecords = $dict.Values
if (-not $All) {
    $records = $allRecords | Where-Object { $_.statut -eq "active" } | Sort-Object -Property ts -Descending
} else {
    $records = $allRecords | Sort-Object -Property ts -Descending
}

Write-Host "==========================================================================================================================" -ForegroundColor Cyan
Write-Host "   REGISTRE DES MANDATS DE SUPPLÉANCE - FASOMATRIX (JOUR 3)" -ForegroundColor Cyan
Write-Host "==========================================================================================================================" -ForegroundColor Cyan

$fmt = "{0,-16} | {1,-18} | {2,-18} | {3,-14} | {4,-20} | {5,-10} | {6,-20}"
Write-Host ([string]::Format($fmt, "DÉLÉGATION ID", "DÉLÉGANT", "DÉLEGATAIRE", "SCOPE", "EXPIRATION", "STATUT", "SOUS-SALON")) -ForegroundColor Yellow
Write-Host ("-" * 122) -ForegroundColor DarkGray

foreach ($r in $records) {
    $did = if ($r.delegation_id) { $r.delegation_id.Substring(0, [Math]::Min(16, $r.delegation_id.Length)) } else { "" }
    $dlg = if ($r.delegant) { $r.delegant.Substring(0, [Math]::Min(18, $r.delegant.Length)) } else { "" }
    $dla = if ($r.delegataire) { $r.delegataire.Substring(0, [Math]::Min(18, $r.delegataire.Length)) } else { "" }
    $sc = if ($r.scope) { $r.scope.Substring(0, [Math]::Min(14, $r.scope.Length)) } else { "" }
    $exp = if ($r.expires_at) { $r.expires_at.Substring(0, [Math]::Min(20, $r.expires_at.Length)) } else { "" }
    $st = if ($r.statut) { $r.statut.Substring(0, [Math]::Min(10, $r.statut.Length)) } else { "" }
    $sub = if ($r.sub_room_id) { $r.sub_room_id.Substring(0, [Math]::Min(20, $r.sub_room_id.Length)) } else { "N/A" }

    $color = "White"
    if ($st -eq "active") { $color = "Green" }
    elseif ($st -eq "expiree") { $color = "Yellow" }
    elseif ($st -eq "revoquee") { $color = "Red" }

    Write-Host ([string]::Format($fmt, $did, $dlg, $dla, $sc, $exp, $st, $sub)) -ForegroundColor $color
}
Write-Host "==========================================================================================================================" -ForegroundColor Cyan
Write-Host "Total : $($records.Count) mandat(s) affiché(s)."
