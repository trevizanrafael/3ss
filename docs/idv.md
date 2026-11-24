# Manual de Identidade Visual (IDV) & UI System — Three Stars Soccer

## 1. Diretriz Central ("Anti-Site / Zero AI Slop")

A interface do **Three Stars Soccer** é um **menu nativo de videogame de esporte para PC/Console**, nunca um dashboard web corporativo:

- **Tela 100% Fixa (`100vw × 100vh`, `overflow: hidden`):** É proibido haver barra de rolagem na janela principal do jogo. Cada tela exibe apenas o essencial, respirando dentro do enquadramento fixo.
- **Geometria 100% Reta (`border-radius: 0px`):** Proibido usar cards arredondados (`rounded-xl`, `rounded-2xl`), pílulas ou sombras difusas neon. Todos os blocos são retangulares, secos, separados por linhas de `1px` e espaçamento preciso.
- **Zero Ícones Genéricos de Site:** Botões e títulos são guiados por **tipografia condensada pesada**, **números grandes**, **escudos oficiais** e as **3 Estrelas geométricas** — sem ícones decorativos de sacola, maleta ou foguinho.
- **Zero Dropdowns Nativos do Sistema (`<select>`):** Toda troca de opção usa seletores horizontais de videogame (`‹  OPÇÃO  ›`) e navegação superior com atalhos `[Q / LB]` e `[E / RB]`.

---

## 2. Paleta Oficial da Marca

| Token | Hex | Função na Interface |
| :--- | :--- | :--- |
| `--bg-canvas` | `#0B0B0D` | Preto-grafite fosco profundo (fundo base de todas as telas) |
| `--bg-panel` | `#121316` | Superfície padrão dos blocos retangulares |
| `--bg-panel-hover` | `#191B20` | Superfície em foco/hover |
| `--border-subtle` | `#23252C` | Linha divisória estrutural de `1px` |
| `--gold-primary` | `#C8A45D` | **Ouro Fosco Metálico** — assinatura das 3 Estrelas, borda ativa (`3px`) e destaques nobres |
| `--ink-primary` | `#F5F5F7` | Branco puro editorial para títulos, valores e estado invertido de seleção |
| `--ink-secondary` | `#9498A3` | Cinza técnico para rótulos secundários |
| `--ink-muted` | `#555963` | Índices numéricos (`01`, `02`), atalhos de tecla e divisores |

### Atmosfera Dinâmica do Clube
No Hub da Carreira, um véu radial ultra-sutil (`opacidade 12%–15%`) no canto superior aplica a **cor primária oficial do clube atual do jogador** (ex: azul `#010E80` na Inter de Milão, vermelho `#C52613` no Flamengo), mantendo mais de 88% da tela em grafite neutro para leitura perfeita.

### Escala Semafórica de Atributos `0–99` (Padrão Clássico FIFA 18)
Usada **exclusivamente** para leitura instantânea de notas de habilidade:
- **`80 – 99` (Elite):** `#2DBE60` (Verde Forte)
- **`65 – 79` (Bom):** `#B8C93A` (Verde-Amarelado)
- **`50 – 64` (Mediano):** `#D9822B` (Laranja)
- **`00 – 49` (Fraco):** `#C94040` (Vermelho)

---

## 3. Tipografia

- **Display / Títulos / Abas / Números Grandes:** `Barlow Condensed` (`600`, `700`, `800`), sempre em **CAIXA ALTA** nas chamadas estruturais, remetendo à família *DIN Condensed* dos menus Frostbite do *FIFA 18*.
- **Dados Tabulares & Rótulos Curtos:** `Inter` (`400`, `500`, `600`) com `font-variant-numeric: tabular-nums` para alinhamento milimétrico de tabelas e barras `0–99`.

---

## 4. Arquitetura das 5 Abas da Carreira

Navegáveis por clique, teclado (`Q` / `E`) ou controle (`LB` / `RB`):

1. **`CENTRAL`:** Apenas **3 blocos retangulares**:
   - *Bloco 01 (Semana & Confronto):* Faixa linear dos 7 dias (`SEG` a `DOM`) + Escudo Mandante vs. Visitante + Botão único de avanço/partida.
   - *Bloco 02 (Meu Pro):* Overall gigante, posição, estrelas de reputação e barras de Confiança Sub-20 / Olheiro do Profissional (ou Meta Contratual).
   - *Bloco 03 (Comunicado):* Apenas **1 mensagem direta** da comissão técnica/empresário (navegável com `‹ ›` se houver anteriores).
2. **`MEU PRO`:** Inspirada diretamente na janela de habilidades do *FIFA 18* — **6 Macro-Atributos** grandes no topo (`RIT`, `FIN`, `PAS`, `DRI`, `DEF`, `FIS`) e **6 colunas limpas** abaixo com cada atributo `0–99` colorido pela faixa de nível e indicador `▲` nos que estão em evolução.
3. **`TREINO`:** Inspirada nos **5 Slots Verticais do FIFA 18** — 5 colunas altas lado a lado. Cada slot exibe o exercício alocado (`OURO` / `PRATA` / `BRONZE`) e apenas os 2 atributos que ele desenvolve (`50%` automático ao avançar a semana ou `100%` ao executar a sessão).
4. **`ESCRITÓRIO`:** Seletor superior `‹ CONTRATO & PROPOSTAS | EMPRESÁRIO | ESTRUTURA ›` exibindo apenas uma visão limpa por vez.
5. **`TEMPORADA`:** Seletor `‹ REGIÃO ›` e `‹ LIGA ›` + Tabela enxuta à esquerda e Raio-X do Clube/Elenco à direita.
