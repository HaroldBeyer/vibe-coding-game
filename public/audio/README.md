# Áudio original — Dead District

## Trilha

`neustadt-winter.ogg` (preferido pelo browser) e `neustadt-winter.mp3` (fallback) contêm o mesmo loop instrumental original, sintetizado para o jogo.

- 180 BPM, 32 compassos, aproximadamente 42,67 segundos, estéreo 44,1 kHz.
- Duas bases distorcidas abertas no estéreo, linha de tremolo, baixo e bateria com blast beats e trecho em meio tempo.
- Centro tonal em Mi, cores menores e cromáticas. Sem vocais e sem samples/trechos de gravações de terceiros.
- É uma primeira trilha sintetizada inspirada em black metal, não uma gravação de banda.
- Fonte reproduzível: `scripts/generate-music.mjs`, com ruído de seed determinística. WAV intermediário em `tmp/audio/` (ignorado pelo Git).

Para regenerar a composição e comprimir usando ffmpeg:

```powershell
node scripts/generate-music.mjs
ffmpeg -y -i tmp/audio/neustadt-winter.wav -c:a libvorbis -q:a 5 public/audio/neustadt-winter.ogg
ffmpeg -y -i tmp/audio/neustadt-winter.wav -c:a libmp3lame -b:a 160k public/audio/neustadt-winter.mp3
```

## Efeitos

Tiro, gatilho vazio, recarga, arma pronta, coleta, passos, impacto, dano, rosnado, infecção e morte são sintetizados em Web Audio (`src/audio.ts`), sem dependências ou arquivos de samples externos.

O áudio inicia após interação no jogo ou no botão de áudio. M silencia tudo; controles separados ajustam trilha/efeitos. Pausa, morte e ocultar a página interrompem a música; o reinício não cria outra faixa/contexto sobreposto. Caudas do efeito de morte podem terminar. Volumes padrão em `config.audio`, como porcentagens 0–100.


### Combate e vozes — 2026-11-03
Pistola/fuzil usam transiente, corpo grave, mecanismo e cauda distintos. Mortes de zumbi/rastejante e gritos humanos são gerados em Web Audio (os gritos usam ruído e formantes vocais). Não são gravações de atores. `help-zira.wav` e `help-hazel.wav` contêm pedidos curtos de socorro renderizados offline com Windows SAPI, usando as vozes locais Zira/Hazel e grafia fonética para aproximar “Socorro”. Fonte: scripts/generate-voices.ps1. São vozes provisórias sintetizadas; não há serviço de TTS em runtime. Os WAVs são carregados após interação, decodificados e passam pelo mesmo volume/panorama dos efeitos. Se falharem, há fallback para grito sintetizado. Mortes têm atenuação por distância, vozes têm limite global para não se acumularem. M, sliders e pausa continuam controlando tudo.


Portas: manuseio, pancada em madeira e ruptura com estalos são sintetizados em Web Audio e usam a atenuação/panorama dos efeitos locais.


Gore: efeito molhado curto de respingo/impacto, sintetizado por ruído filtrado e tom grave em Web Audio, ligado aos mesmos eventos de sangue de tiros, mordidas e mortes.
