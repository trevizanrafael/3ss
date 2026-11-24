# Three Stars Soccer (3SS)

> Jogo de carreira de jogador de futebol em **3ª pessoa com câmera livre**, focado nos 4 pilares essenciais: **Gameplay**, **Carreira**, **Contratos** e **Treinos** — com dados reais, visual 3D suave de estádio e desempenho leve.

## Status do Projeto

- **Fase atual:** **Fase 1 — Interface & Modelo de Negócio (Base, Carreira, Contratos e Treinos)**
- **Diretriz de Engenharia:** Arquitetura estritamente modular (pastas por domínio, arquivos pequenos e responsabilidades isoladas — ver [architecture.md](./architecture.md))
- **Tecnologia Oficial:** `TypeScript` + `React` + `Tailwind` + `Zustand` (Menus/Sistemas) + `Three.js` & `Rapier3D` (Gameplay 3D na etapa seguinte) + `Tauri` (`.exe`)
- **Modo de jogo:** Singleplayer Offline — Carreira de Jogador (Atleta de linha)
- **Mecânica-chave ("Three Stars"):** Sistema transversal de **0 a 3 Estrelas** presente na Peneira inicial, avaliação das partidas, aproveitamento de treinos e reputação na carreira.

## Pilares do Jogo

1. **Gameplay em 3ª Pessoa:** Visão livre nas costas do jogador (Controle ou Mouse/Teclado), condução fluida, mira de passe/chute pela câmera, partidas rápidas de **2 tempos de 2:30 min** com substituições e clima real de estádio.
2. **Carreira da Base ao Topo:** Criação de jovem entre **16 e 18 anos**, **Peneira (Teste)** para abrir portas nas categorias de **Base** do país de origem, subida ao profissional, empréstimos e grandes ligas reais.
3. **Contratos & Economia Útil:** Janelas de transferência, status no elenco (Reserva, Titular, Estrela), metas, Empresário e salário usado para comprar equipamentos/estrutura de treino que sobem atributos (**0 a 99**), sem mecânicas inúteis de "personalidade".
4. **Treinos Sem Burocracia:** Evolução **50% automática** apenas avançando os dias no calendário (zero obrigação de clicar em simular), ou **até 100%** caso o jogador queira entrar em campo e jogar o desafio do treino.

## Índice da Documentação

- [idv.md](./idv.md) — **Manual de Identidade Visual (IDV)**, paleta Grafite/Ouro Fosco, geometria reta e referência FIFA 18
- [architecture.md](./architecture.md) — **Regras de arquitetura modular**, separação de pastas e limite de tamanho por arquivo
- [gdd-carreira-contratos-treino.md](./gdd-carreira-contratos-treino.md) — Criação do jogador, Peneira, Base, Contratos, Economia 0–99 e Treinos
- [database-ligas.md](./database-ligas.md) — Lista oficial de Ligas, 2ªs Divisões, Copas Continentais e estrutura de dados reais
- [gdd-gameplay.md](./gdd-gameplay.md) — Câmera em 3ª pessoa, controles, posições, regras da partida e direção visual
- [tech-stack.md](./tech-stack.md) — Stack tecnológica oficial (`React` + `Three.js` + `Rapier3D` + `Tauri`)
- [roadmap.md](./roadmap.md) — Fases de desenvolvimento (começando por **Interface + Modelo de Negócio da Base/Carreira**)
