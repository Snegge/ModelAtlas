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
if __name__=='__main__':unittest.main()
