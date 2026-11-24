import { CountryCode } from '../../shared/types/common';

const NAME_POOLS: Partial<Record<CountryCode, { first: string[]; last: string[] }>> = {
  BRA: {
    first: ['Rafael', 'Lucas', 'Matheus', 'Gabriel', 'Vinícius', 'Pedro', 'João', 'Caio', 'Breno', 'Kauã'],
    last: ['Silva', 'Santos', 'Oliveira', 'Costa', 'Souza', 'Pereira', 'Ribeiro', 'Almeida', 'Gomes', 'Rocha'],
  },
  ARG: {
    first: ['Mateo', 'Thiago', 'Valentín', 'Enzo', 'Julián', 'Lautaro', 'Franco', 'Nicolás'],
    last: ['Fernández', 'Romero', 'Gómez', 'Álvarez', 'Martínez', 'Sosa', 'Medina', 'Paz'],
  },
  URU: {
    first: ['Federico', 'Facundo', 'Darwin', 'Agustín', 'Matías', 'Rodrigo'],
    last: ['Valverde', 'Suárez', 'Bentancur', 'Araújo', 'Giménez', 'Olivera'],
  },
  ENG: {
    first: ['Jude', 'Cole', 'Bukayo', 'Mason', 'Liam', 'Harry', 'Callum', 'Ollie'],
    last: ['Walker', 'Palmer', 'Bennett', 'Clarke', 'Wright', 'turner', 'Hall'].map((s) => s[0].toUpperCase() + s.slice(1)),
  },
  ESP: {
    first: ['Pablo', 'Alejandro', 'Álvaro', 'Dani', 'Martín', 'Hugo', 'Iker', 'Pedri'],
    last: ['García', 'Ruiz', 'Torres', 'Navarro', 'Morales', 'Serrano', 'Molina'],
  },
  ITA: {
    first: ['Lorenzo', 'Matteo', 'Federico', 'Alessandro', 'Niccolò', 'Marco', 'Davide'],
    last: ['Rossi', 'Bianchi', 'Esposito', 'Conti', 'Ricci', 'Marino', 'Gallo'],
  },
  GER: {
    first: ['Florian', 'Jamal', 'Lukas', 'Leon', 'Kai', 'Maximilian', 'Jonas'],
    last: ['Müller', 'Wagner', 'Becker', 'Richter', 'Schäfer', 'Weber', 'Hoffmann'],
  },
  FRA: {
    first: ['Kylian', 'Rayan', 'Warren', 'Théo', 'Antoine', 'Hugo', 'Lucas'],
    last: ['Moreau', 'Laurent', 'Dubois', 'Bernard', 'Chevalier', 'Mercier'],
  },
  POR: {
    first: ['Gonçalo', 'Diogo', 'João', 'Rafael', 'Tiago', 'Vítor', 'Nuno'],
    last: ['Neves', 'Silva', 'Mendes', 'Costa', 'Ferreira', 'Sousa', 'Ramos'],
  },
  USA: {
    first: ['Christian', 'Weston', 'Tyler', 'Gio', 'Miles', 'Caleb', 'Brenden'],
    last: ['Adams', 'Robinson', 'Carter', 'Brooks', 'Miller', 'Reyna'],
  },
  NOR: {
    first: ['Erling', 'Martin', 'Oscar', 'Sander', 'Antonio', 'Kristian'],
    last: ['Berg', 'Hansen', 'Larsen', 'Solberg', 'Dahl', 'Nilsen'],
  },
  JPN: {
    first: ['Kaoru', 'Takefusa', 'Ritsu', 'Wataru', 'Daichi', 'Keito'],
    last: ['Tanaka', 'Sato', 'Takahashi', 'Watanabe', 'Ito', 'Nakamura'],
  },
  MAR: {
    first: ['Achraf', 'Bilal', 'Sofyan', 'Youssef', ' Hakim', 'Ilias'].map((s) => s.trim()),
    last: ['Hakimi', 'El Khannouss', 'Amrabat', 'Saibari', 'Benjelloun'],
  },
};

const FALLBACK_HISPANIC: CountryCode[] = ['COL', 'ECU', 'PAR', 'VEN', 'CHI', 'PER', 'BOL', 'MEX', 'CRC', 'PAN', 'HON', 'SLV'];

export function rollRealisticNameForCountry(country: CountryCode): {
  firstName: string;
  lastName: string;
  shirtName: string;
} {
  const pool =
    NAME_POOLS[country] ??
    (FALLBACK_HISPANIC.includes(country) ? NAME_POOLS.ARG! : NAME_POOLS.ENG!);

  const firstName = pool.first[Math.floor(Math.random() * pool.first.length)];
  const lastName = pool.last[Math.floor(Math.random() * pool.last.length)];
  const shirtName = lastName.slice(0, 12).toUpperCase();
  return { firstName, lastName, shirtName };
}
