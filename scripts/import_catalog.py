#!/usr/bin/env python3
"""Import public, revision-pinned HF metadata and bounded GGUF headers. No weights are downloaded."""
from __future__ import annotations
import argparse, concurrent.futures, datetime, hashlib, json, re, struct, sys, time, urllib.error, urllib.parse, urllib.request, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'hf-gguf/2.0.0'
MAX_HEADER = 8 * 1024 * 1024
INITIAL_HEADER = 512 * 1024
FILE_TYPES = {7: 'Q8_0', 15: 'Q4_K_M', 17: 'Q5_K_M', 18: 'Q6_K', 2: 'Q4_0', 10: 'Q2_K', 12: 'Q3_K_M'}
WANTED = {'Q4_K_M', 'Q8_0', 'Q5_K_M'}
CACHE = ROOT / '.cache/catalog'

def token():
    value = os.environ.get('HuggingFace__Token')
    if value: return value
    base = Path(os.environ['APPDATA']) / 'Microsoft/UserSecrets' if os.environ.get('APPDATA') else Path.home() / '.microsoft/usersecrets'
    path = base / 'ModelAtlas-HuggingFace-local/secrets.json'
    if not path.exists(): return None
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    return data.get('HuggingFace:Token') or data.get('HuggingFace', {}).get('Token')

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        host = urllib.parse.urlparse(newurl).hostname or ''
        if not newurl.startswith('https://') or not (host == 'huggingface.co' or host.endswith(('.huggingface.co', '.hf.co', '.xethub.hf.co'))):
            raise ValueError('Untrusted metadata redirect')
        redirect = super().redirect_request(req, fp, code, msg, headers, newurl)
        redirect.remove_header('Authorization')
        return redirect

def open_public(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent':'ModelAtlas-catalog/2.0', **(headers or {})})
    if urllib.parse.urlparse(url).hostname == 'huggingface.co' and (secret := token()):
        req.add_unredirected_header('Authorization', 'Bearer ' + secret)
    return urllib.request.build_opener(SafeRedirect()).open(req, timeout=45)


def request_json(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / (hashlib.sha256(url.encode()).hexdigest()+'.json')
    if path.exists() and time.time()-path.stat().st_mtime < 86400:
        return json.loads(path.read_text(encoding='utf-8'))
    for attempt in range(3):
        try:
            with open_public(url) as r:
                raw = r.read(64*1024*1024+1)
                if len(raw)>64*1024*1024: raise ValueError('Metadata response exceeds limit')
                data = json.loads(raw)
                temporary = path.with_suffix('.tmp'); temporary.write_bytes(raw); temporary.replace(path)
                return data
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or attempt == 2: raise
            retry=e.headers.get('Retry-After','') if e.headers else ''
            time.sleep(min(60,int(retry)) if retry.isdigit() else 2 ** attempt)


def api(repo):
    return request_json('https://huggingface.co/api/models/' + urllib.parse.quote(repo, safe='/') + '?blobs=true')


def header(repo, revision, filename, require_quant=True):
    url = 'https://huggingface.co/' + repo + '/resolve/' + revision + '/' + urllib.parse.quote(filename, safe='/')
    CACHE.mkdir(parents=True, exist_ok=True)
    cached = CACHE / ('gguf-'+hashlib.sha256(url.encode()).hexdigest()+'.json')
    if cached.exists():
        fields=json.loads(cached.read_text(encoding='utf-8'))
        if not require_quant or 'general.file_type' in fields:return fields
    for limit in (INITIAL_HEADER, MAX_HEADER):
        with open_public(url, {'Range': f'bytes=0-{limit - 1}'}) as r:
            # Reject ignored ranges before reading any weights.
            if r.status != 206: raise ValueError('Server did not honor bounded Range request')
            data = r.read(limit)
        try:
            fields=parse_header(data, require_quant)
            cached.write_text(json.dumps(fields),encoding='utf-8')
            return fields
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
        if e.code not in (401,403): raise
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
    family = next((label for tokens, label in [
        (['deepseek'], 'DeepSeek'), (['nemotron'], 'Nemotron'), (['llama'], 'Llama'),
        (['qwen'], 'Qwen'), (['gemma'], 'Gemma'),
        (['mistral','ministral','mixtral','magistral','devstral'], 'Mistral'),
        (['phi'], 'Phi'), (['smollm'], 'SmolLM'), (['granite'], 'Granite'),
        (['olmo'], 'OLMo'), (['falcon'], 'Falcon'), (['exaone'], 'EXAONE'),
        (['apertus'], 'Apertus'), (['lfm2'], 'LFM'), (['gpt-oss'], 'GPT-OSS'),
        (['glm'], 'GLM')
    ] if any(token in low for token in tokens)), base.split('/')[0])
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
    # Keep the established entry point; publication always passes the evidence gate.
    from curate_catalog import main as curate
    return curate()

if __name__=='__main__': sys.exit(main())
