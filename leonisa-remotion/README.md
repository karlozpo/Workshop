# Leonisa · Campaña 17 I 2026 — portada animada (Remotion)

Video en loop de 15 s a partir de `source/campana-17-guia-de-estilo.pdf`,
en la misma proporción del PDF (1080 × 1664 px, 30 fps).

| Tramo | Tiempo | Qué pasa |
|---|---|---|
| Entrada | 0 – 4 s | La foto entra desde el rojo con un zoom lento, las letras de LEONISA suben una a una (por detrás de la cabeza de la modelo) y los textos entran con revelado enmascarado. |
| Portada fija | 4 – 11 s | **7 s** con todos los elementos dispuestos exactamente como en el PDF. |
| Salida | 11 – 15 s | Los textos y el logo salen y la foto vuelve al rojo inicial, así el último frame empalma con el primero (loop sin cortes). |

Render listo: `out/leonisa-campana-17.mp4`.

## Uso

```bash
npm install
npm run studio   # previsualizar
npm run render   # genera out/leonisa-campana-17.mp4
```

## Capas

`npm run layers` (Python con `pypdf`, `pypdfium2`, `opencv-python-headless`, `pillow`)
regenera `public/layers/` y `src/manifest.json` desde el PDF:

- cada línea de texto y la bandera se renderizan desde el vector del PDF, cada una en su PNG transparente con su posición exacta;
- el logo LEONISA viene integrado en la foto: se recorta letra por letra y el fondo detrás se reconstruye siguiendo los pliegues verticales de la cortina (`plate.jpg`).

Los tiempos de la animación están en `src/LeonisaCover.tsx`.
