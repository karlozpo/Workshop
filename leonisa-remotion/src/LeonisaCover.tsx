import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import manifest from './manifest.json';

export const FPS = 30;
export const DURATION = 15 * FPS; // 450 frames = 15 s

// Línea de tiempo (frames)
const ENTER_END = 120; // 0 – 4 s: entran los elementos
const HOLD_END = ENTER_END + 7 * FPS; // 4 – 11 s: portada idéntica al PDF (7 s)
const EXIT = HOLD_END; // 11 – 15 s: salen y se vuelve al color inicial (loop)

const BASE = '#5c0c10'; // rojo cortina oscuro: primer y último frame del loop

const easeIn = Easing.bezier(0.16, 1, 0.3, 1);
const easeOut = Easing.bezier(0.7, 0, 0.84, 0);

type LayerName = keyof typeof manifest.layers;
const L = (name: string) => manifest.layers[name as LayerName];

/** Progreso 0→1 de entrada y 1→0 de salida para un elemento. */
const useVisibility = (inStart: number, inDur: number, outStart: number, outDur: number) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [inStart, inStart + inDur], [0, 1], {
    easing: easeIn,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(frame, [outStart, outStart + outDur], [0, 1], {
    easing: easeOut,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {enter, exit};
};

type Dir = 'up' | 'down' | 'left' | 'right';

/**
 * Capa recortada en su posición exacta del PDF. Entra con una revelación
 * enmascarada (se desliza dentro de su propia caja) y sale en la dirección opuesta.
 */
const MaskedLayer: React.FC<{
  name: string;
  from: Dir;
  inStart: number;
  inDur?: number;
  outStart: number;
  outDur?: number;
}> = ({name, from, inStart, inDur = 26, outStart, outDur = 22}) => {
  const box = L(name);
  const {enter, exit} = useVisibility(inStart, inDur, outStart, outDur);
  const off = (1 - enter) * 105 + exit * -105; // % del tamaño de la caja
  const axis = from === 'up' || from === 'down' ? 'Y' : 'X';
  const sign = from === 'down' || from === 'right' ? 1 : -1;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        overflow: 'hidden',
      }}
    >
      <Img
        src={staticFile(box.src)}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: `translate${axis}(${sign * off}%)`,
        }}
      />
    </div>
  );
};

/** Letra del logo: sube desde abajo con una máscara y un leve desenfoque. */
const LogoLetter: React.FC<{name: string; index: number}> = ({name, index}) => {
  const box = L(name);
  const frame = useCurrentFrame();
  const inStart = 18 + index * 5;
  const outStart = EXIT + 34 + index * 3;
  const {enter, exit} = useVisibility(inStart, 30, outStart, 22);
  const y = (1 - enter) * 110 - exit * 110;
  const blur = interpolate(frame, [inStart, inStart + 18], [8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        overflow: 'hidden',
      }}
    >
      <Img
        src={staticFile(box.src)}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: `translateY(${y}%)`,
          filter: frame < inStart + 18 ? `blur(${blur}px)` : undefined,
        }}
      />
    </div>
  );
};

/** Bandera: las tres franjas crecen desde la derecha. */
const Flag: React.FC = () => {
  const box = L('flag');
  const {enter, exit} = useVisibility(58, 22, EXIT + 16, 18);
  return (
    <div
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        clipPath: `inset(0 0 0 ${(1 - enter + exit) * 100}%)`,
      }}
    >
      <Img src={staticFile(box.src)} style={{width: '100%', height: '100%', display: 'block'}} />
    </div>
  );
};

export const LeonisaCover: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = manifest.video;

  // Foto: entra desde el rojo base con un zoom lento; sale igual (loop sin cortes).
  const photoIn = interpolate(frame, [0, 34], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const photoOut = interpolate(frame, [DURATION - 40, DURATION - 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const zoomIn = interpolate(frame, [0, ENTER_END - 10], [1.12, 1], {
    extrapolateRight: 'clamp',
    easing: easeIn,
  });
  const zoomOut = interpolate(frame, [EXIT + 20, DURATION], [0, 0.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const scale = zoomIn + zoomOut;

  const plate = L('plate');

  return (
    <AbsoluteFill style={{backgroundColor: BASE, overflow: 'hidden'}}>
      {/* Foto + logo comparten la misma escala para que la cabeza siga tapando el logo */}
      <AbsoluteFill
        style={{
          opacity: photoIn * (1 - photoOut),
          transform: `scale(${scale})`,
          transformOrigin: '50% 38%',
        }}
      >
        <Img src={staticFile(plate.src)} style={{position: 'absolute', left: 0, top: 0, width, height}} />
        {manifest.logo.map((name, i) => (
          <LogoLetter key={name} name={name} index={i} />
        ))}
      </AbsoluteFill>

      {/* Cabecera */}
      <MaskedLayer name="campana" from="down" inStart={52} outStart={EXIT + 14} />
      <MaskedLayer name="hecho" from="down" inStart={56} outStart={EXIT + 14} />
      <Flag />

      {/* ¿Quién es Karin Kipke? */}
      <MaskedLayer name="quien-1" from="left" inStart={62} inDur={30} outStart={EXIT + 6} />
      <MaskedLayer name="quien-2" from="left" inStart={68} inDur={30} outStart={EXIT + 9} />

      {/* Modelo y creadora... */}
      <MaskedLayer name="modelo-1" from="right" inStart={72} outStart={EXIT + 0} />
      <MaskedLayer name="modelo-2" from="right" inStart={76} outStart={EXIT + 3} />
      <MaskedLayer name="modelo-3" from="right" inStart={80} outStart={EXIT + 6} />
      <MaskedLayer name="modelo-4" from="right" inStart={84} outStart={EXIT + 9} />
      <MaskedLayer name="comunidad-1" from="down" inStart={88} outStart={EXIT + 10} />
      <MaskedLayer name="comunidad-2" from="down" inStart={91} outStart={EXIT + 12} />
      <MaskedLayer name="comunidad-3" from="down" inStart={94} outStart={EXIT + 14} />

      {/* Conoce sus favoritos */}
      <MaskedLayer name="conoce-1" from="left" inStart={78} inDur={30} outStart={EXIT + 2} />
      <MaskedLayer name="conoce-2" from="left" inStart={84} inDur={30} outStart={EXIT + 5} />
      <MaskedLayer name="guia-1" from="down" inStart={92} outStart={EXIT + 8} />
      <MaskedLayer name="guia-2" from="down" inStart={94} outStart={EXIT + 11} />
    </AbsoluteFill>
  );
};
