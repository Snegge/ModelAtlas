import copy, io, json, struct, tempfile, unittest, urllib.request
from pathlib import Path
from unittest.mock import patch
from contextlib import redirect_stdout, redirect_stderr
import import_catalog as imp
import curate_catalog as cur

class ImporterTests(unittest.TestCase):
 def test_bounded_header_reads_quantization_after_tokenizer_array(self):
  def s(x):
   b=x.encode();return struct.pack('<Q',len(b))+b
  data=b'GGUF'+struct.pack('<IQQ',3,0,2)+s('tokenizer.ggml.tokens')+struct.pack('<IIQ',9,8,2)+s('first')+s('second')+s('general.file_type')+struct.pack('<II',4,7)
  self.assertEqual(imp.parse_header(data)['general.file_type'],7)
  with self.assertRaises(ValueError):imp.parse_header(b'not GGUF')
  with self.assertRaises(ValueError):imp.parse_header(b'GGUF'+struct.pack('<IQQ',3,0,0))
 def snapshot(self):return json.loads((imp.ROOT/'data/catalog.json').read_text())
 def test_every_published_variant_and_release_is_complete(self):
  snapshot=self.snapshot();cur.validate(snapshot)
  for r in snapshot['releases']:
   self.assertIn(r['qualityRating']['basis'],['reference-benchmark','external-curated'])
   if r.get('referenceQuality'):self.assertEqual(r['referenceQuality']['suite'],cur.SUITE)
  for a in snapshot['artifacts']:
   self.assertTrue(a['sourceModel']);self.assertIn('pinned',a['mappingVerification'])
 def test_missing_benchmark_unsupported_architecture_and_broken_files_reject(self):
  for change in [lambda c:c['releases'][0]['referenceQuality'].update(values=[.5]),
                 lambda c:c['releases'][0]['referenceQuality'].update(score=999),
                 lambda c:c['releases'][0]['architecture'].update(type='mamba'),
                 lambda c:c['artifacts'][0].update(sizeBytes=1),
                 lambda c:c['artifacts'][0].update(releaseId='missing'),
                 lambda c:c['artifacts'][0].update(sourceModel='different/model'),
                 lambda c:c['releases'][0]['referenceQuality'].update(conditionsHash='f'*64)]:
   c=self.snapshot();change(c)
   with self.assertRaises(ValueError):cur.validate(c)
 def test_model_identity_compares_all_weight_shards(self):
  a={'siblings':[{'rfilename':'model-1.safetensors','lfs':{'sha256':'a'}},{'rfilename':'model-2.safetensors','lfs':{'sha256':'b'}}]}
  self.assertTrue(cur.compatible_identity(a,copy.deepcopy(a)))
  b=copy.deepcopy(a);b['siblings'][1]['lfs']['sha256']='changed'
  self.assertFalse(cur.compatible_identity(a,b))
  with self.assertRaises(ValueError):cur.identity({'siblings':[]})
 def test_editorial_quality_is_explicit_and_never_fills_missing_benchmarks(self):
  c=self.snapshot();r=next(r for r in c['releases'] if r['qualityRating']['basis']=='external-curated' and not r.get('referenceQuality'))
  cur.validate(c)
  r['qualityRating']['basis']='reference-benchmark'
  with self.assertRaisesRegex(ValueError,'missing-reference-benchmark'):cur.validate(c)
  for change in [lambda r:r.update(qualityRating=None),lambda r:r['qualityRating'].update(score=float('nan')),lambda r:r.update(tasks=['Invented'])]:
   c=self.snapshot();change(c['releases'][0])
   with self.assertRaises(ValueError):cur.validate(c)
 def test_similar_checkpoint_name_cannot_inherit_editorial_rating(self):
  c=self.snapshot();r=copy.deepcopy(next(r for r in c['releases'] if r['releaseIdentifier']=='Qwen/Qwen3-8B'))
  candidate={'releases':[r],'artifacts':[a for a in c['artifacts'] if a['releaseId']==r['id']]}
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);(root/'data').mkdir()
   (root/'data/reference-evaluations.json').write_text('[]')
   (root/'data/model-profiles.json').write_text(json.dumps({'profiles':[{'model':'Qwen/Qwen3-8B-Different-Checkpoint'}]}))
   with patch.object(cur,'ROOT',root),patch.object(cur,'model_at',return_value={'id':r['releaseIdentifier']}):
    with self.assertRaisesRegex(ValueError,'empty-or-invalid-catalog'):cur.curate(candidate,{})
 def test_registry_pagination_and_failure_on_missing_page(self):
  pages=[{'rows':[{'row':{'fullname':'a/b','Flagged':False}}],'num_rows_total':2},{'rows':[{'row':{'fullname':'c/d','Flagged':False}}],'num_rows_total':2}]
  with patch.object(cur,'request_json',side_effect=pages) as get:
   self.assertEqual(len(cur.leaderboard_rows(['a/b','c/d'])),2)
   self.assertIn('offset=1',get.call_args[0][0])
  with patch.object(cur,'request_json',return_value={'rows':[],'num_rows_total':1}):
   with self.assertRaises(ValueError):cur.leaderboard_rows(['a/b'])
 def test_failed_import_cannot_replace_last_valid_catalog(self):
  with tempfile.TemporaryDirectory() as directory:
   output=Path(directory)/'catalog.json';before=(imp.ROOT/'data/catalog.json').read_bytes();output.write_bytes(before)
   candidate=Path(directory)/'candidates.json';candidate.write_bytes(before)
   with patch.object(cur,'CACHE',Path(directory)/'cache'),patch('sys.argv',['curate_catalog.py','--output',str(output),'--candidates',str(candidate)]),patch.object(cur,'curate',side_effect=ValueError('incomplete')),redirect_stderr(io.StringIO()):
    self.assertEqual(cur.main(),1)
   self.assertEqual(output.read_bytes(),before)
 def test_refresh_cannot_silently_lose_a_previously_qualified_release(self):
  with tempfile.TemporaryDirectory() as directory:
   output=Path(directory)/'catalog.json';before=(imp.ROOT/'data/catalog.json').read_bytes();output.write_bytes(before)
   candidate=Path(directory)/'candidates.json';candidate.write_bytes(before)
   reduced=self.snapshot();reduced['releases']=reduced['releases'][1:]
   with patch.object(cur,'CACHE',Path(directory)/'cache'),patch('sys.argv',['curate_catalog.py','--output',str(output),'--candidates',str(candidate)]),patch.object(cur,'curate',return_value=reduced),redirect_stderr(io.StringIO()):
    self.assertEqual(cur.main(),1)
   self.assertEqual(output.read_bytes(),before)
 def test_redirect_never_forwards_authentication(self):
  req=urllib.request.Request('https://huggingface.co/a/b',headers={'Authorization':'Bearer test-only'})
  redirect=imp.SafeRedirect().redirect_request(req,None,302,'',{},'https://cdn-lfs.hf.co/file')
  self.assertIsNone(redirect.get_header('Authorization'))
  with self.assertRaises(ValueError):imp.SafeRedirect().redirect_request(req,None,302,'',{},'https://untrusted.example/file')
 def test_existing_entry_point_always_uses_evidence_validation(self):
  with patch.object(cur,'main',return_value=7):self.assertEqual(imp.main(),7)
 def test_parallel_refresh_cannot_replace_another_process_lock(self):
  with tempfile.TemporaryDirectory() as directory,patch.object(cur,'CACHE',Path(directory)):
   lock=Path(directory)/'refresh.lock';lock.write_text('another process')
   with patch('sys.argv',['curate_catalog.py']),redirect_stderr(io.StringIO()):self.assertEqual(cur.main(),1)
   self.assertEqual(lock.read_text(),'another process')
 def test_source_mapping_must_be_unambiguous(self):
  for base in [None,[],['a/b','c/d']]:
   with patch.object(imp,'api',return_value={'sha':'a'*40,'cardData':{'base_model':base}}):
    with self.assertRaises(ValueError):imp.normalize('test/gguf')
if __name__=='__main__':unittest.main()
