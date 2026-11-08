"""生成纸间阅读器 PWA 图标（仅用于重新生成图标，运行项目不需要 Python）。"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "client" / "public"
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 512
S = SIZE / 512  # 缩放系数


def px(v):
    return int(round(v * S))


def build():
    img = Image.new("RGB", (SIZE, SIZE), "#241a14")
    d = ImageDraw.Draw(img)

    # 木质底纹：极细的竖向纹路，避免大面积渐变
    for x in range(0, SIZE, px(9)):
        d.line([(x, 0), (x, SIZE)], fill="#2b1e16", width=max(1, px(1)))
    d.rectangle([px(18), px(18), SIZE - px(18), SIZE - px(18)], outline="#3b2a1e", width=px(3))

    # 三本竖立的书脊
    spines = [
        (px(96),  px(118), px(96),  px(300), "#7c4a41"),
        (px(202), px(86),  px(88),  px(332), "#4d5e4b"),
        (px(300), px(104), px(104), px(314), "#41536b"),
    ]
    for x, y, w, h, color in spines:
        d.rectangle([x, y, x + w, y + h], fill=color)
        d.rectangle([x + px(7), y + px(7), x + w - px(7), y + h - px(7)], outline="#00000022", width=max(1, px(1)))
        # 书脊上下烫金细线
        for dy in (px(24), h - px(30)):
            d.line([(x + px(12), y + dy), (x + w - px(12), y + dy)], fill="#d7bd8c", width=max(1, px(2)))
        # 竖排标题（用短横线示意）
        cx = x + w // 2
        for i in range(5):
            ty = y + px(62) + i * px(30)
            d.line([(cx - px(11), ty), (cx + px(11), ty)], fill="#e8dcc2", width=max(1, px(2)))

    # 书架横板
    d.rectangle([px(58), px(418), SIZE - px(58), px(438)], fill="#4a3526")
    d.line([(px(58), px(418)), (SIZE - px(58), px(418))], fill="#a9854c", width=max(1, px(2)))
    d.rectangle([px(58), px(438), SIZE - px(58), px(446)], fill="#1a120c")

    return img


img = build()
for size in (192, 512, 180):
    target = OUT / (f"apple-touch-icon.png" if size == 180 else f"icon-{size}.png")
    img.resize((size, size), Image.LANCZOS).save(target, "PNG", optimize=True)
    print("wrote", target)
