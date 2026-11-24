import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { FullSquadPlayer } from '../../../data/clubs/types';
import { loadClubFullSquad } from '../../../data/world/squadLoader';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';

interface ClubSquadInspectorProps {
  clubId: string;
  accentColor: string;
}

export const ClubSquadInspector: React.FC<ClubSquadInspectorProps> = ({
  clubId,
  accentColor,
}) => {
  const club = getClubById(clubId);
  const [squad, setSquad] = useState<FullSquadPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadClubFullSquad(clubId).then((players) => {
      if (active) {
        setSquad(players);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [clubId]);

  return (
    <div
      className="lg:col-span-4 console-tile border-t-[3px] p-5 flex flex-col min-h-0"
      style={{ borderTopColor: accentColor }}
    >
      <div className="flex items-center gap-4 pb-4 border-b border-[#242730] shrink-0">
        <ClubCrest clubId={club.id} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] leading-none truncate">
            {club.name}
          </h3>
          <div className="text-[11px] uppercase tracking-wider text-[#9498A3] mt-1 truncate">
            {club.youthAcademyName} • {club.squadAvgOvr} OVR
          </div>
          <div className="mt-1.5">
            <StarRatingBadge stars={club.reputationStars} size="sm" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#9498A3] mt-3 mb-2 shrink-0">
        <span>ELENCO COMPLETO ({squad.length})</span>
        <span>POS • IDADE • OVR</span>
      </div>

      <div
        data-rs-scroll="true"
        className="flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-0"
      >
        {loading ? (
          <div className="text-xs uppercase text-[#565A65] py-8 text-center">
            CARREGANDO ELENCO...
          </div>
        ) : (
          squad.map((p) => (
            <div
              key={p.id}
              className="bg-[#0E0F12] border border-[#242730] px-3 py-1.5 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {p.faceUrl ? (
                  <img
                    src={p.faceUrl}
                    alt={p.name}
                    className="w-7 h-7 object-cover bg-[#16181D] shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="w-7 h-7 bg-[#16181D] border border-[#242730] flex items-center justify-center font-condensed font-bold text-xs text-[#9498A3] shrink-0">
                    {p.jersey}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="font-condensed uppercase font-bold text-sm text-[#F5F5F7] truncate">
                    {p.name}
                  </div>
                  <div className="text-[10px] uppercase text-[#565A65]">
                    {p.pos} • {p.age} ANOS
                  </div>
                </div>
              </div>
              <FifaStatBadge value={p.ovr} size="sm" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
