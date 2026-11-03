#!/usr/bin/env python3
"""Strict preflight for multilingual public casting archives and rendered PDFs."""
from __future__ import annotations
import hashlib
import json
import sys
import zipfile
from pathlib import Path

import fitz
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'downloads'
DOCS_PER_LOCALE=9
IMAGES_PER_LOCALE=6
VERSION='2026.11.03'


def fail(message):
    raise RuntimeError(message)


def validate():
    catalog=json.loads((OUT/'catalog.json').read_text(encoding='utf8'))
    assert catalog['schema']=='pm-download-catalog/v1'
    assert catalog['version']==VERSION
    assert catalog['photoCount']==IMAGES_PER_LOCALE
    assert catalog['documentCount']==DOCS_PER_LOCALE
    for lang in ('ru','en','zh'):
        archive=OUT/f'Pavel_Markov_Casting_Kit_{lang.upper()}.zip'
        rec=catalog['locales'][lang]
        assert rec['bytes']==archive.stat().st_size
        assert rec['sha256']==hashlib.sha256(archive.read_bytes()).hexdigest()
        pdfs=[]
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None, 'archive is corrupt'
            assert len(z.namelist())==len(set(z.namelist()))
            assert len([n for n in z.namelist() if n.endswith('.webp')])==IMAGES_PER_LOCALE
            pdfs=[n for n in z.namelist() if n.endswith('.pdf')]
            assert len(pdfs)==DOCS_PER_LOCALE
            for name in pdfs:
                binary=z.read(name)
                assert binary.startswith(b'%PDF-'),name
                with fitz.open(stream=binary,filetype='pdf') as pdf:
                    assert pdf.page_count>=1,name
                    text=''.join(p.get_text() for p in pdf)
                    assert len(text)>25, 'scanned or unextractable PDF: '+name
                    assert '\ufffd' not in text, 'replacement glyph in '+name
                    if lang=='zh':
                        assert any('\u4e00'<=ch<='\u9fff' for ch in text), 'Chinese missing from '+name
            manifest_name=next(n for n in z.namelist() if n.endswith('/06_MANIFEST/manifest.json'))
            manifest=json.loads(z.read(manifest_name))
            assert manifest['locale']==lang and manifest['photo_count']==6
            prefix=manifest_name.rsplit('/06_MANIFEST/',1)[0]+'/'
            for entry in manifest['files']:
                assert hashlib.sha256(z.read(prefix+entry['path'])).hexdigest()==entry['sha256'],entry['path']
        for key in ('profilePdf','compPdf','parametersPdf','preview'):
            f=ROOT/rec[key].removeprefix('./')
            assert f.exists() and f.stat().st_size>1000,f
        img=Image.open(ROOT/rec['preview'].removeprefix('./'))
        assert img.width>=200 and img.height>=300
        print('OK',lang,archive.stat().st_size,'bytes,',len(pdfs),'PDFs, 6 images')
    complete=OUT/'Pavel_Markov_Complete_Archive.zip'
    rec=catalog['international']
    assert complete.stat().st_size==rec['bytes']
    assert hashlib.sha256(complete.read_bytes()).hexdigest()==rec['sha256']
    with zipfile.ZipFile(complete) as z:
        assert z.testzip() is None
        assert len([x for x in z.namelist() if x.endswith('.webp')])==6
        assert len([x for x in z.namelist() if x.endswith('.pdf')])==27
        assert sum(x.endswith('README.pdf') for x in z.namelist())==3
    print('OK international: 3 x 9 PDFs, 6 shared photos')

if __name__=='__main__':
    validate()
