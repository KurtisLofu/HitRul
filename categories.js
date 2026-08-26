// Categorías de la ruleta. weight = tamaño relativo de la porción (todas iguales por defecto).
const CATEGORIES = [
  { id: "tipo",     label: "Grupo o\nSolista",   color: "#FF6B6B", prompt: "¿Es un grupo o un solista?" },
  { id: "epoca",    label: "Antes o\ndespués\ndel 2000", color: "#4ECDC4", prompt: "¿Es de antes o de después del año 2000?" },
  { id: "año2",     label: "Año\n(±2 años)",     color: "#FF9F1C", prompt: "Di el año con un margen de 2 años." },
  { id: "año4",     label: "Año\n(±4 años)",     color: "#06D6A0", prompt: "Di el año con un margen de 4 años." },
  { id: "decada",   label: "Década",             color: "#A78BFA", prompt: "¿De qué década es la canción?" },
  { id: "añoexacto",label: "Año\nexacto",        color: "#FFD23F", prompt: "Di el año exacto de la canción." },
  { id: "artista",  label: "Nombre del\nartista", color: "#EF476F", prompt: "¿Quién canta esta canción?" },
  { id: "titulo",   label: "Título de\nla canción", color: "#118AB2", prompt: "¿Cómo se llama esta canción?" },
];
