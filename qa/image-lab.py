"""Create isolated image-delivery experiments; never overwrite a source design asset."""
from pathlib import Path
import json
import subprocess
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / 'qa/artifacts/image-lab'

def baseline():
    files = json.loads(subprocess.check_output(['git', 'show', '0a830f2:scripts/static-files.json'], cwd=ROOT))
    site = LAB / 'sites/baseline'
    for name in files:
        target = site / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(subprocess.check_output(['git', 'show', f'0a830f2:{name}'], cwd=ROOT))
    print(f'Isolated baseline: {site}')

TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='

def variants():
    for variant in ['native90', 'native95', 'responsive90', 'responsive95', 'webp95', 'native-webp95', 'priority', 'cover90', 'cover-webp95']:
        site = LAB / f'sites/{variant}'
        shutil.copytree(LAB / 'sites/baseline', site, dirs_exist_ok=True)
        for page in ['index', 'book', 'author', 'launch']:
            file = site / f'{page}.html'
            html = file.read_text(encoding='utf-8')
            def replace(match):
                img = match.group(0)
                is_background = 'interior.webp' in img
                is_portrait = 'author-portrait.webp' in img
                is_cover = 'book-cover.png' in img
                if variant == 'priority':
                    if is_background and page != 'index':
                        return img.replace('fetchpriority="high"', 'fetchpriority="low"')
                    if 'stone-scene' in img:
                        return img.replace('<img ', '<img fetchpriority="high" ')
                    return img
                if variant.startswith('cover'):
                    if not is_cover:return img
                    extension = 'webp' if variant == 'cover-webp95' else 'avif'
                    quality = 95 if extension == 'webp' else 90
                    return img.replace('assets/images/book-cover.png', f'/delivery/book-cover-480-q{quality}.{extension}')
                if not is_background and not is_portrait:return img
                quality = 95 if variant in ['native95', 'responsive95'] else 90
                responsive = variant in ['responsive90','responsive95','webp95']
                stem = 'interior' if is_background else 'author-portrait'
                native = 1536 if is_background else 1153
                widths = ([1024,1536] if is_background else [768,960,1153]) if responsive else [native]
                sizes = '1000px' if 'stone-scene' in img else ('100vw' if page == 'index' else '1735px')
                if is_portrait:sizes='(max-width: 599px) 100vw, (max-width: 1099px) 510px, 42.3611vw'
                sources=[]
                hidden = None
                if page == 'index' and 'class="scene"' in img:hidden='(max-width: 1099px)'
                if page == 'index' and 'stone-scene' in img:hidden='(min-width: 1100px)'
                if page == 'author' and is_background:hidden='(min-width: 1100px)'
                if hidden:sources.append(f'<source media="{hidden}" srcset="{TRANSPARENT}">')
                if variant not in ['webp95','native-webp95']:
                    srcset=', '.join(f'/delivery/{stem}-{width}-q{quality}.avif {width}w' for width in widths)
                    sources.append(f'<source type="image/avif" srcset="{srcset}" sizes="{sizes}">')
                srcset=', '.join(f'/delivery/{stem}-{width}-q95.webp {width}w' for width in widths)
                sources.append(f'<source type="image/webp" srcset="{srcset}" sizes="{sizes}">')
                if 'stone-scene' in img:img=img.replace('<img ','<img fetchpriority="high" ')
                return '<picture class="responsive-image">'+''.join(sources)+img+'</picture>'
            html = re.sub(r'<img\b[^>]*>', replace, html)
            file.write_text(html, encoding='utf-8', newline='')
        if not variant.startswith('cover') and variant != 'priority':
            with (site/'styles.css').open('a',encoding='utf-8') as css:css.write('\n.responsive-image { display: contents; }\n')
        print(f'Prepared {variant}', flush=True)

def fallback():
    site = LAB / 'sites/optimized-webp'
    shutil.copytree(ROOT/'dist',site,dirs_exist_ok=True)
    for file in site.glob('*.html'):
        html=file.read_text(encoding='utf-8')
        html=re.sub(r'(?m)^[ \t]*<source type="image/avif"[^>]*>\n','',html)
        file.write_text(html,encoding='utf-8',newline='')
    print('Prepared exact production WebP fallback fixture (AVIF source selection disabled only in the fixture).')

if __name__ == '__main__':
    if '--fallback' in sys.argv:fallback()
    elif '--variants' in sys.argv:variants()
    else:baseline()
