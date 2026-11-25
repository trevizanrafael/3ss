/**
 * Dimensões calibradas para jogabilidade 3D em 3ª pessoa:
 * Gol mais largo e mais alto (9.0m × 3.05m) proporcional aos atletas blocky e bola levemente menor (0.185m)
 * para abrir ângulos reais nos cantos, gavetas e cavadinhas no 1x1!
 */
export const PITCH = {
  LENGTH: 84, // Eixo Z: -42 (Gol Norte / Alvo) até +42 (Gol Sul)
  WIDTH: 56, // Eixo X: -28 até +28
  HALF_L: 42,
  HALF_W: 28,

  GOAL_WIDTH: 9.0,
  GOAL_HALF_W: 4.5,
  GOAL_HEIGHT: 3.05,
  GOAL_DEPTH: 2.65,
  POST_RADIUS: 0.075,

  PENALTY_BOX_W: 33.0,
  PENALTY_BOX_D: 15.0,
  SIX_YARD_W: 17.0,
  SIX_YARD_D: 5.2,
  PENALTY_SPOT_Z: -31.0,

  BALL_RADIUS: 0.185,
} as const;
