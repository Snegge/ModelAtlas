import importlib.util, json, struct, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('importer',Path(__file__).with_name('import_catalog.py'))
imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
class ImporterTests(unittest.TestCase):
 def test_bounded_header_reads_actual_quantization(self):
  def s(x):
   v=x.encode();return struct.pack('<Q',len(v))+v
  header=b'GGUF'+struct.pack('<IQQ',3,0,2)+s('general.architecture')+struct.pack('<I',8)+s('llama')+s('general.file_type')+struct.pack('<II',4,15)
  metadata=imp.parse_header(header)
  self.assertEqual(metadata['general.architecture'],'llama');self.assertEqual(imp.FILE_TYPES[metadata['general.file_type']],'Q4_K_M')
 def test_quantization_after_tokenizer_arrays_is_read(self):
  def s(x):
   b=x.encode();return struct.pack('<Q',len(b))+b
  data=b'GGUF'+struct.pack('<IQQ',3,0,2)+s('tokenizer.ggml.tokens')+struct.pack('<IIQ',9,8,2)+s('first')+s('second')+s('general.file_type')+struct.pack('<II',4,7)
  self.assertEqual(imp.parse_header(data)['general.file_type'],7)
 def test_missing_or_invalid_quantization_is_rejected(self):
  with self.assertRaises(ValueError):imp.parse_header(b'not GGUF')
  with self.assertRaises(ValueError):imp.parse_header(b'GGUF'+struct.pack('<IQQ',3,0,0))
 def test_real_snapshot_complete_file_sets(self):
  snapshot=json.loads((imp.ROOT/'data/catalog.json').read_text())
  ids={r['id'] for r in snapshot['releases']}
  for a in snapshot['artifacts']:
   self.assertIn(a['releaseId'],ids);self.assertEqual(a['sizeBytes'],sum(f['sizeBytes'] for f in a['files']))
   self.assertEqual(a['quantization'],imp.FILE_TYPES[a['ggufFileType']]);self.assertEqual(len(a['revision']),40)
 def test_failed_refresh_preserves_last_valid_snapshot(self):
  from unittest.mock import patch
  from contextlib import redirect_stdout, redirect_stderr
  import io, sys
  with tempfile.TemporaryDirectory() as d:
   output=Path(d)/'catalog.json';sources=Path(d)/'sources.json'
   before=(imp.ROOT/'data/catalog.json').read_bytes();output.write_bytes(before)
   sources.write_text(json.dumps({'repositories':['test/absent']}))
   with patch.object(sys,'argv',['import_catalog.py','--sources',str(sources),'--output',str(output)]), patch.object(imp,'normalize',side_effect=ValueError('Unavailable source')), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
    self.assertEqual(imp.main(),1)
   self.assertEqual(output.read_bytes(),before)
 def run_extension(self, results, minimum):
  from unittest.mock import patch
  from contextlib import redirect_stdout, redirect_stderr
  import io, sys
  with tempfile.TemporaryDirectory() as d:
   output=Path(d)/'catalog.json';sources=Path(d)/'sources.json'
   before=(imp.ROOT/'data/catalog.json').read_bytes();output.write_bytes(before)
   sources.write_text(json.dumps({'repositories':list(results)}))
   def normalize(repo):
    result=results[repo]
    if isinstance(result,Exception): raise result
    return result
   with patch.object(sys,'argv',['import_catalog.py','--extend','--minimum-releases',str(minimum),'--sources',str(sources),'--output',str(output)]), patch.object(imp,'normalize',side_effect=normalize), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
    status=imp.main()
   return status,before,output.read_bytes()
 def test_extension_preserves_pinned_records_and_deduplicates_releases(self):
  old=json.loads((imp.ROOT/'data/catalog.json').read_text())
  release={**old['releases'][0],'id':'r-added','name':'New release'}
  artifact={**old['artifacts'][0],'id':'a-added','releaseId':'r-added','repository':'test/addition'}
  replacement={**old['releases'][0],'revision':'should-not-replace-existing'}
  status,before,after=self.run_extension({
   'test/addition':(release,[artifact]),
   'test/duplicate-new':(release,[{**artifact,'id':'a-duplicate'}]),
   'test/duplicate-old':(replacement,[])
  },len(old['releases'])+1)
  self.assertEqual(status,0)
  new=json.loads(after)
  self.assertEqual(len(new['releases']),len(old['releases'])+1)
  self.assertEqual(len(new['artifacts']),len(old['artifacts'])+1)
  for record in old['releases']: self.assertIn(record,new['releases'])
  for record in old['artifacts']: self.assertIn(record,new['artifacts'])
  self.assertIn(artifact,new['artifacts'])
 def test_failed_extension_cannot_meet_target_by_retaining_old_records(self):
  old=json.loads((imp.ROOT/'data/catalog.json').read_text())
  status,before,after=self.run_extension({'test/missing':ValueError('Missing verified base_model mapping')},len(old['releases'])+1)
  self.assertEqual(status,1);self.assertEqual(before,after)
 def test_extension_access_failure_preserves_snapshot_even_with_enough_releases(self):
  status,before,after=self.run_extension({'test/blocked':ValueError('HTTP Error 403: Forbidden')},20)
  self.assertEqual(status,1);self.assertEqual(before,after)
if __name__=='__main__':unittest.main()
