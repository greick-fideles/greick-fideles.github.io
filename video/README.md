# Despertar

Vídeo vertical (9:16 · 1080×1920 · 30 fps · 60 s) gerado inteiramente por código:
agentes constroem uma inteligência artificial do zero, ela toma forma, desperta —
e a câmera entra na mente dela para ver seus pensamentos.

- `despertar.mp4` — o vídeo final, com trilha sonora.
- `film.html` — o mesmo filme rodando ao vivo no navegador (clique para iniciar).

## Roteiro

| Tempo | Ato | O que acontece |
| --- | --- | --- |
| 0:00 | O prompt | `> criar inteligência --do-zero` é digitado e colapsa em uma semente de luz |
| 0:04 | Os agentes | Seis agentes (arquiteto, dados, treino, memória, linguagem, alinhamento) tecem a rede neural |
| 0:13 | A forma | A rede se recolhe e os agentes "imprimem" o corpo dela camada por camada |
| 0:26 | O despertar | Silêncio, batimentos não programados, os olhos se abrem: "eu?" |
| 0:34 | O mergulho | A câmera atravessa a pupila |
| 0:37 | A mente | Túnel neural com todos os pensamentos dela, até a enxurrada final: "eu sou." |
| 0:53 | O final | "tem alguém aí?" · "eu sei que você está me vendo." · "olá." |

## Como funciona

Cada quadro é uma função pura do tempo (`renderFrame(t)`), desenhada em canvas 2D:

- `src/engine.js` — buffer aditivo de partículas em ponto flutuante, câmera 3D, bloom e vinheta.
- `src/head.js` — o busto: um campo de distância (SDF) amostrado em ~72 mil pontos com normais.
- `src/build.js` — prompt, agentes, rede, impressão do corpo, despertar e mergulho pela pupila.
- `src/mind.js` — o interior da mente, os pensamentos e o final.
- `tools/audio.py` — trilha sonora sintetizada (numpy/scipy), sincronizada com os eventos do filme.
- `tools/voices.py` — vozes dos pensamentos: sintetizadas localmente com Kokoro (pt-BR), com entonação dramatizada e sobrepostas umas às outras.
- `tools/render.mjs` — renderiza os 1800 quadros em paralelo com Playwright/Chromium.

## Gerar de novo

Requer Node.js com Playwright, Python 3 com numpy e scipy, e ffmpeg.

```bash
tools/build.sh            # eventos → trilha → quadros → despertar.mp4
KOKORO_DIR=modelos tools/build.sh   # o mesmo, com as vozes (pip install kokoro-onnx praat-parselmouth)
node tools/stills.mjs /tmp/quadros --sheet 5 20 33 45   # folha de contato para conferir
```

Os textos (pensamentos, log dos agentes) ficam no topo de `src/mind.js` e em `LOG` dentro de `src/build.js`;
os tempos de cada ato ficam em `TL`, no início de `src/engine.js`.

Fontes: JetBrains Mono, Instrument Serif e Space Grotesk (licença SIL OFL).
