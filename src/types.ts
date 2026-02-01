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
  tidal_album: Album;
};
