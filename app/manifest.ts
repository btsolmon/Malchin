import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Нүүдэлчин / Nomad",
    short_name: "Нүүдэлчин",
    description:
      "Монгол нүүдэлчний survival тоглоом. Сүргээ хамгаал, өвгөнөөс сур.",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#0a0806",
    theme_color: "#0a0806",
    lang: "mn",
    categories: ["games", "entertainment"],
  };
}
