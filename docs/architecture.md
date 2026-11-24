# Arquitetura Modular do Projeto — Three Stars Soccer

## Regra de Ouro ("Zero Arquivos Gigantes")

Este projeto segue uma diretriz rígida de engenharia para continuar fácil de ler, dar manutenção e escalar:

1. **Uma responsabilidade = Uma pasta / Um arquivo:** Nunca misturar cálculo matemático, banco de dados estático, estado global e interface visual no mesmo arquivo.
2. **Limite saudável de tamanho:** Arquivos devem mirar em **50 a 180 linhas** (teto rígido de ~250 linhas). Se um componente ou regra crescer além disso, deve ser quebrado em submódulos na sua própria subpasta.
3. **Domínio desacoplado da Interface e do 3D:** Todas as regras de carreira, base, peneira, contratos, atributos `0–99`, treinos e simulação vivem em `src/domains/` em TypeScript puro (sem importar React nem Three.js). Assim:
   - Mexer numa fórmula de contrato ou promoção da Base leva segundos lendo um único arquivo curto.
   - A futura **Gameplay 3D (`src/match-3d/`)** se conecta ao jogo pelo mesmo contrato de resultado (`MatchOutcome`) usado pelo simulador rápido, sem refatorar a Carreira.

---

## Mapa de Diretórios (`src/`)

```text
src/
├── shared/                      # Tipos base, utilitários puros e componentes visuais atômicos
│   ├── types/                   # Tipos transversais (StarRating, PositionCode, Currency, DateState)
│   ├── utils/                   # rng.ts, formatters.ts, clamp.ts
│   └── ui/                      # Átomos de UI (Button, Panel, StarRatingBadge, StatBar, ClubCrest)
│
├── data/                        # Dados estáticos separados por assunto/país (sem JSON monolítico)
│   ├── countries/               # Nacionalidades, moedas e nomes típicos para geração de base/IA
│   ├── leagues/                 # Configuração das ligas (1ª e 2ª divisões, MLS, continentais)
│   ├── clubs/                   # Um arquivo por país/região (brazil.ts, argentina.ts, england.ts...)
│   ├── agents/                  # Catálogo de empresários contratáveis (1 a 3 estrelas)
│   └── equipment/               # Catálogo da loja de equipamentos de treino (cama elástica, academia...)
│
├── domains/                     # REGRAS DE NEGÓCIO PURAS (1 pasta por domínio, arquivos curtos)
│   ├── attributes/              # Lista de atributos 0-99, pesos por posição e cálculo de Overall
│   ├── player/                  # Fábrica de criação do jogador, idade, altura/peso e evolução
│   ├── tryout/                  # Motor da Peneira inicial e gerador de propostas de Base por país/estrelas
│   ├── youth-academy/           # Modelo de negócio da Base: bolsa, confiança, promoção ao profissional e empréstimo
│   ├── training/                # Treino 50% automático (passivo) vs. 100% jogado + bônus de equipamentos
│   ├── contracts/               # Geração de propostas, papéis no elenco, metas de bônus e renovações
│   ├── economy/                 # Saldo salarial, compra de equipamentos e contratação de empresário
│   ├── competition/             # Geração de calendário, classificação, rodadas e acesso/rebaixamento
│   └── match-sim/               # Resolução de partida (minutos jogados, reserva/titular, gols, nota 0-3 estrelas)
│
├── state/                       # Stores enxutas (Zustand) que apenas conectam `domains/` com `features/`
│   ├── useNavigationStore.ts    # Controle de tela e abas ativas
│   └── useCareerStore.ts        # Estado vivo da carreira do jogador
│
├── features/                    # INTERFACES REACT (1 pasta por tela, subcomponentes divididos)
│   ├── main-menu/               # Tela título, continuar carreira e novo save
│   ├── player-creation/         # Passo a passo de criação do atleta (16-18 anos, estilo, posição)
│   ├── tryout/                  # Tela da Peneira interativa + escolha da Categoria de Base
│   └── career-hub/              # Painel principal da carreira dividido por abas independentes:
│       ├── layout/              # Topbar do atleta, barra lateral e controle de calendário
│       ├── dashboard/           # Resumo da semana, termômetro da Base/Profissional e próximo jogo
│       ├── training/            # Escolha de foco, barras % dos atributos 0-99 e treino ativo (100%)
│       ├── contracts/           # Vínculo atual, metas, Empresário, propostas de subida/empréstimo/clubes
│       ├── equipment/           # Loja de equipamentos e estrutura pessoal de performance
│       ├── competitions/        # Tabelas das ligas, 2ªs divisões e copas com escudos reais
│       └── match-day/           # Tela de Dia de Jogo (escalação, simulação minuto a minuto e nota 0-3 estrelas)
│
└── match-3d/                    # (Fase posterior) Estádio Three.js + Física Rapier3D + Câmera 3ª Pessoa
```

---

## Convenções de Código

- **Nomes explícitos:** Se um arquivo calcula se o garoto da base merece subir ao time principal, ele se chama `src/domains/youth-academy/evaluatePromotion.ts`, não `utils2.ts` ou `helpers.ts`.
- **Barrel files controlados:** Evitar esconder lógica em `index.ts`; usar apenas para reexportar tipos/API pública limpa do domínio quando útil.
- **Dados separados de código:** Novos clubes, escudos ou equipamentos entram apenas adicionando itens em `src/data/`, sem tocar nas telas nem nos cálculos.
