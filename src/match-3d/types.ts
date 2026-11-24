import { ClubData } from '../data/clubs/types';
import { AnyCompetitionId } from '../data/world/competitionThemes';
import { CareerPlayer } from '../domains/player/playerTypes';
import { StarRating } from '../shared/types/common';

export type ArenaSessionMode = 'FREE_PLAY' | 'TRYOUT_PRO' | 'TRAINING_SESSION';

export type CameraLockMode = 'BALL_CAM' | 'FREE_CAM';

export type KickKind =
  | 'GROUND_PASS'
  | 'THROUGH_BALL'
  | 'LOB_CROSS'
  | 'POWER_SHOT'
  | 'FINESSE_SHOT';

export interface ArenaSessionProps {
  mode: ArenaSessionMode;
  player: CareerPlayer;
  club: ClubData;
  competitionId?: AnyCompetitionId;
  onFinishSession: (earnedStars: StarRating, goalsScored: number) => void;
  onCancel?: () => void;
}

export interface ArenaHudSnapshot {
  cameraMode: CameraLockMode;
  stamina: number;
  maxStamina: number;
  powerPct: number;
  hasBall: boolean;
  goals: number;
  saves: number;
  comboPoints: number;
  attemptsDone: number;
  maxAttempts: number;
  timeRemainingSec: number;
  currentStars: StarRating;
  bannerFeedback: { text: string; color: string } | null;
}
