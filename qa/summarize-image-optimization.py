from pathlib import Path
import hashlib
import json
import statistics

ROOT=Path(__file__).resolve().parent.parent
before=json.loads((ROOT/'qa/image-baseline-performance.json').read_text())
after=json.loads((ROOT/'qa/image-optimized-performance.json').read_text())
report={'baselineCommit':'0a830f274dd1872eb97e3ae34103a75f736caedd','conditions':{key:after[key] for key in ['browser','viewport','deviceScaleFactor','network','cpuSlowdown','repetitions']},'pages':[],'preservedSources':{}}
for route in ['/','/book.html','/author.html','/launch.html']:
    row={'route':route}
    for name,data in [('before',before),('after',after)]:
        cold=[r for r in data['runs'] if r['route']==route and r['state']=='cold']
        warm=[r for r in data['runs'] if r['route']==route and r['state']=='warm']
        row[name]={'coldLcpMedianMs':statistics.median(r['lcp'] for r in cold),'warmLcpMedianMs':statistics.median(r['lcp'] for r in warm),'coldResourceBytesMedian':statistics.median(r['transferBytes'] for r in cold),'warmResourceBytesMedian':statistics.median(r['transferBytes'] for r in warm),'maximumObservedCls':max(r['cls'] for r in cold+warm),'maximumColdCls':max(r['cls'] for r in cold),'maximumWarmCls':max(r['cls'] for r in warm),'lcpElements':[r['lcpEntries'][-1] for r in cold]}
    row['lcpReductionPercent']=round(100*(1-row['after']['coldLcpMedianMs']/row['before']['coldLcpMedianMs']),2)
    row['bytesReductionPercent']=round(100*(1-row['after']['coldResourceBytesMedian']/row['before']['coldResourceBytesMedian']),2)
    report['pages'].append(row)
expected=json.loads((ROOT/'qa/approved-source-hashes.json').read_text())
for file,digest in expected.items():
    if file.startswith('assets/') or file=='navigation.js':
        actual=hashlib.sha256((ROOT/file).read_bytes()).hexdigest()
        assert actual==digest, f'Original source changed: {file}'
        report['preservedSources'][file]=actual
visual=json.loads((ROOT/'qa/image-visual-results.json').read_text())
report['visualCases']=len(visual['cases'])
report['allComparedLayoutsAndCopyUnchanged']=all(c['layoutAndCopyUnchanged'] for c in visual['cases'])
report['worstPageMeanAbsoluteError']=max(c['page']['meanAbsoluteError'] for c in visual['cases'])
report['minimumPageLocalSsim']=min(c['page']['meanLocalSsim'] for c in visual['cases'])
(ROOT/'qa/image-optimization-results.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
for page in report['pages']:
    print(page['route'],page['before']['coldLcpMedianMs'],'->',page['after']['coldLcpMedianMs'],'ms;',page['bytesReductionPercent'],'% fewer bytes')
print('Preserved original source files:',len(report['preservedSources']))
