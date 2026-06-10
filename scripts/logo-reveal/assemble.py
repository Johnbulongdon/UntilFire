import os, glob
from PIL import Image

# Assembles the transparent PNG frames produced by generate.mjs into:
#   - a true-alpha APNG  (untilfire-logo-<mode>.png)
#   - a checkerboard preview GIF (preview-<mode>.gif) so transparency is visible
# Frames are read from OUT_DIR (default: ./dist next to this script), matching generate.mjs.

OUT_DIR = os.environ.get("OUT_DIR", os.path.join(os.path.dirname(__file__), "dist"))
CB = 16  # checkerboard cell

def checker(w, h):
    bg = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    px = bg.load()
    c1, c2 = (210, 210, 214, 255), (170, 170, 176, 255)
    for y in range(h):
        for x in range(w):
            px[x, y] = c1 if ((x // CB + y // CB) % 2 == 0) else c2
    return bg

for mode in ("logo", "full"):
    fdir = os.path.join(OUT_DIR, f"frames-{mode}")
    files = sorted(glob.glob(f"{fdir}/f*.png"))
    if not files:
        print(f"{mode}: no frames in {fdir}, skipping")
        continue
    frames = [Image.open(f).convert("RGBA") for f in files]
    w, h = frames[0].size

    # --- APNG: true alpha, loop with a hold on the last frame ---
    durations = [33] * len(frames)
    durations[-1] = 1800  # hold final ~1.8s before looping
    apng = os.path.join(OUT_DIR, f"untilfire-logo-{mode}.png")
    frames[0].save(apng, save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, disposal=1, format="PNG")

    # --- checkerboard preview GIF (so transparency is visible) ---
    cb = checker(w, h)
    comp = []
    for fr in frames:
        c = cb.copy(); c.alpha_composite(fr); comp.append(c.convert("P", palette=Image.ADAPTIVE))
    gdur = [33] * len(comp); gdur[-1] = 1800
    comp[0].save(os.path.join(OUT_DIR, f"preview-{mode}.gif"), save_all=True,
                 append_images=comp[1:], duration=gdur, loop=0, disposal=2)

    print(f"{mode}: APNG {os.path.getsize(apng)} bytes, {len(frames)} frames, {w}x{h}")
print("done")
