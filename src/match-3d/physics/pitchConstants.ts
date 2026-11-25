/**
 * Escala Oficial de Campo de Futebol 11v11 (105m × 68m FIFA Standard):
 * - Eixo Z: -52.5m (Gol Norte / Alvo atacado pelo time do usuário) até +52.5m (Gol Sul / Defendido pelo time do usuário)
 * - Eixo X: -34.0m (Lateral Esquerda) até +34.0m (Lateral Direita)
 * - Mantém as proporções calibradas de trave (9.0m × 3.05m) e bola (0.185m) aprovadas nos testes de finalização!
 */
export const PITCH = {
  LENGTH: 105,
  WIDTH: 68,
  HALF_L: 52.5,
  HALF_W: 34,

  GOAL_WIDTH: 9.0,
  GOAL_HALF_W: 4.5,
  GOAL_HEIGHT: 3.05,
  GOAL_DEPTH: 2.65,
  POST_RADIUS: 0.075,

  PENALTY_BOX_W: 40.32,
  PENALTY_BOX_D: 16.5,
  SIX_YARD_W: 18.32,
  SIX_YARD_D: 5.5,
  PENALTY_SPOT_DIST: 11.0,
  PENALTY_SPOT_Z: -41.5, // -HALF_L + 11.0

  BALL_RADIUS: 0.185,
} as const;
