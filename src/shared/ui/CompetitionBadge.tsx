import React, { useState } from 'react';
import {
  AnyCompetitionId,
  getCompetitionTheme,
} from '../../data/world/competitionThemes';

interface CompetitionBadgeProps {
  competitionId: AnyCompetitionId;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  stageSubtitle?: string;
}

export const CompetitionBadge: React.FC<CompetitionBadgeProps> = ({
  competitionId,
  size = 'md',
  showName = true,
  stageSubtitle,
}) => {
  const [failed, setFailed] = useState(false);
  const theme = getCompetitionTheme(competitionId);

  const imgCls =
    size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <div className="inline-flex items-center gap-2.5">
      {theme.logoUrl && !failed ? (
        <img
          src={theme.logoUrl}
          alt={theme.shortLabel}
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
            {theme.shortLabel}
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
