param (
    [string]$EventName = "checkout.session.completed",
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\trigger.ps1 [-EventName <string>]"
    Write-Host "Example Events:"
    Write-Host "  - checkout.session.completed (default)"
    Write-Host "  - customer.created"
    Write-Host "  - payment_intent.succeeded"
    exit
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  🚀 Triggering Stripe Event: $EventName" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

stripe trigger $EventName
