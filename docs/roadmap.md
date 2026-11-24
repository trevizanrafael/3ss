# Roadmap de Desenvolvimento — Three Stars Soccer

## Fase 0 — Concepção & Documentação (Concluída)
- [x] Inicializar repositório Git e estrutura `docs/`
- [x] Entrevista de Game Design (Gameplay, Carreira, Contratos, Treinos e Ligas)
- [ ] Bater o martelo na tecnologia e validar o visual em protótipo

## Fase 1 — Protótipo Visual & Câmera 3ª Pessoa ("Prova de Fogo Gráfica")
- [ ] Estádio 3D leve com gramado listrado, iluminação, traves com rede e arquibancada
- [ ] Modelo humano 3D suave (não-poligonal/quadrado) com animações de parado, corrida, sprint, passe e chute
- [ ] Câmera livre em 3ª pessoa (Controle Gamepad + Mouse/Teclado)
- [ ] Física da bola (chute na direção da mira, curva, quique no gramado, gol)
- [ ] **Validação:** Testar visual e FPS no PC antes de construir o resto do jogo!

## Fase 2 — Partida 11x11 Jogável
- [ ] Posicionamento tático e IA dos outros 21 jogadores (companheiros + adversários + goleiros)
- [ ] Pedidos de passe (no pé / enfiada) e marcação
- [ ] Regras completas: 2 tempos de 2:30 min, intervalo, faltas/laterais/escanteios/impedimento simplificado
- [ ] Sistema de fôlego, entrada vindo do banco de reservas e substituições
- [ ] Cálculo em tempo real da nota de **0 a 3 Estrelas** na partida

## Fase 3 — Criação do Atleta, Peneira & Base
- [ ] Tela de criação (16–18 anos, nacionalidade, posição de linha, aparência básica, acessórios e camisa)
- [ ] Evento jogável da **Peneira (Teste Inicial)** valendo de 0 a 3 Estrelas
- [ ] Geração de propostas de **Categorias de Base** coerentes com o país e a nota da Peneira
- [ ] Temporada curta na Base rumo ao primeiro contrato profissional ou empréstimo

## Fase 4 — Loop de Carreira, Treinos & Economia (0–99)
- [ ] Sistema completo de atributos de **0 a 99** + cálculo de Overall por posição
- [ ] Calendário semanal com **Treino 50% automático** (sem cliques) e **100% jogável** (minigames rápidos em campo)
- [ ] Contratos (status Reserva/Titular/Estrela, salário, bônus de metas) e **Empresário**
- [ ] Loja de estrutura/equipamentos de treino com o dinheiro dos salários

## Fase 5 — Banco de Dados Real & Mundo Completo
- [ ] Pipeline de dados reais + escudos oficiais:
  - Brasileirão (A e B) + Argentina (1ª e 2ª) + Libertadores + Sul-Americana
  - MLS
  - Inglaterra, Espanha, Itália, Alemanha, França e Portugal (1ª e 2ª divisões) + Champions League + Europa League
- [ ] Simulação das ligas, tabelas, artilharia, acesso/rebaixamento e janelas de transferência entre temporadas
- [ ] Polimento de áudio (torcida reagindo no estádio, apito, batida na bola) e geração do `.exe`
