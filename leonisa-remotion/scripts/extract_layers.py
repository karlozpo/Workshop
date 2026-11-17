"""Separa la portada PDF en capas PNG para animarlas en Remotion.

Capas generadas en public/layers:
  plate.jpg        foto de fondo sin el logo (logo retirado con inpainting)
  logo-<n>.png     cada letra de LEONISA (recortada de la foto, respeta la cabeza)
  <id>.png         cada linea de texto / bandera, renderizada del vector del PDF
y un manifest.json con posiciones en px del video (1080 de ancho).
"""
import io, json, os, sys
import numpy as np
import cv2
import pypdfium2 as pdfium
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, "source", "campana-17-guia-de-estilo.pdf")
OUT = os.path.join(ROOT, "public", "layers")
os.makedirs(OUT, exist_ok=True)

VIDEO_W = 1080
SS = 2  # supersampling: las capas se exportan al doble de la resolucion del video

reader = PdfReader(PDF)
page = reader.pages[0]
PW, PH = float(page.mediabox.width), float(page.mediabox.height)
PX_PER_PT = VIDEO_W / PW * SS
ops = ContentStream(page.get_contents(), reader).operations

SHOW = {b"Tj", b"TJ", b"'", b'"'}
PHOTO_END = 89  # ops 0..89 dibujan las teselas de la foto

# elementos de texto/vector -> indices de operadores que pintan
ELEMENTS = {
    "campana": [127],
    "hecho": [129],
    "flag": [133, 136, 139],
    "quien-1": [98],
    "quien-2": [102],
    "modelo-1": [106],
    "modelo-2": [108],
    "modelo-3": [110],
    "modelo-4": [112],
    "comunidad-1": [117],
    "comunidad-2": [119, 121],
    "comunidad-3": [123],
    "conoce-1": [146],
    "conoce-2": [150],
    "guia-1": [155, 157, 159],
    "guia-2": [161, 163],
}


def render(keep, transparent):
    """Renderiza la pagina conservando solo los operadores de pintura en `keep`."""
    new = []
    for i, (operands, op) in enumerate(ops):
        if i <= PHOTO_END and op == b"Do" and i not in keep:
            continue
        if op in SHOW and i not in keep:
            continue
        if op == b"f" and i not in keep:
            continue
        new.append((operands, op))
    cs = ContentStream(None, reader)
    cs.operations = new
    w = PdfWriter()
    w.add_page(page)
    p = w.pages[0]
    p[NameObject("/Contents")] = w._add_object(cs)
    buf = io.BytesIO()
    w.write(buf)
    doc = pdfium.PdfDocument(buf.getvalue())
    bmp = doc[0].render(scale=PX_PER_PT, fill_color=(0, 0, 0, 0) if transparent else (255, 255, 255, 255))
    return bmp.to_pil().convert("RGBA" if transparent else "RGB")


manifest = {"video": {"width": VIDEO_W, "height": None}, "layers": {}}


def save(name, img, box):
    """Guarda img (recortada) y registra su caja en px del video."""
    img.save(os.path.join(OUT, name + ".png"), optimize=True)
    x0, y0, x1, y1 = box
    manifest["layers"][name] = {
        "src": f"layers/{name}.png",
        "left": round(x0 / SS, 2), "top": round(y0 / SS, 2),
        "width": round((x1 - x0) / SS, 2), "height": round((y1 - y0) / SS, 2),
    }


# ---------- foto ----------
photo = render(set(i for i, (_, op) in enumerate(ops) if i <= PHOTO_END and op == b"Do"), False)
W, H = photo.size
manifest["video"]["height"] = H // SS


# ---------- logo LEONISA (integrado en la foto) ----------
rgb = np.asarray(photo).astype(np.int16)
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
logo_zone = np.zeros((H, W), bool)
logo_zone[: int(110 * PX_PER_PT), :] = True  # el logo vive en los 110 pt superiores
strict = logo_zone & (R > 205) & (G > 200) & (B > 140) & (np.abs(R - G) < 28)
strict = strict.astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(strict, 8)
clean = np.zeros_like(strict)
for k in range(1, n):
    if stats[k, cv2.CC_STAT_AREA] > 1500:
        clean[lab == k] = 1
near = cv2.dilate(clean, np.ones((7, 7), np.uint8))
# matte suave para bordes antialias: usa el canal verde (cortina roja ~G bajo, logo crema ~G alto)
soft = np.clip((G.astype(np.float32) - 70) / (235 - 70), 0, 1)
alpha = np.where(near > 0, soft, 0).astype(np.float32)
alpha[clean > 0] = 1.0

# plate: retira el logo. Los pliegues de la cortina son verticales, asi que cada
# columna se rellena interpolando entre el color de arriba y el de abajo del logo.
inpaint_mask = cv2.dilate(near, np.ones((15, 15), np.uint8)).astype(bool)
src = np.asarray(photo).astype(np.float32)
smooth = cv2.GaussianBlur(src, (0, 0), 2)
fill = src.copy()
is_red = (smooth[..., 0] > smooth[..., 1] + 45)  # cortina (no cabello ni piel)
for x in range(W):
    col = inpaint_mask[:, x]
    if not col.any():
        continue
    ys = np.where(col)[0]
    runs = np.split(ys, np.where(np.diff(ys) > 1)[0] + 1)
    for run in runs:
        a, b = run[0], run[-1]
        up = smooth[max(a - 3, 0), x] if a > 0 else None
        dn = smooth[min(b + 3, H - 1), x] if b < H - 1 else None
        up_ok = up is not None and is_red[max(a - 3, 0), x]
        dn_ok = dn is not None and is_red[min(b + 3, H - 1), x]
        if up_ok and dn_ok:
            t = np.linspace(0, 1, len(run))[:, None]
            fill[run, x] = up * (1 - t) + dn * t
        elif up_ok or dn_ok:
            fill[run, x] = up if up_ok else dn
        else:
            # columna sin cortina limpia arriba/abajo: deja el inpaint clasico
            pass
# suaviza horizontalmente el relleno para eliminar rayas entre columnas
band = cv2.GaussianBlur(fill, (0, 0), sigmaX=2.5, sigmaY=6)
fill = np.where(inpaint_mask[..., None], band, src)
rng = np.random.default_rng(7)
grain = cv2.GaussianBlur(rng.normal(0, 4.0, (H, W)).astype(np.float32), (0, 0), 0.8)[..., None]
fill = np.clip(fill + grain, 0, 255)
feather = cv2.GaussianBlur(inpaint_mask.astype(np.float32), (0, 0), 3)[..., None]
plate = src * (1 - feather) + fill * feather
Image.fromarray(plate.astype(np.uint8)).save(os.path.join(OUT, "plate.jpg"), quality=92)
manifest["layers"]["plate"] = {"src": "layers/plate.jpg", "left": 0, "top": 0, "width": W / SS, "height": H / SS}

# separa las letras por huecos en la proyeccion horizontal
cols = (alpha > 0.5).any(axis=0)
letters, inside, start = [], False, 0
for x, on in enumerate(cols):
    if on and not inside:
        inside, start = True, x
    elif not on and inside:
        inside = False
        letters.append([start, x])
if inside:
    letters.append([start, W])
# une fragmentos muy cercanos (p.ej. letras partidas por la cabeza)
merged = []
for a, b in letters:
    if merged and a - merged[-1][1] < 12 * SS:
        merged[-1][1] = b
    else:
        merged.append([a, b])
letters = [l for l in merged if l[1] - l[0] > 20 * SS]
print("letras del logo:", len(letters), letters)
logo_rgba = np.dstack([np.asarray(photo), (alpha * 255).astype(np.uint8)])
manifest["logo"] = []
for i, (a, b) in enumerate(letters):
    a0, b0 = max(a - 4, 0), min(b + 4, W)
    rows = np.where((alpha[:, a0:b0] > 0.02).any(axis=1))[0]
    y0, y1 = max(rows[0] - 4, 0), min(rows[-1] + 5, H)
    name = f"logo-{i}"
    save(name, Image.fromarray(logo_rgba[y0:y1, a0:b0]), (a0, y0, b0, y1))
    manifest["logo"].append(name)

# ---------- textos y bandera (vector) ----------
for name, keep in ELEMENTS.items():
    img = render(set(keep), True)
    bbox = img.getchannel("A").getbbox()
    pad = 6
    box = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, W), min(bbox[3] + pad, H))
    save(name, img.crop(box), box)

with open(os.path.join(OUT, "..", "..", "src", "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)
print("ok", W, H)
