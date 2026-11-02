"""Measure rendered PNG samples, not just CSS declarations. Development-only Pillow use."""
from pathlib import Path
from PIL import Image
import json
import math
import re

def luminance(rgb):
    channels = [v / 255 for v in rgb[:3]]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(linear, [0.2126, 0.7152, 0.0722]))

def contrast(first, second):
    a, b = sorted([luminance(first), luminance(second)])
    return (b + 0.05) / (a + 0.05)

samples = json.loads(Path('qa/artifacts/contrast-samples.json').read_text(encoding='utf-8'))
results = {'focus': [], 'inconclusiveTextInspection': []}
for sample in samples['focus']:
    image = Image.open(sample['file']).convert('RGB')
    stroke = image.getpixel(tuple(sample['stroke']))
    expected = tuple(int(v) for v in re.findall(r'[\d.]+', sample['color'])[:3])
    assert max(abs(a-b) for a, b in zip(stroke, expected)) <= 2, f"Focus stroke is clipped/missing: {sample}"
    ratios = [contrast(stroke, image.getpixel(tuple(point))) for point in sample['adjacent']]
    assert min(ratios) >= 3, f"Focus contrast below 3:1: {sample}, {ratios}"
    results['focus'].append({k: sample[k] for k in ['route', 'viewport', 'selector', 'state', 'color', 'width', 'offset']}
                           | {'adjacentRatios': [round(r, 3) for r in ratios], 'passed': True})

for sample in samples['text']:
    if not sample['text'] or not sample['rects']:
        results['inconclusiveTextInspection'].append(sample | {'disposition': 'No rendered DOM text; inspect decorative content separately'})
        continue
    image = Image.open(sample['file']).convert('RGB')
    color = tuple(int(v) for v in re.findall(r'[\d.]+', sample['color'])[:3])
    minimum = math.inf
    for rect in sample['rects']:
        left, top = max(0, math.floor(rect['x'])), max(0, math.floor(rect['y']))
        right = min(image.width, math.ceil(rect['x'] + rect['width']))
        bottom = min(image.height, math.ceil(rect['y'] + rect['height']))
        for y in range(top, bottom):
            for x in range(left, right):
                minimum = min(minimum, contrast(color, image.getpixel((x, y))))
    assert minimum != math.inf, f"No visible background pixels sampled: {sample}"
    assert minimum >= sample['threshold'], f"Inconclusive text contrast fails: {sample}, {minimum}"
    results['inconclusiveTextInspection'].append({k: sample[k] for k in ['route', 'viewport', 'open', 'selector', 'text', 'color', 'size', 'threshold', 'reason']}
                                               | {'minimumBackgroundRatio': round(minimum, 3), 'passed': True})

Path('qa/contrast-results.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
print(f"PASS {len(results['focus'])} painted focus states; {len(results['inconclusiveTextInspection'])} inconclusive text cases inspected")
