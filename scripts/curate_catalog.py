#!/usr/bin/env python3
"""Validate public evaluation evidence and atomically publish a complete GPU catalog."""
import argparse, concurrent.futures, datetime, hashlib, json, math, re, sys, time, urllib.parse, urllib.error, os
from pathlib import Path
from import_catalog import ROOT, CACHE, api, request_json, normalize, VERSION, FILE_TYPES

SUPPORTED = {'llama', 'mistral', 'qwen2', 'qwen3', 'gemma', 'gemma2', 'phi3', 'phi', 'smollm3', 'granite', 'olmo2', 'olmo3', 'ministral3', 'apertus', 'exaone', 'exaone4', 'gemma3'}
SUITE = 'hf-leaderboard-ifeval2-mmlupro0.1/v1'
TASKS = [('leaderboard_ifeval', 'inst_level_strict_acc,none', 2.0, 0),
         ('leaderboard_mmlu_pro', 'acc,none', 0.1, 5)]
RESULTS = 'open-llm-leaderboard/results'
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(value): return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
def model_at(repo, revision):
    return request_json('https://huggingface.co/api/models/'+repo+'/revision/'+revision+'?blobs=true')
def identity(meta):
    files = {x['rfilename']: (x.get('lfs') or {}).get('sha256') or x.get('blobId') for x in meta['siblings']
             if x['rfilename'].endswith('.safetensors')}
    if not files or any(v is None for v in files.values()) or not any(k.endswith('.safetensors') for k in files):
        raise ValueError('missing-source-weight-identities')
    return files
def compatible_identity(a, b):
    # Reference quality belongs to the pinned evaluation revision/template, never the GGUF template.
    return identity(a) == identity(b)

def leaderboard_rows(ids):
    rows=[]
    for start in range(0,len(ids),20):
        where=' OR '.join('"fullname"=\''+name.replace("'","''")+'\'' for name in ids[start:start+20])
        offset=0
        while True:
            query=urllib.parse.urlencode({'dataset':'open-llm-leaderboard/contents','config':'default','split':'train','where':where,'offset':offset,'length':100})
            page=request_json('https://datasets-server.huggingface.co/filter?'+query)
            if not isinstance(page.get('rows'),list) or not isinstance(page.get('num_rows_total'),int):raise ValueError('invalid-benchmark-registry-response')
            rows.extend(x['row'] for x in page['rows']);offset+=len(page['rows'])
            if offset>=page['num_rows_total']:break
            if not page['rows']:raise ValueError('incomplete-benchmark-pagination')
    return rows

def conditions(result):
    out = {}
    if result.get('config', {}).get('limit') is not None: raise ValueError('partial-evaluation')
    if result.get('config', {}).get('gen_kwargs') is not None: raise ValueError('global-generation-override')
    if result.get('config', {}).get('model_dtype') not in ('torch.bfloat16','torch.float16'): raise ValueError('unsupported-evaluation-precision')
    for task, metric, version, shots in TASKS:
        if result.get('versions', {}).get(task) != version or result.get('n-shot', {}).get(task) != shots:
            raise ValueError('incompatible-benchmark-version-or-shots')
        c = result.get('configs', {}).get(task, {})
        out[task] = {k:c.get(k) for k in ('dataset_path','dataset_name','test_split','fewshot_split','output_type','num_fewshot','generation_kwargs','fewshot_config','doc_to_text','doc_to_target','doc_to_choice','process_results','metric_list','filter_list','repeats','description','target_delimiter','fewshot_delimiter')}
        count = result.get('n-samples', {}).get(task, {})
        if count.get('effective') != count.get('original') or not count.get('effective'):
            raise ValueError('incomplete-benchmark-samples')
        out[task]['samples'] = count['effective']
    # Model-specific native chat templates are expected; no custom system instruction.
    if result.get('system_instruction'): raise ValueError('custom-system-instruction')
    out['chatTemplateApplied'] = bool(result.get('chat_template'))
    out['fewshotAsMultiturn'] = result.get('fewshot_as_multiturn', False)
    return out

def benchmark(release, files, revision, policy):
    repo = release['releaseIdentifier']
    current = model_at(repo, release['revision'])
    failures = set()
    for path in sorted(files, reverse=True):
        url = f'https://huggingface.co/datasets/{RESULTS}/resolve/{revision}/{path}'
        result = request_json(url)
        try:
            cond = conditions(result)
            if digest(cond) != policy['conditionsHash']: raise ValueError('incompatible-evaluation-conditions')
            config = result['config']; sha = config.get('model_sha') or config.get('model_revision')
            if result.get('model_name') != repo or not re.fullmatch('[a-f0-9]{40}', sha or ''):
                raise ValueError('evaluation-model-identity-mismatch')
            values = [result['results'][task][metric] for task,metric,_,_ in TASKS]
            if any(not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<=v<=1 for v in values):
                raise ValueError('invalid-benchmark-value')
            if sha != release['revision'] and not compatible_identity(current, model_at(repo,sha)):
                raise ValueError('evaluation-source-weights-or-tokenizer-changed')
            evaluated = datetime.datetime.fromtimestamp(result['date'],datetime.timezone.utc).isoformat()
            return {'suite':SUITE,'values':values,'score':50*sum(values), 'modelRevision':sha,
                    'sourceUrl':url,'sourceRevision':revision, 'evaluatedAt':evaluated,'retrievedAt':now(),
                    'harnessRevision':result.get('git_hash') or result.get('upper_git_hash'),
                    'precision':config['model_dtype'], 'conditionsHash':digest(cond),
                    'identityVerification':'exact-revision' if sha==release['revision'] else 'identical-source-weight-hashes; evaluation-template-pinned-separately'}
        except (ValueError,KeyError,TypeError,OverflowError) as e: failures.add(str(e))
    raise ValueError('; '.join(sorted(failures)) or 'no-comparable-evaluation')

def validate(snapshot):
    releases = snapshot['releases']; artifacts = snapshot['artifacts']
    if snapshot['schemaVersion'] != 3 or not releases or not artifacts: raise ValueError('empty-or-invalid-catalog')
    ids = {r['id'] for r in releases}
    if len(ids)!=len(releases) or len({a['id'] for a in artifacts})!=len(artifacts): raise ValueError('duplicate-identities')
    for r in releases:
        a = r['architecture']; b = r.get('referenceQuality'); q=r.get('qualityRating')
        if a['type'] not in SUPPORTED or (a.get('experts') or 0)>1: raise ValueError('unsupported-architecture')
        if any(not isinstance(a.get(k),int) or a[k]<=0 for k in ('layers','hiddenSize','attentionHeads','kvHeads','headDim')):
            raise ValueError('missing-architecture-parameters')
        if not r.get('contextLimit') or not r.get('totalParameters') or not r.get('license'): raise ValueError('incomplete-release')
        if not q or not isinstance(q.get('score'),(int,float)) or isinstance(q['score'],bool) or not math.isfinite(q['score']) or not 0<=q['score']<=100 or q.get('basis') not in ('reference-benchmark','external-curated') or not q.get('sourceUrl','').startswith('https://') or not q.get('asOf') or not q.get('note'):raise ValueError('invalid-quality-rating')
        if not r.get('tasks') or any(t not in ('Chat','Coding','Reasoning','Agentic') for t in r['tasks']) or not r.get('taskSource','').startswith('https://'):raise ValueError('invalid-task-evidence')
        if not any(x['releaseId']==r['id'] for x in artifacts): raise ValueError('missing-variants')
        if b is None:
            if q['basis']=='reference-benchmark':raise ValueError('missing-reference-benchmark')
            continue
        if b['suite']!=SUITE or len(b['values'])!=2 or any(not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v) or not 0<=v<=1 for v in b['values']): raise ValueError('incomplete-benchmarks')
        policy=json.loads((ROOT/'data/benchmark-policy.json').read_text())
        if b['conditionsHash']!=policy['conditionsHash'] or not b.get('harnessRevision') or not b.get('evaluatedAt') or b['evaluatedAt']>b['retrievedAt']: raise ValueError('invalid-evaluation-provenance')
        if abs(b['score']-50*sum(b['values']))>1e-8: raise ValueError('invalid-quality-index')
        for key in ('modelRevision','sourceRevision'):
            if not re.fullmatch('[a-f0-9]{40}',b[key]): raise ValueError('unpinned-evaluation')
        if q['basis']=='reference-benchmark' and q['score']!=b['score']:raise ValueError('quality-reference-mismatch')
    for a in artifacts:
        if a['releaseId'] not in ids or a['quantization']!=FILE_TYPES.get(a['ggufFileType']) or not a['files'] or a['sizeBytes']!=sum(f['sizeBytes'] for f in a['files']): raise ValueError('invalid-artifact')
        release=next(r for r in releases if r['id']==a['releaseId'])
        if a.get('sourceModel')!=release['releaseIdentifier'] or not a.get('mappingVerification'):raise ValueError('unverified-artifact-model-mapping')
        if not re.fullmatch('[a-f0-9]{40}',a['revision']): raise ValueError('unpinned-artifact')
        for f in a['files']:
            if f['sizeBytes']<=0 or not re.fullmatch('[a-f0-9]{64}', f['sha256']) or '/'+a['revision']+'/' not in f['url']: raise ValueError('invalid-artifact-file')

def curate(candidate, policy):
    profiles={p['model']:p for p in json.loads((ROOT/'data/model-profiles.json').read_text())['profiles']}
    evidence=json.loads((ROOT/'data/reference-evaluations.json').read_text())
    previous={r['releaseIdentifier']:r for r in evidence}
    releases=[]; artifacts=[]; issues=list(candidate.get('importIssues',[]))
    def qualify(r):
        a=r['architecture']; variants=[v for v in candidate['artifacts'] if v['releaseId']==r['id']]
        if a['type'] not in SUPPORTED or (a.get('experts') or 0)>1: raise ValueError('unsupported-architecture: '+str(a['type']))
        meta=model_at(r['releaseIdentifier'],r['revision']); canonical=meta['id']
        r={**r,'releaseIdentifier':canonical}
        old=previous.get(canonical); b=None
        if old and (old['revision']==r['revision'] or compatible_identity(model_at(canonical,old['revision']),meta)):
            b=old['referenceQuality']
        p=profiles.get(canonical)
        if p:
            q={k:p[k] for k in ('score','basis','sourceUrl','asOf','note')}
            tasks=p['tasks']; task_source=p['taskSource']
        elif b:
            q={'score':b['score'],'basis':'reference-benchmark','sourceUrl':b['sourceUrl'],'asOf':b['retrievedAt'],
               'note':'Original-model IFEval/MMLU-Pro reference index; a different evidence basis from editorial ratings.'}
            name=r['name'].lower()
            tasks=['Coding'] if 'coder' in name else ['Chat']
            if 'deepseek-r1' in name: tasks.append('Reasoning')
            task_source=r['modelCardUrl']
        else: raise ValueError('no-reviewed-quality-input-for-exact-checkpoint')
        r.update(referenceQuality=b,qualityRating=q,tasks=tasks,taskSource=task_source,
                 downloadsLastMonth=meta.get('downloads'),releaseCreatedAt=meta.get('createdAt'),validationStatus='qualified',missingFields=[])
        expected={'mistral':'llama','phi':'phi2'}.get(a['type'],a['type'])
        for v in variants:
            conversion=model_at(v['repository'],v['revision'])
            base=(conversion.get('cardData') or {}).get('base_model')
            if isinstance(base,list):
                if len(base)!=1:raise ValueError('ambiguous-source-model-mapping')
                base=base[0]
            if not isinstance(base,str) or model_at(base,r['revision'])['id']!=canonical:raise ValueError('source-model-mapping-mismatch')
            m=v.get('ggufMetadata',{}); kind=m.get('general.architecture')
            if kind!=expected:raise ValueError('gguf-architecture-mismatch: '+str(kind))
            for suffix,key in [('.block_count','layers'),('.embedding_length','hiddenSize'),('.attention.head_count','attentionHeads'),('.attention.head_count_kv','kvHeads')]:
                if m.get(kind+suffix)!=a[key]:raise ValueError('gguf-source-shape-mismatch: '+key)
            if m.get(kind+'.attention.key_length',a['headDim'])!=a['headDim'] or m.get(kind+'.attention.value_length',a['headDim'])!=a['headDim']:
                raise ValueError('unequal-or-mismatched-key-value-dimensions')
            v['sourceModel']=canonical;v['mappingVerification']='pinned base_model declaration and matching GGUF architecture/dimensions'
        validate({'schemaVersion':3,'releases':[r],'artifacts':variants})
        return r,variants
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(qualify,r):r for r in candidate['releases']}
        for future in concurrent.futures.as_completed(jobs):
            r=jobs[future]
            try:
                release,variants=future.result();releases.append(release);artifacts.extend(variants)
                print('QUALIFIED',release['releaseIdentifier'],flush=True)
            except ValueError as e:
                issues.append({'repository':r['releaseIdentifier'],'reason':str(e)})
            except urllib.error.HTTPError as e:
                if e.code not in (401,403,404):raise
                issues.append({'repository':r['releaseIdentifier'],'reason':{401:'missing-credentials-or-gated-access',403:'permission-denied',404:'source-revision-unavailable'}[e.code]})
    snapshot={'schemaVersion':3,'importerVersion':'hf-gguf/3.0.0','retrievedAt':now(),
              'releases':sorted(releases,key=lambda r:(r['family'],r['name'])),
              'artifacts':sorted(artifacts,key=lambda a:(a['releaseId'],a['quantization'])),
              'importIssues':sorted(issues,key=lambda i:i['repository'])}
    validate(snapshot)
    return snapshot

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--candidates',type=Path,help='Already fetched metadata snapshot; still revalidates benchmark and source identities')
    p.add_argument('--output',type=Path,default=ROOT/'data/catalog.json')
    p.add_argument('--watch',action='store_true',help='Refresh every 24 hours; keep this server-side process running')
    args=p.parse_args()
    while True:
        CACHE.mkdir(parents=True,exist_ok=True)
        lock=CACHE/'refresh.lock'
        try: handle=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
        except FileExistsError:
            print('Another catalog refresh holds .cache/catalog/refresh.lock; catalog unchanged.',file=sys.stderr)
            return 1
        try:
            if args.candidates: candidate=json.loads(args.candidates.read_text())
            else:
                candidate={'releases':[],'artifacts':[],'importIssues':[]}
                sources=json.loads((ROOT/'data/sources.json').read_text())['repositories']
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    jobs={repo:pool.submit(normalize,repo) for repo in sorted(set(sources))}
                    for repo,future in jobs.items():
                        try:
                            r,variants=future.result()
                            if r['id'] not in {x['id'] for x in candidate['releases']}:
                                candidate['releases'].append(r);candidate['artifacts'].extend(variants)
                            print('METADATA',repo,flush=True)
                        except ValueError as e: candidate['importIssues'].append({'repository':repo,'reason':str(e)})
                        except urllib.error.HTTPError as e:
                            if e.code not in (401,403,404):raise
                            candidate['importIssues'].append({'repository':repo,'reason':{401:'missing-credentials-or-gated-access',403:'permission-denied',404:'repository-or-file-unavailable'}[e.code]})
            if args.output.exists():
                previous=json.loads(args.output.read_text())
                for r in previous.get('releases',[]):
                    if r['id'] not in {x['id'] for x in candidate['releases']}:
                        candidate['releases'].append(r)
                        candidate['artifacts'].extend(a for a in previous['artifacts'] if a['releaseId']==r['id'])
                        candidate['importIssues'].append({'repository':r['releaseIdentifier'],'reason':'Retained previously verified pinned artifacts; latest conversion unavailable. Revalidating source mapping.'})
            policy=json.loads((ROOT/'data/benchmark-policy.json').read_text())
            snapshot=curate(candidate,policy)
            CACHE.mkdir(parents=True,exist_ok=True)
            (CACHE/'last-attempt.json').write_text(json.dumps({'retrievedAt':now(),'releaseCount':len(snapshot['releases']),'issues':snapshot['importIssues']},indent=2))
            if args.output.exists():
                previous=json.loads(args.output.read_text())
                if previous.get('schemaVersion') in (2,3) and {r['id'] for r in previous['releases']}-{r['id'] for r in snapshot['releases']}:
                    raise ValueError('Refresh would lose previously qualified releases; review exclusions before publishing')
            args.output.parent.mkdir(parents=True,exist_ok=True)
            temp=args.output.with_suffix('.json.tmp');temp.write_text(json.dumps(snapshot,indent=2)+'\n');temp.replace(args.output)
            print('Published',len(snapshot['releases']),'releases,',len(snapshot['artifacts']),'variants;',len(snapshot['importIssues']),'excluded sources')
        except Exception as e:
            # Never print network exceptions: signed CDN URLs can contain credentials.
            print('Refresh rejected; last valid catalog retained. '+(str(e) if isinstance(e,ValueError) else type(e).__name__),file=sys.stderr)
            if not args.watch:return 1
        finally:
            os.close(handle)
            lock.unlink(missing_ok=True)
        if not args.watch:return 0
        time.sleep(86400)
if __name__=='__main__':sys.exit(main())
