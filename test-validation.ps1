# PowerShell script to test email validation

Write-Host "Testing Email Validation API" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green

# Test health endpoint
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "http://localhost:3000/health" -Method GET
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Cyan
Write-Host "Response: $($response.Content)" -ForegroundColor White

# Test single email validation
Write-Host "`n2. Testing single email validation..." -ForegroundColor Yellow
$email = "test@gmail.com"
$body = @{email = $email} | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:3000/v1/validate" -Method POST -Body $body -ContentType "application/json"
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Cyan
Write-Host "Response: $($response.Content)" -ForegroundColor White

# Test bulk email validation
Write-Host "`n3. Testing bulk email validation..." -ForegroundColor Yellow
$emails = @("test@gmail.com", "invalid-email", "user@yahoo.com")
$body = @{emails = $emails} | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:3000/v1/validate/bulk" -Method POST -Body $body -ContentType "application/json"
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Cyan
$jobResponse = $response.Content | ConvertFrom-Json
Write-Host "Job ID: $($jobResponse.jobId)" -ForegroundColor White
Write-Host "Status: $($jobResponse.status)" -ForegroundColor White

# Check job status
Write-Host "`n4. Checking job status..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$response = Invoke-WebRequest -Uri "http://localhost:3000/v1/jobs/$($jobResponse.jobId)" -Method GET
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Cyan
$jobStatus = $response.Content | ConvertFrom-Json
Write-Host "Job Status: $($jobStatus.status)" -ForegroundColor White
Write-Host "Total: $($jobStatus.total), Completed: $($jobStatus.completed)" -ForegroundColor White

# Get job results
Write-Host "`n5. Getting job results..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "http://localhost:3000/v1/jobs/$($jobResponse.jobId)/results" -Method GET
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Cyan
Write-Host "Results: $($response.Content)" -ForegroundColor White

Write-Host "`nAll tests completed successfully!" -ForegroundColor Green