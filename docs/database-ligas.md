# Banco de Dados Real, Ligas e Competições

## 1. Diretriz de Dados Reais

Como projeto sem fins lucrativos focado na experiência completa de carreira, o **Three Stars Soccer** utilizará:

- **Clubes Reais:** Nomes oficiais, cores reais de uniforme e **escudos reais** (logos).
- **Elencos Reais:** Jogadores reais em cada clube (ex: elenco real da Inter de Milão, Flamengo, Boca Juniors, Real Madrid, etc.), com **nomes reais**, nacionalidade, idade, posição, tom de pele aproximado e **nível de habilidade (Overall / Atributos 0–99) condizente com a realidade**.
- **Arquitetura Modular (Data Pack):** Todos os clubes, ligas, jogadores e caminhos de escudos ficarão organizados em arquivos estruturados (`JSON` + pasta de assets de logos), facilitando atualização de elencos via scripts automatizados.

---

## 2. Competições Oficiais do Jogo

### América do Sul (CONMEBOL)
| País / Região | 1ª Divisão | 2ª Divisão | Observações |
| :--- | :--- | :--- | :--- |
| **Brasil** | Brasileirão Série A | Brasileirão Série B | Com categorias de base |
| **Argentina** | Liga Profesional | Primera Nacional (2ª Div.) | Com categorias de base |
| **Resto da América do Sul** | Principais clubes (Uruguai, Colômbia, Chile, Paraguai, Equador, Peru, Bolívia, Venezuela) | — | Pool de clubes tradicionais para preencher as copas continentais |

- **Torneios Continentais Sul-Americanos:**
  - **CONMEBOL Libertadores**
  - **CONMEBOL Sul-Americana**

---

### América do Norte (CONCACAF)
| País / Região | 1ª Divisão | 2ª Divisão | Observações |
| :--- | :--- | :--- | :--- |
| **EUA / Canadá** | **MLS (Major League Soccer)** | *Não possui (divisão única)* | Todos os clubes e escudos oficiais |

---

### Europa (UEFA)
Todas as 6 grandes ligas nacionais abaixo contam com **1ª e 2ª Divisão** (acesso e rebaixamento):

| País | 1ª Divisão | 2ª Divisão |
| :--- | :--- | :--- |
| **Inglaterra** | Premier League | EFL Championship |
| **Espanha** | La Liga | La Liga 2 |
| **Itália** | Serie A | Serie B |
| **Alemanha** | Bundesliga | 2. Bundesliga |
| **França** | Ligue 1 | Ligue 2 |
| **Portugal** | Liga Portugal (Liga NOS) | Liga Portugal 2 |
| **Resto da Europa** | Principais clubes (Holanda, Bélgica, Escócia, Turquia, Grécia, Áustria, etc.) | — |

- **Torneios Continentais Europeus:**
  - **UEFA Champions League**
  - **UEFA Europa League**

---

### Seleções Nacionais (Expansão / Topo da Carreira)
- Convocações para amistosos e **Copa do Mundo / Torneios Continentais de Seleções** conforme o jogador atinge alto Overall e reputação de 3 Estrelas.
