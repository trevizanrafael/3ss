# Manual de Identidade Visual (IDV) & Sistema de Controle — Three Stars Soccer

## 1. Diretriz Central ("Broadcast Frostbite + Tematização Dinâmica estilo FIFA 23")

A interface do **Three Stars Soccer** combina a arquitetura geométrica limpa dos consoles (**FIFA 18 / FIFA 23 Frostbite**) com **Pacotes de Transmissão Dinâmicos por Campeonato**:

- **Tela 100% Fixa (`100vw × 100vh`, `overflow: hidden`):** Zero barra de rolagem na janela principal do navegador.
- **Geometria 100% Reta (`border-radius: 0px`):** Os cards estruturais (`quadrados / divs`) mantêm cantos retos secos e vidro fosco (`backdrop-filter: blur(8px)`), enquanto o fundo da arena se transforma conforme a competição ativa.
- **Atmosfera Dinâmica por Liga e Torneio (`CompetitionBackdrop.tsx`):**
  - **Bundesliga:** Base cinza-aço técnico (`#16181E`) com cortes diagonais vermelho-vivo (`#E10600`) e prata.
  - **Premier League:** Base violeta profunda (`#130920`) com prismas verde-menta elétrico (`#00FF85`) e magenta (`#FF2882`).
  - **LaLiga:** Carvão vulcânico com chevrons coral (`#FF4B44`).
  - **Serie A / Ligue 1 / Liga Portugal / MLS:** Cada liga nacional aplica suas cores, holofotes superiores, vetores e marca d'água oficial.
  - **Champions League / Libertadores / Copa do Mundo / Copa América / Euro:** Nas semanas de noite continental ou Data FIFA, os holofotes e acentos (`--comp-primary`) assumem a identidade do torneio.
- **Presença Viva do Atleta 3D (`ClubPlayer3DViewport.tsx`):**
  - O boneco Blocky-Arcade 3D veste **o uniforme oficial real do clube atual** (incluindo listras verticais, faixas horizontais, diagonal, meio-a-meio e número nas costas) tanto no **Menu Principal** quanto no card **Meu Pro da Central**.

---

## 2. Sistema de Navegação Nativa no Controle (`Gamepad & Teclado`)

Projetado para uso 100% fluido à distância no sofá sem depender de mouse:

1. **Rotas Determinísticas + Projeção Borda-a-Borda (`spatialNavigator.ts`):**
   - Os cards assimétricos principais usam rotas explícitas (`data-nav-up/down/left/right`) combinadas com cálculo de distância borda-a-borda e corredor de sobreposição, eliminando pulos diagonais indesejados.
2. **Memória de Foco por Aba (`scopeFocusMemory`):**
   - Ao trocar de aba (`LB / RB`) ou fechar um modal (`B / Esc`), o cursor retorna exatamente ao card em que o jogador estava.
3. **Foco Forte de Console + Rodapé Contextual + Micro-Áudio Sintetizado (`uiSoundEngine.ts`):**
   - Cards focados ganham elevação física, borda dupla branca + halo na cor da liga (`--comp-primary`).
   - O rodapé atualiza em tempo real a ação do botão `[A]` (`data-focus-label`).
   - Sons sutis sintetizados via Web Audio API acompanham passos no D-Pad, trocas de aba (`LB/RB`), confirmação (`A`) e retorno (`B`), com chave `SOM ON/OFF` persistida.
4. **Atalhos Diretos Sem Mirar em Botões Pequenos:**
   - `LB / RB`: Troca entre as 5 abas principais com animação horizontal rápida.
   - `LT / RT`: Passa mensagens da Caixa de Entrada na `CENTRAL` e alterna sub-abas/ligas em `MEU PRO`, `ESCRITÓRIO` e `TEMPORADA`.
   - `X / □` e `Y / △`: Ações rápidas contextuais (`Estatísticas`, `Grupos ↔ Mata-Mata`, `Sessão 100%`, `Ir para o Jogo`).
   - `RS` (Analógico Direito): Gira o boneco 3D ou rola listas longas suavemente.
