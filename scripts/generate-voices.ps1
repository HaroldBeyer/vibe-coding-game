# Offline Windows SAPI render. Run with Windows PowerShell -STA.
$ErrorActionPreference = 'Stop'
$voiceRoot = if ($PSScriptRoot) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/audio')) } else { Join-Path (Get-Location) 'public/audio' }
$speaker = New-Object -ComObject SAPI.SpVoice
$voices = $speaker.GetVoices()
foreach ($variant in @(@('zira','Zira'), @('hazel','Hazel'))) {
    $voice = $null
    for ($i = 0; $i -lt $voices.Count; $i++) {
        if ($voices.Item($i).GetDescription() -match $variant[1]) { $voice = $voices.Item($i); break }
    }
    if ($null -eq $voice) { throw "Voice unavailable: $($variant[1])" }
    $speaker.Voice = $voice
    $speaker.Rate = 2
    $speaker.Volume = 100
    $stream = New-Object -ComObject SAPI.SpFileStream
    $stream.Open((Join-Path $voiceRoot ('help-' + $variant[0] + '.wav')), 3, $false)
    $speaker.AudioOutputStream = $stream
    # Phonetic spelling for the installed English voice, no online speech service.
    [void]$speaker.Speak('So coroo! So coroo!')
    $stream.Close()
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($stream)
}
[void][Runtime.InteropServices.Marshal]::ReleaseComObject($speaker)
Get-Item (Join-Path $voiceRoot 'help-*.wav') | Select-Object Name,Length
