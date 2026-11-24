/**
 * Dimensões escaladas para jogabilidade ágil e responsiva em 3ª pessoa (1 unidade = 1 metro):
 * Campo oficial compacto de 84m × 56m para que arrancadas, lançamentos e chutes de fora da área
 * tenham ritmo dinâmico sem caminhadas vazias intermináveis.
 */
export const PITCH = {
  LENGTH: 84, // Eixo Z: -42 (Gol Norte / Alvo) até +42 (Gol Sul)
  WIDTH: 56, // Eixo X: -28 até +28
  HALF_L: 42,
  HALF_W: 28,

  GOAL_WIDTH: 7.32,
  GOAL_HALF_W: 3.66,
  GOAL_HEIGHT: 2.44,
  GOAL_DEPTH: 2.35,
  POST_RADIUS: 0.075,

  PENALTY_BOX_W: 32.0,
  PENALTY_BOX_D: 14.5,
  SIX_YARD_W: 16.0,
  SIX_YARD_D: 5.0,
  PENALTY_SPOT_Z: -31.5, // Gol principal atacado na Arena fica em Z = -42

  BALL_RADIUS: 0.22,
} as const;
