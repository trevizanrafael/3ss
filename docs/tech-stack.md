# Arquitetura e Stack Tecnológica Oficial

## Decisão Final: `Three.js` + `Rapier3D` + `React` + `TypeScript`

### Por que o Three.js venceu a Godot para este projeto?

1. **Zero necessidade de modelar ou operar editor 3D:** Na Godot, mesmo programando por linha de comando, importar esqueletos 3D, retarget de ossos e árvores de animação frequentemente exige abrir o editor visual e configurar recursos na mão. No **Three.js**, **100% do jogo é controlado por código** + modelos `.glb` prontos gratuitos (com animações humanas reais já embutidas) e geração procedural limpa para o estádio, gramado listrado, iluminação e traves.
2. **Inspeção visual direta pela IA:** Como roda direto no navegador local (`localhost`), o próprio assistente consegue abrir o jogo renderizado, tirar capturas reais do estádio/boneco, medir FPS e ajustar iluminação/materiais até ficar bonito — sem exigir trabalho manual de modelagem.
3. **Menus de Carreira e Dados Reais muito superiores:** Para gerenciar ~15 ligas (com 2ªs divisões), Libertadores, Sul-Americana, Champions, Europa League, MLS, centenas de escudos reais, elencos completos, contratos e barras de 0–99, `React` + `Tailwind CSS` entrega interfaces dignas de jogos AAA numa fração do tempo.
4. **Leveza (60+ FPS) e Executável Windows (`.exe`):** Usa WebGL2/WebGPU direto na placa de vídeo durante o desenvolvimento no navegador e empacota via **Tauri** em um `.exe` nativo super leve para Windows.

---

## Componentes da Stack

| Camada | Tecnologia | Papel no Jogo |
| :--- | :--- | :--- |
| **Linguagem** | `TypeScript` | Tipagem forte para atributos 0–99, contratos, ligas, IA e física |
| **Motor 3D** | `Three.js` | Estádio 3D, iluminação/sombras suaves, gramado, jogadores `.glb` animados e torcida via *GPU Instancing* |
| **Física** | `@dimforge/rapier3d-compat` | Física rápida em WebAssembly para bola (curva, quique, chute, rede/trave) e colisões |
| **Menus / HUD** | `React` + `Tailwind CSS` | Placar, radar, nota de 0–3 estrelas, criação do atleta, calendário, contratos e tabelas |
| **Estado & Save** | `Zustand` + `IndexedDB` / Arquivo local | Gerenciamento de estado da carreira e salvamento rápido offline |
| **Controles** | `Gamepad API` + `Pointer Lock API` | Suporte nativo a controle (Xbox/PS) e Mouse + Teclado para câmera livre em 3ª pessoa |
| **Build & Desktop** | `Vite` + `Tauri` | Abertura instantânea em dev e geração futura de `.exe` leve |

---

## Estrutura de Pastas Planejada

```text
3ss/
├── docs/                  # Documentação de Game Design e Arquitetura
├── public/
│   ├── models/            # Modelos 3D (.glb) prontos de atletas e animações
│   ├── crests/            # Escudos reais dos clubes organizados por liga
│   └── audio/             # Som de torcida, apito, chute na bola e trave
├── src/
│   ├── core/              # Loop 3D, câmera 3ª pessoa, input (Controle/Mouse) e física
│   ├── match/             # Estádio, bola, animações dos jogadores, IA 11x11 e nota 0-3 estrelas
│   ├── career/            # Lógica de calendário, peneira, base, contratos, treinos (50%/100%) e ligas
│   ├── data/              # Pacotes JSON de ligas reais, clubes e elencos (0-99)
│   └── ui/                # Telas React (Menus, Criação de Jogador, Contratos, Loja de Treino, HUD)
└── package.json
```
