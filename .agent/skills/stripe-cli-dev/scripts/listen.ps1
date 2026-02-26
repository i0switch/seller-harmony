param (
    [string]$TargetUrl = "http://localhost:54321/functions/v1/stripe-webhook"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  📡 Starting Stripe Webhook Listener..." -ForegroundColor Cyan
Write-Host "  Forwarding to: $TargetUrl" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# To skip TLS verification on localhost or self-signed certs:
stripe listen --forward-to $TargetUrl --skip-verify
