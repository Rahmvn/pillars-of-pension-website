"""Verify unchanged layout/copy, quantify raster differences, and retain a compact report."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json
import math

ROOT = Path(__file__).resolve().parent.parent
SCREENS = ROOT / 'qa/artifacts/image-lab/screens'

def records(label):
    return json.loads((SCREENS / label / 'manifest.json').read_text(encoding='utf-8'))

def image_metrics(first, second):
    first, second = first.convert('RGB'), second.convert('RGB')
    difference = ImageChops.difference(first, second)
    stats = ImageStat.Stat(difference)
    means_a, means_b = ImageStat.Stat(first).mean, ImageStat.Stat(second).mean
    histogram = difference.histogram()
    mse = sum(sum(count * value**2 for value, count in enumerate(histogram[c*256:(c+1)*256])) for c in range(3)) / (first.width*first.height*3)
    # 64px local luminance SSIM windows, using Pillow statistics without NumPy.
    a, b = first.convert('L'), second.convert('L')
    local = []
    for y in range(0, a.height, 64):
        for x in range(0, a.width, 64):
            bounds = (x,y,min(x+64,a.width),min(y+64,a.height))
            pa,pb=a.crop(bounds),b.crop(bounds)
            sa,sb=ImageStat.Stat(pa),ImageStat.Stat(pb)
            ma,mb=sa.mean[0],sb.mean[0];va,vb=sa.var[0],sb.var[0]
            h=ImageChops.difference(pa,pb).histogram()
            delta2=sum(n*i*i for i,n in enumerate(h))/(pa.width*pa.height)
            covariance=(va+vb-delta2+(ma-mb)**2)/2
            local.append(((2*ma*mb+6.5025)*(2*covariance+58.5225))/((ma*ma+mb*mb+6.5025)*(va+vb+58.5225)))
    return {'meanAbsoluteError':round(sum(stats.mean)/3,4), 'maximumChannelError':max(v[1] for v in stats.extrema),
            'psnrDb':round(10*math.log10(255**2/mse),3) if mse else None, 'meanChannelShift':[round(b-a,4) for a,b in zip(means_a,means_b)], 'meanLocalSsim':round(sum(local)/len(local),6)}

report = {'baselineCommit':'0a830f274dd1872eb97e3ae34103a75f736caedd','cases':[]}
for label, base in [('optimized','baseline'),('optimized-dpr2','baseline-dpr2'),('optimized-webp','baseline'),('optimized-webp-dpr2','baseline-dpr2')]:
    if not (SCREENS/label/'manifest.json').exists():continue
    original=records(base)
    for candidate in records(label):
        approved=next(r for r in original if (r['name'],r['width'],r['dpr'])==(candidate['name'],candidate['width'],candidate['dpr']))
        for key in ['text','title','metadata','navigation','geometry']:
            assert approved[key] == candidate[key], f'{label}/{candidate["name"]}/{candidate["width"]}: {key} changed'
        assert [(i['class'],i['alt']) for i in approved['images']]==[(i['class'],i['alt']) for i in candidate['images']]
        first,second=Image.open(ROOT/approved['file']),Image.open(ROOT/candidate['file'])
        assert first.size==second.size
        case={k:candidate[k] for k in ['name','width','dpr']}
        case.update({'candidate':label,'layoutAndCopyUnchanged':True, 'page':image_metrics(first,second)})
        if candidate['name']=='author':
            rect=next(r for r in approved['geometry'] if r['tag']=='FIGURE' and r['class']=='portrait')
            scale=candidate['dpr']
            bounds=tuple(round(v*scale) for v in [rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height']])
            case['portrait']=image_metrics(first.crop(bounds),second.crop(bounds))
        report['cases'].append(case)
(ROOT/'qa/image-visual-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f'PASS {len(report["cases"])} approved-layout/copy comparisons; pixel metrics retained for visual review')
