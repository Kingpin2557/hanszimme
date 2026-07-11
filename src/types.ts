type Country = {
  name: string;
  code: string;
  coords: {
    lat: number;
    lng: number;
  };
};

type Album = {
  id: number;
  embed_link: string;
  title: string;
  tracks: string;
};

export type Movie = {
  Name: string;
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  origin_country: Country;
  genres: string[];
  rating: { score: number; votes: number };
  tidal_album: Album;
};

export type TourStop = {
  city: string;
  country: string;
  code: string;
  coords: { lat: number; lng: number };
  date: string;
  venue: string;
};

export type Tour = {
  id: string;
  name: string;
  years: string;
  stopCount: number;
  start: TourStop;
  stops: TourStop[];
  album: { id: number; title: string; artist: string; artwork: string | null } | null;
};
