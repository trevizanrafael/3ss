import React, { useState } from 'react';
import {
  AnyCompetitionId,
  getCompetitionTheme,
} from '../../data/world/competitionThemes';
import { getWorldCupEditionInfo } from '../../domains/international/worldCupHostVenues';
import { useCareerStore } from '../../state/useCareerStore';

interface CompetitionBadgeProps {
  competitionId: AnyCompetitionId;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  stageSubtitle?: string;
  labelOverride?: string;
}

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
  competitionId,
  size = 'md',
  showName = true,
  stageSubtitle,
  labelOverride,
}) => {
  const [failed, setFailed] = useState(false);
  const theme = getCompetitionTheme(competitionId);
  const worldSeason = useCareerStore((s) =>
    competitionId === 'WORLD_CUP' ? s.worldSeason : null,
  );

  const dynamicLabel =
    labelOverride ??
    (competitionId === 'WORLD_CUP' && worldSeason
      ? getWorldCupEditionInfo(worldSeason.seasonYear, worldSeason.international).shortLabel
      : theme.shortLabel);

  const imgCls =
    size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div className="inline-flex items-center gap-2.5">
      {theme.logoUrl && !failed ? (
        <img
          src={theme.logoUrl}
          alt={dynamicLabel}
          className={`${imgCls} object-contain shrink-0`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="w-3 h-5 inline-block shrink-0"
          style={{ backgroundColor: theme.accentPrimary }}
        />
      )}

      {showName && (
        <div className="leading-tight">
          <span
            className="font-condensed uppercase font-extrabold tracking-wider text-sm block"
            style={{ color: theme.accentPrimary }}
          >
            {dynamicLabel}
          </span>
          {stageSubtitle && (
            <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">
              {stageSubtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
