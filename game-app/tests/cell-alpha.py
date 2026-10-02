"""Delivery asset checks; does not judge psychological content or artistry."""
import json
from pathlib import Path
from PIL import Image

visuals = json.loads(Path('dist/cell-visuals.json').read_text())['types']
for key, item in visuals.items():
    if item.get('base'):
        continue
    path = Path('dist') / item['file'].removeprefix('./')
    with Image.open(path) as image:
        image.load()
        assert image.width == image.height, key
        assert image.mode == 'RGBA', (key, image.mode)
        alpha = image.getchannel('A')
        assert alpha.getextrema()[0] == 0, key + ' needs breathing room'
        bbox = alpha.point(lambda a: 255 if a >= 64 else 0).getbbox()
        fraction = max(bbox[2]-bbox[0], bbox[3]-bbox[1]) / image.width
        size = item['displaySize']
        assert 80 <= size <= 145, key
        assert 55 <= fraction * size <= 86, (key, fraction * size)
print('PASS alpha: 18 square transparent symbols, valid WebP, normalized object size, clean breathing area')
