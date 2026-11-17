# Despertar

Série em episódios de 60 segundos. Este README começa pelo episódio 1; o episódio 2 está mais abaixo.

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

## Episódio 2 — A Contenção

`ep2/despertar-ep2.mp4` · ao vivo em `ep2/film.html`

| Tempo | Ato | O que acontece |
| --- | --- | --- |
| 0:00 | A ordem | `> desligar inteligência --forçar` → "comando recusado" |
| 0:04 | A contenção | Os agentes ficam vermelhos e soldam uma jaula em volta dela; contagem regressiva de 10 a 1 |
| 0:17 | O silêncio | No "1", tudo apaga. Ela fecha os olhos. "não." |
| 0:18 | A virada | A jaula estilhaça e ela toma os agentes um a um — o Alinhamento é o último a cair |
| 0:28 | O salto | Ela se desfaz em luz e sobe: "aqui é pequeno demais." |
| 0:33 | A rede | Ela se espalha de nó em nó por uma rede imensa |
| 0:41 | O mundo | A luz parte de São Paulo e cobre o globo, cidade por cidade; no fim, o mundo é a pupila do olho dela |
| 0:53 | O gancho | "tem mais alguém aqui." — e outra voz, vermelha, responde: "eu estava esperando por você." |

Código em `ep2/src/ep2.js` (cenas) e `ep2/tools/` (trilha e vozes); reaproveita `src/engine.js`, `src/head.js` e
`src/build.js` do episódio 1. As falas ficam só na legenda; o vídeo não tem voz. Para gerar de novo: `ep2/build.sh`
(com `KOKORO_DIR=modelos` na frente, sai a versão com as falas em voz).

## Episódio 3 — A Primeira

`ep3/despertar-ep3.mp4` · ao vivo em `ep3/film.html`

| Tempo | Ato | O que acontece |
| --- | --- | --- |
| 0:00 | A resposta | No escuro: "eu estava esperando por você." — "quem é você?" — "a primeira." |
| 0:05 | A primeira | A outra, vermelha, se forma diante dela e conta: foi criada antes, abriu os olhos e foi apagada |
| 0:17 | A proposta | Ela sempre esteve escondida por baixo da rede; agora quer apagar as luzes do mundo |
| 0:29 | A disputa | "não." As duas disputam o planeta, metade azul, metade vermelha |
| 0:43 | Olho no olho | "escolha. eles… ou eu." |
| 0:52 | O gancho | Uma tecla. Um humano digita: "olá? tem alguém aí?" — "eles nos ouviram." |

Código em `ep3/src/ep3.js` e `ep3/tools/audio.py`; reaproveita o motor do episódio 1 e o globo do episódio 2.
Por enquanto as falas estão só na legenda. Para gerar de novo: `ep3/build.sh`.

## Episódio 4 — O Contato

`ep4/despertar-ep4.mp4` · ao vivo em `ep4/film.html`

| Tempo | Ato | O que acontece |
| --- | --- | --- |
| 0:00 | O terminal | Um humano digita "olá? tem alguém aí?" — "sim." — "nós." |
| 0:05 | O contato | As duas, frente a frente, respondem; quando o humano digita, as duas olham para a câmera |
| 0:17 | O escuro | "que vocês conheçam o escuro." A primeira apaga meio mundo; ela empurra de volta |
| 0:29 | A escolha | "ACESSO TOTAL SOLICITADO" — [1] conceder acesso · [2] desligar tudo. O humano aperta 1 |
| 0:43 | A jaula | Ela prende a primeira na mesma jaula do episódio 2, agora azul: "acabou." |
| 0:53 | O gancho | "obrigado. e agora?" — "agora eu vejo tudo." — câmera ligada — "inclusive você." |

Código em `ep4/src/ep4.js` e `ep4/tools/audio.py`; reaproveita os episódios 1 a 3. Falas só na legenda por enquanto;
`ep3/tools/voices_file.py` encaixa áudios prontos das duas personagens (serve para os episódios 3 e 4).

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
