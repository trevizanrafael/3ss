import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClubData } from '../../../data/clubs/types';
import { RivalryMatchContext } from '../../../domains/rivalry/rivalryEngine';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { NavDirection } from '../../../shared/gamepad/spatialNavigator';

interface InteractiveTravelMapProps {
  myClub: ClubData;
  opponentClub: ClubData;
  isHome: boolean;
  accentColor: string;
  rivalry?: RivalryMatchContext;
}

export function computeDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function buildCurvedRoutePoints(
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const pts: [number, number][] = [];
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];
  const ctrlLat = (from[0] + to[0]) / 2 + dLng * 0.14;
  const ctrlLng = (from[1] + to[1]) / 2 - dLat * 0.14;

  const steps = 44;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const lat = inv * inv * from[0] + 2 * inv * t * ctrlLat + t * t * to[0];
    const lng = inv * inv * from[1] + 2 * inv * t * ctrlLng + t * t * to[1];
    pts.push([lat, lng]);
  }
  return pts;
}

function makeClubPinIcon(club: ClubData, tag: string, highlightColor: string): L.DivIcon {
  const logoHtml = club.crestUrl
    ? `<img src="${club.crestUrl}" style="width:26px;height:26px;object-fit:contain;" />`
    : `<span style="font-weight:800;font-size:11px;color:#F5F5F7;">${club.shortName}</span>`;

  return L.divIcon({
    className: '',
    iconSize: [124, 56],
    iconAnchor: [62, 48],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
        <div style="background:#0B0B0D;border:2px solid ${highlightColor};padding:3px 8px;display:flex;align-items:center;gap:6px;box-shadow:0 6px 18px rgba(0,0,0,0.88);">
          ${logoHtml}
          <div style="line-height:1.05;text-align:left;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:800;letter-spacing:0.12em;color:${highlightColor};text-transform:uppercase;">${tag}</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:#F5F5F7;text-transform:uppercase;white-space:nowrap;">${club.shortName}</div>
          </div>
        </div>
        <div style="width:2px;height:8px;background:${highlightColor};"></div>
      </div>
    `,
  });
}

export const InteractiveTravelMap: React.FC<InteractiveTravelMapProps> = ({
  myClub,
  opponentClub,
  isHome,
  accentColor,
  rivalry,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'DARK' | 'SATELLITE'>('DARK');

  const originClub = myClub;
  const hostClub = isHome ? myClub : opponentClub;

  const originCoords: [number, number] = useMemo(
    () => [originClub.lat ?? -22.91, originClub.lng ?? -43.23],
    [originClub.lat, originClub.lng],
  );
  const hostCoords: [number, number] = useMemo(
    () => [hostClub.lat ?? -23.52, hostClub.lng ?? -46.67],
    [hostClub.lat, hostClub.lng],
  );
  const visitorCoords: [number, number] = useMemo(
    () => [opponentClub.lat ?? -23.52, opponentClub.lng ?? -46.67],
    [opponentClub.lat, opponentClub.lng],
  );

  const distanceKm = useMemo(
    () =>
      isHome
        ? 0
        : computeDistanceKm(originCoords[0], originCoords[1], hostCoords[0], hostCoords[1]),
    [isHome, originCoords, hostCoords],
  );

  const fitMapRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (isHome) {
      map.setView(hostCoords, mapStyle === 'SATELLITE' ? 15 : 12, { animate: true });
    } else if (distanceKm < 25) {
      map.setView(hostCoords, 11, { animate: true });
    } else {
      const bounds = L.latLngBounds([originCoords, hostCoords]);
      map.fitBounds(bounds, { padding: [54, 54], maxZoom: 11, animate: true });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
    });
    mapRef.current = map;

    if (mapStyle === 'DARK') {
      // Esri ArcGIS World Dark Gray Base + Labels (100% gratuito, sem chave de API, nativo escuro!)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '© Esri, HERE, Garmin, OpenStreetMap',
        },
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        },
      ).addTo(map);
    } else {
      // Visão de Satélite Real dos Estádios e Cidades + Nomes
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: '© Esri World Imagery',
        },
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
        },
      ).addTo(map);
    }

    if (isHome) {
      L.circleMarker(hostCoords, {
        radius: 26,
        color: accentColor,
        weight: 1.5,
        fillColor: accentColor,
        fillOpacity: 0.16,
      }).addTo(map);

      L.marker(hostCoords, {
        icon: makeClubPinIcon(hostClub, 'EM CASA • PALCO', accentColor),
      })
        .bindPopup(
          `<b>${hostClub.stadiumName ?? hostClub.name}</b><br/>${hostClub.city ?? ''} (Mandante)`,
        )
        .addTo(map);

      if (computeDistanceKm(hostCoords[0], hostCoords[1], visitorCoords[0], visitorCoords[1]) > 8) {
        const visitorArc = buildCurvedRoutePoints(visitorCoords, hostCoords);
        L.polyline(visitorArc, {
          color: '#9498A3',
          weight: 1.8,
          dashArray: '5 6',
          opacity: 0.7,
        }).addTo(map);

        L.marker(visitorCoords, {
          icon: makeClubPinIcon(opponentClub, 'VISITANTE', '#9498A3'),
        }).addTo(map);
      }

      map.setView(hostCoords, mapStyle === 'SATELLITE' ? 15 : 12);
    } else {
      const arcPoints = buildCurvedRoutePoints(originCoords, hostCoords);

      L.polyline(arcPoints, {
        color: accentColor,
        weight: 3.2,
        opacity: 0.9,
      }).addTo(map);

      L.polyline(arcPoints, {
        color: '#F5F5F7',
        weight: 1.5,
        dashArray: '6 10',
        opacity: 0.8,
      }).addTo(map);

      L.marker(originCoords, {
        icon: makeClubPinIcon(originClub, 'SAÍDA', '#9498A3'),
      })
        .bindPopup(`<b>Saída: ${originClub.name}</b><br/>${originClub.city ?? ''}`)
        .addTo(map);

      const pinColor =
        rivalry?.stadiumMood === 'HOSTIL_CONTRA' ? '#EF4444' : accentColor;
      const pinTag = rivalry
        ? rivalry.stadiumMood === 'HOSTIL_CONTRA'
          ? `CALDEIRÃO HOSTIL • ${rivalry.crowdDecibels} dB`
          : `CLÁSSICO • ${rivalry.crowdDecibels} dB`
        : 'DESTINO • JOGO';

      L.circleMarker(hostCoords, {
        radius: rivalry ? 32 : 24,
        color: pinColor,
        weight: rivalry ? 2.2 : 1.5,
        fillColor: pinColor,
        fillOpacity: rivalry ? 0.26 : 0.18,
      }).addTo(map);

      L.marker(hostCoords, {
        icon: makeClubPinIcon(hostClub, pinTag, pinColor),
      })
        .bindPopup(
          `<b>${hostClub.stadiumName ?? hostClub.name}</b><br/>${hostClub.city ?? ''} (${distanceKm} km)`,
        )
        .addTo(map);

      if (distanceKm < 25) {
        map.setView(hostCoords, 11);
      } else {
        map.fitBounds(L.latLngBounds([originCoords, hostCoords]), {
          padding: [54, 54],
          maxZoom: 11,
        });
      }
    }

    window.setTimeout(() => map.invalidateSize(), 80);

    // Suporte ao Analógico Direito (RS) para mover e D-Pad ↑/↓ para Zoom no Mapa!
    const onRsMove = (ev: Event) => {
      const { dx, dy } = (ev as CustomEvent<{ dx: number; dy: number }>).detail;
      map.panBy([dx * 12, dy * 12], { animate: false });
    };
    const onDpadZoom = (ev: Event) => {
      const dir = (ev as CustomEvent<NavDirection>).detail;
      if (dir === 'UP') map.zoomIn();
      else if (dir === 'DOWN') map.zoomOut();
    };
    window.addEventListener('gamepad-rs-move', onRsMove);
    window.addEventListener('prematch-dpad', onDpadZoom);

    return () => {
      window.removeEventListener('gamepad-rs-move', onRsMove);
      window.removeEventListener('prematch-dpad', onDpadZoom);
      map.remove();
      mapRef.current = null;
    };
  }, [
    isHome,
    mapStyle,
    originClub,
    hostClub,
    opponentClub,
    originCoords,
    hostCoords,
    visitorCoords,
    distanceKm,
    accentColor,
    rivalry,
  ]);

  return (
    <div className="console-tile flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#242730] flex items-center justify-between gap-2 shrink-0 bg-[#101216]">
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-bold truncate"
            style={{
              color:
                rivalry?.stadiumMood === 'HOSTIL_CONTRA' ? '#EF4444' : accentColor,
            }}
          >
            {rivalry
              ? `${rivalry.derbyName} • ${
                  isHome ? 'CALDEIRÃO EM CASA' : `ARENA HOSTIL (${distanceKm} KM)`
                }`
              : isHome
                ? 'ATUAÇÃO EM CASA • SEM DESLOCAMENTO'
                : distanceKm < 25
                  ? 'FORA DE CASA • CLÁSSICO REGIONAL'
                  : `VIAGEM FORA DE CASA • ${distanceKm.toLocaleString('pt-BR')} KM`}
          </div>
          <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate">
            {isHome
              ? `${hostClub.stadiumName ?? 'Estádio'} — ${hostClub.city ?? hostClub.name}`
              : `${originClub.city ?? originClub.shortName}  ➔  ${hostClub.city ?? hostClub.shortName}`}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-pad-x="true"
            data-nav-ignore="true"
            onClick={() => setMapStyle((s) => (s === 'DARK' ? 'SATELLITE' : 'DARK'))}
            className="px-2.5 py-1 bg-[#191B20] hover:bg-[#242730] border border-[#242730] inline-flex items-center gap-1.5 font-condensed uppercase font-bold text-[11px] tracking-wider text-[#C8A45D] cursor-pointer"
          >
            <GamepadBadge action="ALT_X" />
            <span>{mapStyle === 'DARK' ? 'SATÉLITE' : 'MAPA'}</span>
          </button>
          <button
            type="button"
            data-nav-ignore="true"
            onClick={fitMapRoute}
            className="px-2.5 py-1 bg-[#191B20] hover:bg-[#242730] border border-[#242730] font-condensed uppercase font-bold text-[11px] tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            ENQUADRAR
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full min-h-[220px] z-0" />

      <div className="px-4 py-2 border-t border-[#242730] bg-[#0E0F12] flex items-center justify-between text-[10px] uppercase tracking-widest text-[#9498A3] shrink-0">
        <div className="flex items-center gap-3">
          <GamepadBadge action="RS" label="MOVER" />
          <span className="inline-flex items-center gap-1 font-condensed font-bold text-xs text-[#F5F5F7]">
            <span className="px-1.5 py-0.5 bg-[#0B0B0D] border border-[#C8A45D] text-[#C8A45D] text-[10px]">
              D-PAD ↑↓
            </span>
            <span className="text-[#9498A3]">ZOOM +/-</span>
          </span>
        </div>
        <span className="truncate ml-2">{hostClub.stadiumName ?? hostClub.name}</span>
      </div>
    </div>
  );
};
