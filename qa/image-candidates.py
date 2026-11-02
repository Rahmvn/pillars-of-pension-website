"""Encode isolated delivery candidates from untouched originals; no production edits."""
from pathlib import Path
from PIL import Image, ImageCms, ImageChops, ImageStat
import json
import math
import time

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'qa/artifacts/image-lab/delivery'
OUTPUT.mkdir(parents=True, exist_ok=True)
profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
records = []
for stem, widths in [('interior', [1536, 1280, 1024]), ('author-portrait', [1153, 960, 768, 640]), ('book-cover', [480, 360])]:
    original = Image.open(ROOT / f'assets/images/{stem}.png').convert('RGB')
    for width in widths:
        image = original if width == original.width else original.resize((width, round(original.height * width / original.width)), Image.Resampling.LANCZOS)
        formats = [('avif', [80, 90, 95]), ('webp', [90, 95])]
        for extension, qualities in formats:
            for quality in qualities:
                target = OUTPUT / f'{stem}-{width}-q{quality}.{extension}'
                started = time.monotonic()
                if extension == 'avif':
                    image.save(target, quality=quality, subsampling='4:4:4', range='full', speed=5, max_threads=2, icc_profile=profile)
                else:
                    image.save(target, quality=quality, method=6, icc_profile=profile)
                decoded = Image.open(target).convert('RGB')
                difference = ImageChops.difference(image, decoded)
                stats = ImageStat.Stat(difference)
                histogram = difference.histogram()
                mse = sum(sum(count * value * value for value, count in enumerate(histogram[channel*256:(channel+1)*256])) for channel in range(3)) / (image.width * image.height * 3)
                shift = [b-a for a,b in zip(ImageStat.Stat(image).mean, ImageStat.Stat(decoded).mean)]
                record = dict(file=target.relative_to(ROOT).as_posix(), original=f'assets/images/{stem}.png', width=image.width, height=image.height, format=extension, quality=quality,
                              bytes=target.stat().st_size, meanAbsoluteError=round(sum(stats.mean)/3, 4), psnrDb=round(10*math.log10(255**2/mse), 3), meanChannelShift=[round(v,4) for v in shift], seconds=round(time.monotonic()-started,2))
                records.append(record)
                print(f'{target.name}: {record["bytes"]:,} bytes; MAE {record["meanAbsoluteError"]}; PSNR {record["psnrDb"]}', flush=True)
(ROOT / 'qa/image-candidate-results.json').write_text(json.dumps(records, indent=2)+'\n', encoding='utf-8')
