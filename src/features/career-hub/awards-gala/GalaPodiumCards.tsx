import React, { useState } from 'react';
import { getClubById } from '../../../data/clubs';
import {
  AwardNominee,
  SeasonAwardResult,
  TeamOfTheSeasonSlot,
} from '../../../domains/awards/awardTypes';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { formatMoney } from '../../../shared/utils/formatters';

interface NomineePortraitProps {
  faceUrl?: string;
  name: string;
  accent: string;
}

const NomineePortrait: React.FC<NomineePortraitProps> = ({ faceUrl, name, accent }) => {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  if (faceUrl && !failed) {
    return (
      <div
        className="w-20 h-20 bg-[#0E0F12] border flex items-end justify-center overflow-hidden shrink-0"
        style={{ borderColor: accent }}
      >
        <img
          src={faceUrl}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-20 h-20 bg-[#0E0F12] border flex items-center justify-center shrink-0 font-condensed font-extrabold text-2xl"
      style={{ borderColor: accent, color: accent }}
    >
      {initials || 'PRO'}
    </div>
  );
};

const PODIUM_META = [
  { rank: 1, label: '1º • VENCEDOR', color: '#C8A45D', orderClass: 'lg:order-2 lg:-mt-3' },
  { rank: 2, label: '2º • PRATA', color: '#9498A3', orderClass: 'lg:order-1 lg:mt-4' },
  { rank: 3, label: '3º • BRONZE', color: '#8C5E3C', orderClass: 'lg:order-3 lg:mt-6' },
];

export const GalaPodiumCards: React.FC<{ award: SeasonAwardResult }> = ({ award }) => {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242730] pb-3 shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#C8A45D] font-semibold">
            {award.subtitle}
          </div>
          <h2 className="font-condensed uppercase font-extrabold text-4xl text-[#F5F5F7] leading-none mt-1">
            {award.title}
          </h2>
        </div>

        {award.userRank === 1 ? (
          <div className="px-4 py-2 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-sm tracking-widest">
            ★ VOCÊ VENCEU ESTE PRÊMIO (+{formatMoney(award.cashReward)})
          </div>
        ) : award.userRank ? (
          <div className="px-4 py-2 bg-[#16181D] border border-[#C8A45D] text-[#C8A45D] font-condensed uppercase font-extrabold text-sm tracking-widest">
            VOCÊ FICOU NO TOP {award.userRank} DO PÓDIO!
          </div>
        ) : null}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch min-h-0 py-1">
        {award.podium.map((nominee: AwardNominee, idx: number) => {
          const meta = PODIUM_META[idx] ?? PODIUM_META[2];
          const club = getClubById(nominee.clubId);
          const isWinner = idx === 0;

          return (
            <div
              key={`${nominee.playerId}_${idx}`}
              style={{ borderTopColor: meta.color }}
              className={`console-tile border-t-[4px] p-5 flex flex-col justify-between ${meta.orderClass} ${
                nominee.isUser
                  ? 'ring-2 ring-[#C8A45D] bg-[#17181E]'
                  : isWinner
                    ? 'bg-[#14161B]'
                    : 'bg-[#111216]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#242730] pb-2.5">
                  <span
                    className="font-condensed uppercase font-extrabold text-sm tracking-[0.2em]"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  {nominee.isUser && (
                    <span className="px-2 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-[10px] tracking-widest">
                      SEU ATLETA
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <NomineePortrait
                    faceUrl={nominee.faceUrl}
                    name={nominee.playerName}
                    accent={meta.color}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] leading-tight truncate">
                      {nominee.playerName}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ClubCrest clubId={nominee.clubId} size="sm" />
                      <span className="text-xs uppercase tracking-wider text-[#9498A3] truncate">
                        {club.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <FifaStatBadge value={nominee.ovr} size="sm" />
                      <span className="text-[11px] uppercase tracking-widest text-[#9498A3]">
                        {nominee.pos} • {nominee.age} ANOS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#242730] flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#565A65]">
                    DESEMPENHO NA TEMPORADA
                  </div>
                  <div className="font-condensed uppercase font-bold text-lg text-[#F5F5F7]">
                    {nominee.statLine}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-[#565A65]">VOTOS</div>
                  <div
                    className="font-condensed font-extrabold text-2xl leading-none"
                    style={{ color: meta.color }}
                  >
                    {nominee.score}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const GalaTotsGrid: React.FC<{
  slots: TeamOfTheSeasonSlot[];
  leagueTitle: string;
  userInTots: boolean;
}> = ({ slots, leagueTitle, userInTots }) => {
  return (
    <div className="flex-1 flex flex-col justify-between gap-4 min-h-0">
      <div className="flex items-center justify-between border-b border-[#242730] pb-3 shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#C8A45D] font-semibold">
            ESCALAÇÃO IDEAL 4-3-3 • {leagueTitle}
          </div>
          <h2 className="font-condensed uppercase font-extrabold text-4xl text-[#F5F5F7] leading-none mt-1">
            SELEÇÃO DO CAMPEONATO (11 IDEAIS)
          </h2>
        </div>
        {userInTots && (
          <div className="px-4 py-2 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-sm tracking-widest">
            ★ VOCÊ ENTROU NA SELEÇÃO DO ANO!
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-center min-h-0">
        {slots.map((slot, idx) => {
          const club = getClubById(slot.clubId);
          return (
            <div
              key={`${slot.pos}_${idx}`}
              className={`console-tile p-3.5 border-l-[3px] flex items-center justify-between gap-3 ${
                slot.isUser
                  ? 'border-l-[#C8A45D] bg-[#1A1812] ring-1 ring-[#C8A45D]'
                  : 'border-l-[#323640]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <ClubCrest clubId={slot.clubId} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-condensed font-extrabold text-xs px-1.5 py-0.5 bg-[#0E0F12] text-[#C8A45D]">
                      {slot.pos}
                    </span>
                    {slot.isUser && (
                      <span className="text-[10px] font-condensed font-extrabold text-[#C8A45D] uppercase">
                        ★ VOCÊ
                      </span>
                    )}
                  </div>
                  <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate mt-0.5">
                    {slot.playerName}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-[#9498A3] truncate">
                    {club.shortName}
                  </div>
                </div>
              </div>
              <FifaStatBadge value={slot.ovr} size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
