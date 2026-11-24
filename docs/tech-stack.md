# Análise de Tecnologia (Gráficos, Desempenho e Escolha de Motor)

## O que define se o jogo fica bonito ou feio?

Uma dúvida muito comum é achar que a tecnologia sozinha deixa o jogo "quadradão" ou "realista". Na prática, em qualquer motor 3D moderno, o visual depende de **3 fatores**:

1. **Modelos 3D (`.glb`) com Malha Suave:** Se desenharmos bonecos com cilindros pelo código, fica feio em qualquer engine. Usando modelos humanos proporcionais com *smooth shading* (~4.000 triângulos por jogador) + animações reais capturadas (*Mixamo* / animações esportivas), o jogador parece um atleta de verdade — tanto no navegador quanto em engines instaladas.
2. **Iluminação e Sombras (PBR):** Luz solar ou de refletores projetando sombra suave dos jogadores na grama + gramado com duas faixas de corte e textura sutil + estádio com arquibancadas ao redor.
3. **Por que fica LEVE (60+ FPS em PC comum):** Jogos como EA FC pesam 100 GB porque simulam suor em 4K, física de cada fio de cabelo, deformação de tecido e 50.000 torcedores 3D individuais. No **Three Stars Soccer**, teremos 22 atletas otimizados + 1 bola + 1 estádio + torcida renderizada por *GPU Instancing* (milhares de torcedores desenhados de uma vez só pela placa de vídeo). Qualquer PC comum roda isso liso.

---

## Comparativo Honesto das Opções

### Opção 1: Stack Web 3D + Desktop (`TypeScript` + `Three.js` + `Rapier3D` + `React` + `Tauri`)
- **Como funciona:** O **Three.js** usa **WebGL2 / WebGPU** direto na sua placa de vídeo para renderizar o campo 3D, o **Rapier3D** (em WebAssembly/Rust) calcula a física rápida da bola/colisões, o **React** desenha todos os menus/contratos/tabelas, e o **Tauri** empacota tudo num `.exe` leve de Windows (~15 MB).
- **Exemplos reais de gráfico/desempenho nessa tecnologia:**
  - *Slow Roads* (`slowroads.io`) — jogo 3D com iluminação realista, vegetação e física rodando liso a 60 FPS direto no navegador com Three.js.
  - Configuradores 3D realistas da Porsche/Renault e jogos 3D de tiro como *ev.io* / *Venge*.
- **Vantagens para o Three Stars Soccer:**
  - **Menus e Dados Reais 10x melhores:** Com ~15 ligas, 2ªs divisões, milhares de jogadores e escudos reais, telas em React/CSS ficam com visual de jogo AAA moderno muito rápido.
  - **Zero download pesado agora:** Node.js v24 já está instalado neste PC; abrimos um protótipo jogável em minutos.
  - **Desenvolvimento fluido com IA:** 100% baseado em código e arquivos abertos, sem travar em editores pesados.
- **Pontos de atenção:**
  - Exige caprichar na integração de animações 3D (transição suave entre correr, chutar e passar via `AnimationMixer`) e shaders do gramado/estádio.

---

### Opção 2: Godot 4 (`GDScript` / Motor 3D Nativo)
- **Como funciona:** Engine 3D dedicada (download portátil de ~60 MB), código em GDScript (parecido com Python) e exportação direta para `.exe` nativo de Windows.
- **Exemplos reais de gráfico/desempenho:**
  - *Road to Vostok*, *Buckshot Roulette*, protótipos indie 3D estilo *Pro Soccer Online*.
- **Vantagens:**
  - Iluminação global 3D, sombras e árvore de mistura de animações (`AnimationTree`) já vêm embutidos num editor visual 3D próprio para jogos.
  - Performance nativa pura em `.exe`.
- **Pontos de atenção:**
  - Exige baixar a Godot 4 no PC e construir interfaces complexas de tabelas/contratos/bancos de dados de 400 clubes dá mais trabalho que em React.

---

### Opção 3: Unity (Referência de mercado: *Pro Soccer Online* / *Rematch*-like indies)
- *Pro Soccer Online* (referência direta da nossa câmera em 3ª pessoa) foi feito em Unity, porém o editor exige **10+ GB de instalação**, compilação lenta e muita operação manual em janelas visuais, tornando o desenvolvimento bem mais pesado que as opções 1 e 2.

---

## Status da Decisão
Aguardando confirmação final do criador (com possibilidade de rodar um **Protótipo Visual Rápido** do estádio + boneco em 3ª pessoa antes de avançar para o resto do código).
