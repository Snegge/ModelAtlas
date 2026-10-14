#!/usr/bin/env python3
"""Import public, revision-pinned HF metadata and bounded GGUF headers. No weights are downloaded."""
from __future__ import annotations
import argparse, concurrent.futures, datetime, hashlib, json, re, struct, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'hf-gguf/1.0.0'
MAX_HEADER = 8 * 1024 * 1024
INITIAL_HEADER = 512 * 1024
FILE_TYPES = {7: 'Q8_0', 15: 'Q4_K_M', 17: 'Q5_K_M', 18: 'Q6_K', 2: 'Q4_0', 10: 'Q2_K', 12: 'Q3_K_M'}
WANTED = {'Q4_K_M', 'Q8_0', 'Q5_K_M'}


def request_json(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'ModelAtlas-academic-catalog/1.0'}), timeout=35) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == 2: raise
            time.sleep(2 ** attempt)


def api(repo):
    return request_json('https://huggingface.co/api/models/' + urllib.parse.quote(repo, safe='/') + '?blobs=true')


def header(repo, revision, filename, require_quant=True):
    url = 'https://huggingface.co/' + repo + '/resolve/' + revision + '/' + urllib.parse.quote(filename, safe='/')
    for limit in (INITIAL_HEADER, MAX_HEADER):
        req = urllib.request.Request(url, headers={'Range': f'bytes=0-{limit - 1}', 'User-Agent': 'ModelAtlas-academic-catalog/1.0'})
        with urllib.request.urlopen(req, timeout=45) as r:
            # Reject ignored ranges before reading any weights.
            if r.status != 206: raise ValueError('Server did not honor bounded Range request')
            data = r.read(limit)
        try: return parse_header(data, require_quant)
        except ValueError as e:
            if limit == MAX_HEADER or 'Quantization absent' not in str(e): raise
    raise ValueError('GGUF header unavailable within bounded requests')



def parse_header(data, require_quant=True):
    pos = 0
    def unpack(fmt):
        nonlocal pos
        size = struct.calcsize(fmt)
        if pos + size > len(data): raise EOFError('GGUF metadata exceeds bounded header')
        value = struct.unpack_from(fmt, data, pos)[0]; pos += size
        return value
    def string():
        nonlocal pos
        size = unpack('<Q')
        if size > len(data) - pos: raise EOFError('GGUF string exceeds bounded header')
        value = data[pos:pos+size].decode('utf-8'); pos += size
        return value
    def value(kind):
        nonlocal pos
        fmts = {0:'<B',1:'<b',2:'<H',3:'<h',4:'<I',5:'<i',6:'<f',7:'<?',10:'<Q',11:'<q',12:'<d'}
        if kind in fmts: return unpack(fmts[kind])
        if kind == 8: return string()
        if kind == 9:
            subtype, count = unpack('<I'), unpack('<Q')
            if count > 500000: raise EOFError('Oversized GGUF array')
            for _ in range(count): value(subtype)
            return None
        raise ValueError('Unknown GGUF metadata type')
    if data[:4] != b'GGUF': raise ValueError('Invalid GGUF magic')
    pos = 4
    version = unpack('<I')
    if version not in (2,3): raise ValueError('Unsupported GGUF version')
    unpack('<Q'); count = unpack('<Q')
    fields = {}
    for _ in range(count):
        try:
            key = string(); kind = unpack('<I')
            v = value(kind)
            if v is not None and not key.startswith('tokenizer.'): fields[key] = v
        except EOFError:
            break
    if require_quant and 'general.file_type' not in fields: raise ValueError('Quantization absent from bounded GGUF metadata')
    return fields


def normalize(repo):
    meta = api(repo); revision = meta['sha']
    base = (meta.get('cardData') or {}).get('base_model')
    if isinstance(base, list):
        if len(base) != 1: raise ValueError('Ambiguous base model release')
        base = base[0]
    if not isinstance(base, str) or '/' not in base: raise ValueError('Missing verified base_model mapping')
    original = api(base)
    config_url = f"https://huggingface.co/{base}/resolve/{original['sha']}/config.json"
    config = None
    try:
        config = request_json(config_url)
    except urllib.error.HTTPError as e:
        if e.code != 401: raise
    text = config.get('text_config', config) if config else {}
    siblings = meta.get('siblings', [])
    groups = {}
    for s in siblings:
        name = s['rfilename']
        match = re.search(r'(Q4_K_M|Q8_0|Q5_K_M)(?:-\d{5}-of-\d{5})?\.gguf$', name)
        if not match: continue
        key = re.sub(r'-\d{5}-of-\d{5}(?=\.gguf$)', '', name)
        groups.setdefault(key, []).append(s)
    artifacts = []
    for key, files in sorted(groups.items()):
        files.sort(key=lambda f: f['rfilename'])
        shards = re.search(r'-(\d{5})-of-(\d{5})\.gguf$', files[0]['rfilename'])
        if shards:
            expected = int(shards[2])
            numbers = [int(re.search(r'-(\d{5})-of-', f['rfilename'])[1]) for f in files]
            if len(files) != expected or numbers != list(range(1, expected+1)):
                continue
        if any(not f.get('size') or not (f.get('lfs') or {}).get('sha256') for f in files): continue
        fields = header(repo, revision, files[0]['rfilename'])
        quant = FILE_TYPES.get(fields.get('general.file_type'))
        if quant not in WANTED: continue
        if shards and ((fields.get('split.no') is not None and fields['split.no'] != 0) or
                       (fields.get('split.count') is not None and fields['split.count'] != len(files))):
            raise ValueError('Primary GGUF shard indexes/counts disagree with complete file set')
        # Later GGUF shards may carry only split metadata, not general.file_type.
        # Verify their shard indexes/counts and any quantization metadata present.
        if len(files) > 1:
            for index, f in enumerate(files[1:], start=1):
                other = header(repo, revision, f['rfilename'], require_quant=False)
                if other.get('general.file_type') is not None and other['general.file_type'] != fields['general.file_type']:
                    raise ValueError('Mixed shard quantization')
                if other.get('split.no') != index or other.get('split.count') != len(files):
                    raise ValueError('GGUF shard indexes/counts disagree with complete file set')
        aid = 'a-' + hashlib.sha256((repo + '@' + revision + ':' + key).encode()).hexdigest()[:16]
        artifacts.append({
            'id': aid, 'releaseId': 'r-'+hashlib.sha256(base.encode()).hexdigest()[:12],
            'repository': repo, 'revision': revision, 'quantization': quant, 'ggufFileType': fields['general.file_type'],
            'format': 'GGUF', 'sizeBytes': sum(f['size'] for f in files),
            'files': [{'path':f['rfilename'], 'sizeBytes':f['size'], 'sha256':f['lfs']['sha256'],
                       'url':f"https://huggingface.co/{repo}/resolve/{revision}/{urllib.parse.quote(f['rfilename'],safe='/')}"} for f in files],
            'sourceUrl': f'https://huggingface.co/{repo}/tree/{revision}',
            'validationStatus': 'verified-metadata', 'missingFields': [],
            'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'ggufMetadata': {k:v for k,v in fields.items() if k in ['general.architecture','general.file_type','general.quantization_version','split.no','split.count'] or k.endswith(('.block_count','.context_length','.embedding_length','.attention.head_count','.attention.head_count_kv','.attention.key_length','.attention.value_length'))}
        })
        if len(artifacts) == 3: break
    if not artifacts: raise ValueError('No complete GGUF artifacts with verified quantization')
    fallback = artifacts[0]['ggufMetadata']
    gguf_arch = fallback.get('general.architecture')
    if config is None:
        text = {'model_type':gguf_arch, 'num_hidden_layers':fallback.get(f'{gguf_arch}.block_count'),
                'hidden_size':fallback.get(f'{gguf_arch}.embedding_length'),
                'num_attention_heads':fallback.get(f'{gguf_arch}.attention.head_count'),
                'num_key_value_heads':fallback.get(f'{gguf_arch}.attention.head_count_kv'),
                'head_dim':fallback.get(f'{gguf_arch}.attention.key_length'),
                'max_position_embeddings':fallback.get(f'{gguf_arch}.context_length')}
        config_url = artifacts[0]['files'][0]['url'] + '#bounded-gguf-metadata'
    architecture = text.get('model_type') or (config or {}).get('model_type')
    safetensors = original.get('safetensors') or {}
    params = safetensors.get('total') or (sum(safetensors.get('parameters', {}).values()) or None)
    experts = text.get('num_local_experts') or text.get('num_experts')
    # Active parameter totals are not reconstructed from expert counts.
    license_id = (original.get('cardData') or {}).get('license')
    if not isinstance(license_id,str): license_id = None
    hidden = text.get('hidden_size'); heads = text.get('num_attention_heads')
    arch = {'type': architecture, 'layers': text.get('num_hidden_layers'), 'hiddenSize': hidden,
            'attentionHeads': heads, 'kvHeads':text.get('num_key_value_heads',heads),
            'headDim': text.get('head_dim') or (hidden//heads if hidden and heads and hidden % heads == 0 else None),
            'experts': experts, 'expertsPerToken':text.get('num_experts_per_tok'),
            'slidingWindow':text.get('sliding_window'), 'sourceUrl':config_url}
    tuning = True if any(s in base.split('/')[1].lower() for s in ['instruct','-it','chat']) else None
    missing = [k for k,v in {'instructionTuned':tuning,'totalParameters':params,'license':license_id,'contextLimit':text.get('max_position_embeddings'), **({'activeParameters':None} if experts else {}), **{f'architecture.{k}':arch[k] for k in ['type','layers','kvHeads','headDim']}}.items() if v is None]
    name = base.split('/')[1]
    low = name.lower()
    family = 'DeepSeek' if 'deepseek' in low else 'Llama' if 'llama' in low else 'Qwen' if 'qwen' in low else 'Gemma' if 'gemma' in low else 'Mistral' if any(s in low for s in ['mistral','ministral','mixtral']) else 'Phi' if 'phi' in low else base.split('/')[0]
    release = {'id':artifacts[0]['releaseId'], 'name':name, 'publisher':base.split('/')[0], 'family':family,
               'releaseIdentifier':base, 'instructionTuned':tuning,
               'totalParameters':params, 'activeParameters':None, 'architecture':arch,
               'contextLimit':text.get('max_position_embeddings'), 'contextSource':'model-config' if config is not None else 'artifact-gguf-header', 'license':license_id,
               'licenseUrl':f"https://huggingface.co/{base}/tree/{original['sha']}",
               'modelCardUrl':f"https://huggingface.co/{base}/blob/{original['sha']}/README.md",
               'revision':original['sha'], 'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'validationStatus':'verified-metadata' if not missing else 'incomplete-metadata', 'missingFields':missing}
    return release, artifacts


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--sources',type=Path,default=ROOT/'data/sources.json')
    p.add_argument('--output',type=Path,default=ROOT/'data/catalog.json')
    p.add_argument('--workers',type=int,default=4)
    args=p.parse_args(); sources=json.loads(args.sources.read_text())['repositories']
    releases, artifacts, issues = {}, [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1,min(args.workers,8))) as pool:
        futures={pool.submit(normalize,s):s for s in sources}
        for future in concurrent.futures.as_completed(futures):
            repo=futures[future]
            try:
                release, variants=future.result()
                if release['id'] in releases: continue
                releases[release['id']]=release; artifacts.extend(variants)
                print(f"OK {repo}: {len(variants)} verified artifacts",flush=True)
            except Exception as e:
                message = str(e)
                # Do not log signed redirect URLs.
                if 'https://' in message: message=type(e).__name__
                issues.append({'repository':repo,'reason':message})
                print(f"SKIP {repo}: {message}",flush=True)
    previous=json.loads(args.output.read_text()) if args.output.exists() else None
    missing_previous = {r['id'] for r in previous['releases']} - set(releases) if previous else set()
    if len(releases)<20 or missing_previous:
        print('Refresh rejected: incomplete coverage. Last valid snapshot unchanged.',file=sys.stderr); return 1
    if any('403' in i['reason'] or '429' in i['reason'] or 'Tunnel' in i['reason'] for i in issues):
        print('Refresh rejected: access/rate-limit failure. Last valid snapshot unchanged.',file=sys.stderr); return 1
    snapshot={'schemaVersion':1,'importerVersion':VERSION,'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'releases':sorted(releases.values(),key=lambda r:(r['family'],r['name'])),
              'artifacts':sorted(artifacts,key=lambda a:(a['releaseId'],a['quantization'])), 'importIssues':issues}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    temporary=args.output.with_suffix('.json.tmp'); temporary.write_text(json.dumps(snapshot,indent=2)+'\n'); temporary.replace(args.output)
    print(f"Saved {len(releases)} releases, {len(artifacts)} artifacts, {len(set(r['family'] for r in releases.values()))} families. {len(issues)} unavailable sources.")
    return 0

if __name__=='__main__': sys.exit(main())
