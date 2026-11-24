# Roadmap de Desenvolvimento — Three Stars Soccer

> **Estratégia adotada:** Construir **primeiro toda a Interface e o Modelo de Negócio (Base, Carreira, Contratos, Treinos e Ligas)** com arquitetura ultra-modular em pastas pequenas, validando o loop completo de progressão antes de plugar a Gameplay 3D de campo.

## Fase 0 — Concepção & Arquitetura (Concluída)
- [x] Inicializar repositório Git e estrutura `docs/`
- [x] Entrevista de Game Design (Carreira, Base, Contratos, Treinos, Ligas e Gameplay)
- [x] Definir arquitetura modular estrita ([architecture.md](./architecture.md)) sem arquivos gigantes

## Fase 1 — Interface & Modelo de Negócio: Criação -> Peneira -> Base -> Profissional (Em andamento)
- [ ] Estrutura base do projeto (`Vite` + `React` + `TypeScript` + `Tailwind` + `Zustand`) com pastas isoladas por domínio
- [ ] Criação do Atleta (16–18 anos, nacionalidade, posição de linha, físico, aparência/camisa e atributos iniciais `0–99`)
- [ ] Sistema da **Peneira (0 a 3 Estrelas)** gerando propostas reais de **Categorias de Base** do país escolhido (dilema clube gigante vs. clube menor)
- [ ] **Modelo de Negócio da Base (Sub-20):** bolsa-auxílio, minutos vindo do banco -> titularidade, confiança da comissão técnica e **transição ao Profissional** (promoção direta, empréstimo para ganhar rodagem ou busca via empresário)
- [ ] **Rotina Semanal & Treino Inteligente:** avanço de calendário com **50% de XP automático** (zero cliques chatos) + opção de fazer o **Treino do Dia (100% XP)**
- [ ] **Economia Funcional & Contratos:** compra de equipamentos de treino (cama elástica, academia, fisioterapia...), contratação de Empresário (1–3 estrelas), metas e janelas de transferência
- [ ] **Ligas e Clubes Reais (Base Inicial Escalável):** clubes reais com escudos, 1ª e 2ª divisões, MLS e copas continentais rodando tabelas e Dia de Jogo simulado (com nota de 0 a 3 Estrelas)

## Fase 2 — Expansão Completa do Banco de Dados de Elencos Reais
- [ ] Scripts/pacotes modulares com elencos completos reais de todos os clubes das ligas mapeadas
- [ ] Histórico detalhado de temporadas, artilharia, premiações e convocações de Seleção

## Fase 3 — Protótipo 3D de Campo (Estádio + Câmera 3ª Pessoa Livre)
- [ ] Estádio 3D leve (`Three.js`), gramado listrado, iluminação/sombras e arquibancada
- [ ] Atleta `.glb` suave em 3ª pessoa (Controle Gamepad + Mouse/Teclado) + física da bola (`Rapier3D`)
- [ ] Plugar desafios jogáveis 3D na **Peneira** e nos **Treinos de 100%**

## Fase 4 — Partida 11x11 Completa em 3D & Empacotamento `.exe`
- [ ] IA dos 21 jogadores em campo, 2 tempos de 2:30 min, substituições em tempo real e nota de 0 a 3 Estrelas ao vivo
- [ ] Plugar a partida 3D diretamente no `MatchOutcome` do Hub de Carreira
- [ ] Áudio de estádio e build final `.exe` via `Tauri`
