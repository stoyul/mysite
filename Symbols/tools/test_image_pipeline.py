import unittest,tempfile,json,hashlib
from pathlib import Path
from PIL import Image
import prepare_images as pipeline
class Images(unittest.TestCase):
 def test_originals_preserved_and_aspect_ratio_no_upscale(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'data').mkdir();(root/'assets').mkdir();incoming=root/'incoming';incoming.mkdir();Image.new('RGB',(340,200),'white').save(root/'assets/current.jpg');(root/'data/symbols.json').write_text(json.dumps([{'id':'lemuria-01','imageCard':'assets/current.jpg'}]));original=(root/'assets/current.jpg').read_bytes();before=pipeline.P;pipeline.P=root
   try:
    pipeline.build();self.assertEqual((root/'assets/current.jpg').read_bytes(),original)
    # Non-square neutral fixture tests proportions without creating a symbol.
    Image.new('RGB',(2400,1677),'#efeae1').save(incoming/'lemuria-01.png');source=(incoming/'lemuria-01.png').read_bytes();m=pipeline.build(incoming=str(incoming))['lemuria-01'];self.assertEqual((root/m['original']).read_bytes(),source);self.assertEqual(m['originalSHA256'],hashlib.sha256(source).hexdigest());self.assertGreater(len(m['variants']),1)
    for v in m['variants']:
     with Image.open(root/v['src']) as im:self.assertEqual(im.width,v['width']);self.assertEqual(im.height,round(1677*im.width/2400));self.assertLessEqual(im.width,2400)
    self.assertEqual((root/'assets/current.jpg').read_bytes(),original)
    Image.new('RGB',(211,149),'white').save(incoming/'lemuria-01.png');m=pipeline.build(incoming=str(incoming))['lemuria-01'];self.assertEqual(m['variants'][0]['width'],211)
   finally:pipeline.P=before
if __name__=='__main__':unittest.main()
