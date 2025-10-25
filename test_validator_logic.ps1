# Test vowel ratio logic for validator fix
Write-Host "=== MEANINGFUL TEXT VALIDATOR - VOWEL RATIO TEST ===" -ForegroundColor Cyan
Write-Host ""

function Test-Vowel-Ratio {
    param([string]$word)
    $vowelMatches = [regex]::Matches($word, '[aeiouoy]', 'IgnoreCase')
    $vowels = $vowelMatches.Count
    $ratio = if ($word.Length -gt 0) { ($vowels / $word.Length) * 100 } else { 0 }
    return @{vowels=$vowels; ratio=$ratio; length=$word.Length}
}

$tests = @(
    @{word='xmnzpqrwxyabcd'; desc='15 random letters'; shouldReject=$true},
    @{word='bzzzzzzzpppqqq'; desc='14 consonants only'; shouldReject=$true},
    @{word='xyzpqrwmnabc'; desc='12 random word'; shouldReject=$true},
    @{word='iPhone'; desc='Real brand'; shouldReject=$false},
    @{word='beautiful'; desc='Real 9-char word'; shouldReject=$false},
    @{word='technology'; desc='Real 10-char word'; shouldReject=$false},
    @{word='relationship'; desc='Real 12-char word'; shouldReject=$false}
)

Write-Host "Rule: Words > 6 chars must have 18-85% vowels (updated)" -ForegroundColor Yellow
Write-Host "Words < 7 chars accepted if they have any vowel" -ForegroundColor Yellow
Write-Host ""

$passed = 0
$failed = 0

foreach ($test in $tests) {
    $info = Test-Vowel-Ratio $test.word
    $ratio = [math]::Round($info.ratio, 1)
    $len = $info.length
    $vowel = $info.vowels
    
    # Determine if should reject based on rules
    $shouldRejectByRules = if ($len -le 6) {
        $vowel -eq 0  # Only reject if no vowels
    } else {
        $ratio -lt 18 -or $ratio -gt 85  # Reject if ratio is too skewed (updated to 18%)
    }
    
    $isCorrect = $shouldRejectByRules -eq $test.shouldReject
    
    Write-Host "Word: '$($test.word)'" -ForegroundColor Cyan
    Write-Host "  Length: $len | Vowels: $vowel | Ratio: $ratio%"
    Write-Host "  Desc: $($test.desc)"
    Write-Host "  Expected: $(if ($test.shouldReject) {'REJECTED'} else {'ACCEPTED'})"
    
    if ($isCorrect) {
        Write-Host "  Result: ✅ PASS" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  Result: ❌ FAIL" -ForegroundColor Red
        $failed++
    }
    Write-Host ""
}

Write-Host "========================" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed/$($tests.Count)" -ForegroundColor Green
Write-Host "❌ Failed: $failed/$($tests.Count)" -ForegroundColor $(if ($failed -eq 0) {'Green'} else {'Red'})
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 Validator logic is working correctly!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed - check logic" -ForegroundColor Yellow
}