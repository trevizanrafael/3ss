import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClubData } from '../../../data/clubs/types';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { NavDirection } from '../../../shared/gamepad/spatialNavigator';

interface InteractiveTravelMapProps {
  myClub: ClubData;
  opponentClub: ClubData;
  isHome: boolean;
  accentColor: string;
  isNeutralVenue?: boolean;
  neutralVenue?: {
    stadiumName: string;
    city: string;
    countryName: string;
    lat: number;
    lng: number;
  };
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

function makeNeutralVenuePinIcon(
  stadiumName: string,
  tag: string,
  highlightColor: string,
): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [190, 56],
    iconAnchor: [95, 48],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
        <div style="background:#0B0B0D;border:2px solid ${highlightColor};padding:4px 10px;display:flex;align-items:center;gap:8px;box-shadow:0 6px 18px rgba(0,0,0,0.88);">
          <img src="/images/world-cup-trophy.png" style="width:22px;height:22px;object-fit:contain;" />
          <div style="line-height:1.08;text-align:left;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:800;letter-spacing:0.12em;color:${highlightColor};text-transform:uppercase;white-space:nowrap;">${tag}</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:#F5F5F7;text-transform:uppercase;white-space:nowrap;">${stadiumName}</div>
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
  isNeutralVenue = false,
  neutralVenue,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'DARK' | 'SATELLITE'>('DARK');

  const originClub = myClub;
  const hostClub = isHome ? myClub : opponentClub;

  const originLat = originClub.lat ?? -22.91;
  const originLng = originClub.lng ?? -43.23;
  const hostLat = neutralVenue?.lat ?? hostClub.lat ?? -23.52;
  const hostLng = neutralVenue?.lng ?? hostClub.lng ?? -46.67;
  const visitorLat = opponentClub.lat ?? -23.52;
  const visitorLng = opponentClub.lng ?? -46.67;

  const distanceKm = useMemo(
    () =>
      isHome || isNeutralVenue ? 0 : computeDistanceKm(originLat, originLng, hostLat, hostLng),
    [isHome, isNeutralVenue, originLat, originLng, hostLat, hostLng],
  );

  const fitMapRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (neutralVenue || isNeutralVenue || isHome) {
      map.setView([hostLat, hostLng], mapStyle === 'SATELLITE' ? 15 : 13, { animate: true });
    } else if (distanceKm < 25) {
      map.setView([hostLat, hostLng], 11, { animate: true });
    } else {
      const bounds = L.latLngBounds([
        [originLat, originLng],
        [hostLat, hostLng],
      ]);
      map.fitBounds(bounds, { padding: [54, 54], maxZoom: 11, animate: true });
    }
  };

  // Depende ESTRITAMENTE de valores primitivos (IDs e estilo), NUNCA pisca ao mudar postura no D-Pad!
  useEffect(() => {
    if (!containerRef.current) return;

    const maxAllowedZoom = mapStyle === 'SATELLITE' ? 18 : 16;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
      keyboard: false,
      minZoom: 2,
      maxZoom: maxAllowedZoom,
      zoomSnap: 1,
      zoomDelta: 1,
    });
    mapRef.current = map;

    if (mapStyle === 'DARK') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          minZoom: 2,
          maxZoom: 16,
          attribution: '© Esri, HERE, Garmin, OpenStreetMap',
        },
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          minZoom: 2,
          maxZoom: 16,
        },
      ).addTo(map);
    } else {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          minZoom: 2,
          maxZoom: 18,
          attribution: '© Esri World Imagery',
        },
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          minZoom: 2,
          maxZoom: 18,
        },
      ).addTo(map);
    }

    const hostCoords: [number, number] = [hostLat, hostLng];
    const originCoords: [number, number] = [originLat, originLng];
    const visitorCoords: [number, number] = [visitorLat, visitorLng];

    if (neutralVenue) {
      L.circleMarker(hostCoords, {
        radius: 28,
        color: accentColor,
        weight: 1.8,
        fillColor: accentColor,
        fillOpacity: 0.18,
      }).addTo(map);

      L.marker(hostCoords, {
        icon: makeNeutralVenuePinIcon(
          neutralVenue.stadiumName,
          `SEDE • ${neutralVenue.countryName.toUpperCase()}`,
          accentColor,
        ),
      })
        .bindPopup(
          `<b>${neutralVenue.stadiumName}</b><br/>${neutralVenue.city} — ${neutralVenue.countryName} (Campo Neutro)`,
        )
        .addTo(map);

      map.setView(hostCoords, mapStyle === 'SATELLITE' ? 15 : 13);
    } else if (isNeutralVenue) {
      L.circleMarker(hostCoords, {
        radius: 26,
        color: accentColor,
        weight: 1.5,
        fillColor: accentColor,
        fillOpacity: 0.16,
      }).addTo(map);

      L.marker(hostCoords, {
        icon: makeClubPinIcon(hostClub, 'SEDE NEUTRA • TORNEIO', accentColor),
      })
        .bindPopup(
          `<b>${hostClub.stadiumName ?? hostClub.name}</b><br/>${hostClub.city ?? ''} (Campo Neutro)`,
        )
        .addTo(map);

      map.setView(hostCoords, mapStyle === 'SATELLITE' ? 15 : 12);
    } else if (isHome) {
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

      if (computeDistanceKm(hostLat, hostLng, visitorLat, visitorLng) > 8) {
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

      L.circleMarker(hostCoords, {
        radius: 24,
        color: accentColor,
        weight: 1.5,
        fillColor: accentColor,
        fillOpacity: 0.18,
      }).addTo(map);

      L.marker(hostCoords, {
        icon: makeClubPinIcon(hostClub, 'DESTINO • JOGO', accentColor),
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    myClub.id,
    opponentClub.id,
    isHome,
    isNeutralVenue,
    neutralVenue?.stadiumName,
    neutralVenue?.lat,
    neutralVenue?.lng,
    mapStyle,
    accentColor,
  ]);

  // Listeners isolados de Controle (RS para mover e D-Pad ↑/↓ para Zoom + e Zoom -) sem recriar o mapa!
  useEffect(() => {
    const onRsMove = (ev: Event) => {
      const map = mapRef.current;
      if (!map) return;
      const { dx, dy } = (ev as CustomEvent<{ dx: number; dy: number }>).detail;
      map.panBy([dx * 12, dy * 12], { animate: false });
    };

    const onDpadZoom = (ev: Event) => {
      const map = mapRef.current;
      if (!map) return;
      const dir = (ev as CustomEvent<NavDirection>).detail;
      const curr = Math.round(map.getZoom());
      if (dir === 'UP') {
        map.setZoom(Math.min(map.getMaxZoom(), curr + 1), { animate: false });
      } else if (dir === 'DOWN') {
        map.setZoom(Math.max(map.getMinZoom(), curr - 1), { animate: false });
      }
    };

    window.addEventListener('gamepad-rs-move', onRsMove);
    window.addEventListener('prematch-dpad', onDpadZoom);
    return () => {
      window.removeEventListener('gamepad-rs-move', onRsMove);
      window.removeEventListener('prematch-dpad', onDpadZoom);
    };
  }, []);

  return (
    <div className="console-tile flex flex-col h-full min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#242730] flex items-center justify-between gap-2 shrink-0 bg-[#101216]">
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-bold"
            style={{ color: accentColor }}
          >
            {neutralVenue
              ? `SEDE OFICIAL • ${neutralVenue.countryName.toUpperCase()} (CAMPO NEUTRO)`
              : isNeutralVenue
                ? 'SEDE NEUTRA DE TORNEIO • SEM MANDO DE CAMPO'
                : isHome
                  ? 'ATUAÇÃO EM CASA • SEM DESLOCAMENTO'
                  : distanceKm < 25
                    ? 'FORA DE CASA • CLÁSSICO REGIONAL'
                    : `VIAGEM FORA DE CASA • ${distanceKm.toLocaleString('pt-BR')} KM`}
          </div>
          <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate">
            {neutralVenue
              ? `${neutralVenue.stadiumName} — ${neutralVenue.city}`
              : isNeutralVenue || isHome
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
        <span className="truncate ml-2">
          {neutralVenue
            ? `${neutralVenue.stadiumName} (${neutralVenue.city})`
            : (hostClub.stadiumName ?? hostClub.name)}
        </span>
      </div>
    </div>
  );
};
