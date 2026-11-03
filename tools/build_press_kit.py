#!/usr/bin/env python3
"""Reproducible, owner-authored multilingual press kit for a static GitHub Pages site.

Builds nine actual vector/text PDFs and a ZIP for each locale, plus a deduplicated
international ZIP. The only source for biographical and photographic facts is the
site's own data/* JS; no agency credits, digitals, or unverifiable awards are added.

Dependencies: reportlab, pillow, fonttools[brotli]. No API keys or paid services.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image, ImageOps
from fontTools.ttLib import TTFont as FontToolsTTFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent.parent
CATALOG_VERSION = "2026.11.03"
ISSUED = "2026-11-03"
A4_W, A4_H = A4
LEFT = 39
RIGHT = A4_W - LEFT
PAGE_W = RIGHT - LEFT
DEFAULT_OUTPUT = ROOT / 'downloads'
FONT_CACHE = None
COLOR = {
    'ru': {'paper': '#F5F1E9', 'ink':'#1A1919', 'accent':'#812D39', 'muted':'#695B58', 'soft':'#D9CFC1'},
    'en': {'paper': '#F5F6F3', 'ink':'#192027', 'accent':'#2852D5', 'muted':'#5C666D', 'soft':'#CED3DB'},
    'zh': {'paper': '#F1E5D5', 'ink':'#2C2220', 'accent':'#923D31', 'muted':'#72584A', 'soft':'#D6C2A9'},
}
PHOTOS = [
    ('portrait-fashion.webp','Fashion_Editorial','01 / FASHION'),
    ('portrait-digital.webp','Portraits','02 / PORTRAIT'),
    ('portrait-athletic.webp','Athletic','03 / ATHLETIC'),
    ('portrait-stage.webp','Other_Archive','04 / STAGE, 2022'),
    ('portrait-character.webp','Character','05 / CHARACTER'),
    ('editorial-markovmade.webp','Fashion_Editorial','06 / CLASSIC'),
]

# Purpose-built document copy. Public claims remain conservative, with real archive labels.
COPY = {
'ru': {
 'edition':'РУССКАЯ РЕДАКЦИЯ', 'kit':'КАСТИНГ / МЕДИА-КИТ', 'cover':'ПАВЕЛ\nМАРКОВ',
 'role':'Модель · атлетический типаж · работа в кадре', 'meta':'188 СМ     /     БЕЛАРУСЬ     /     2026',
 'start':'НАЧНИТЕ ОТСЮДА', 'intro':'Подборка настоящих фотографий из личного архива, подтверждённые параметры и контакты для обсуждения съёмок.',
 'arch_note':'Фотографии относятся к личному архиву и не являются актуальными неотретушированными агентскими digitals.',
 'profile':'ПРОФИЛЬ ДЛЯ КАСТИНГА', 'profile_sub':'Основная информация для предварительного отбора',
 'specs':'ПАРАМЕТРЫ', 'available':'ПОДХОДЯЩИЕ НАПРАВЛЕНИЯ',
 'brief':'Более 14 лет спортивной практики, работа тренером, собственные видеосъёмки и опыт публичных выступлений. Открыт к модным, рекламным и экранным проектам.',
 'bio_title':'ЗА КАДРОМ', 'bio_body':'Я работаю с движением, камерой и людьми. Спортивная практика научила меня контролю тела и вниманию к деталям, а создание контента и работа тренером — уверенному общению и подаче. Мне интересны проекты, в которых внешность дополняется характером.',
 'looks':'ПОДБОРКА ОБРАЗОВ', 'contact':'ПРЯМОЙ КОНТАКТ', 'contact_intro':'Для обсуждения проекта укажите формат съёмки, роль, город и предполагаемые даты.',
 'photos':'ФОТОГРАФИИ', 'sheet':'КОНТАКТНЫЙ ЛИСТ', 'comp':'КОМПОЗИТНАЯ КАРТОЧКА',
 'usage':'ИСПОЛЬЗОВАНИЕ МАТЕРИАЛОВ', 'usage_body':'Фотографии предоставляются для ознакомления с внешностью и предварительного обсуждения кастинга. Права на коммерческую публикацию, рекламное использование, переработку и распространение определяются отдельно с правообладателем. Стилизованные архивные фотографии не являются актуальными casting digitals.',
 'source':'ЛИЧНЫЙ АРХИВ / НЕ АКТУАЛЬНЫЕ DIGITALS', 'estimated':'ориентировочно, уточняется перед съёмкой',
 'height':'Рост', 'weight':'Вес', 'waist':'Талия', 'age':'Возраст', 'eyes':'Глаза', 'hair':'Волосы', 'beard':'Борода', 'build':'Телосложение', 'base':'Локация',
 'brown':'карие', 'dark':'тёмные', 'athletic':'атлетическое', 'belarus':'Беларусь',
 'unknown':'Не подтверждено', 'names':'ОДИН ЧЕЛОВЕК. РАЗНЫЕ ОБРАЗЫ.',
 'closing':'ДО ВСТРЕЧИ В КАДРЕ.', 'short_note':'Исходные снимки: без генерации, без изменения лица, архивные.',
 'full':'ПОЛНОЕ МЕЖДУНАРОДНОЕ ДОСЬЕ', 'edition_file':'Файлы и документы этой редакции',
 'sections':'СОДЕРЖИМОЕ КОМПЛЕКТА', 'vintage':'Личный архив',
 'directions':'Fashion / Editorial · Athletic / Fitness · Commercial / Lifestyle · Character / Cinematic · On-camera',
},
'en': {
 'edition':'INTERNATIONAL EDITION', 'kit':'CASTING / MEDIA KIT', 'cover':'PAVEL\nMARKOV',
 'role':'Model · athletic presence · on-camera talent', 'meta':'188 CM     /     BELARUS     /     2026',
 'start':'START HERE', 'intro':'A carefully selected collection of authentic personal-archive photographs, verified casting details and direct enquiry contacts.',
 'arch_note':'These photographs come from the personal archive and are not recent unretouched agency casting digitals.',
 'profile':'CASTING PROFILE', 'profile_sub':'Essential details for initial selection',
 'specs':'MEASUREMENTS', 'available':'POTENTIAL CASTING DIRECTIONS',
 'brief':'Over 14 years of sporting practice, personal training work, independent video production and public speaking. Available for fashion, commercial and screen auditions.',
 'bio_title':'BEYOND THE FRAME', 'bio_body':'I work with movement, the camera and people. Sporting practice developed physical control and an eye for detail; creating video and working as a trainer developed a confident, natural delivery. I am interested in projects where a distinct look meets real character.',
 'looks':'SELECTED LOOKS', 'contact':'DIRECT ENQUIRIES', 'contact_intro':'Please include the project type, role, shoot location and proposed dates.',
 'photos':'PHOTOGRAPHS', 'sheet':'CONTACT SHEET', 'comp':'COMPOSITE CARD',
 'usage':'IMAGE USAGE NOTES', 'usage_body':'Photographs are supplied for personal evaluation and preliminary casting discussion. Commercial publication, advertising use, adaptation and onward distribution require separate agreement with the relevant rights holder. Styled archival photos are not current casting digitals.',
 'source':'PERSONAL ARCHIVE / NOT CURRENT DIGITALS', 'estimated':'estimated; to be confirmed before booking',
 'height':'Height', 'weight':'Weight', 'waist':'Waist', 'age':'Age', 'eyes':'Eyes', 'hair':'Hair', 'beard':'Beard', 'build':'Build', 'base':'Based',
 'brown':'brown', 'dark':'dark', 'athletic':'athletic', 'belarus':'Belarus',
 'unknown':'Not verified', 'names':'ONE PERSON. MULTIPLE LOOKS.',
 'closing':'SEE YOU ON SET.', 'short_note':'Authentic source archive. No synthetic faces or fabricated credits.',
 'full':'COMPLETE INTERNATIONAL DOSSIER', 'edition_file':'Files and documents in this edition',
 'sections':'KIT CONTENTS', 'vintage':'Personal archive',
 'directions':'Fashion / Editorial · Athletic / Fitness · Commercial / Lifestyle · Character / Cinematic · On-camera',
},
'zh': {
 'edition':'中文版 / 简体中文', 'kit':'模特选角 / 媒体资料', 'cover':'帕维尔\n马尔科夫',
 'role':'模特 · 运动型体格 · 镜头表现', 'meta':'188 CM     /     白俄罗斯     /     2026',
 'start':'从这里开始', 'intro':'真实的个人照片档案、选角基本参数和直接联系信息。',
 'arch_note':'照片来自个人档案，不代表近期未经修饰的专业选角照片。',
 'profile':'选角资料', 'profile_sub':'供初步选角参考的基本信息',
 'specs':'主要参数', 'available':'拍摄方向',
 'brief':'拥有十四年以上的运动实践，也有健身教练、视频内容创作和公开演讲经验。可洽谈时尚、广告和影视试镜。',
 'bio_title':'镜头之外', 'bio_body':'运动是我的起点，也让我更关注动作和细节。作为教练和视频创作者，我习惯与人沟通，愿意参与需要运动型外形、人物气质和自然表现的项目。',
 'looks':'精选形象', 'contact':'直接联系', 'contact_intro':'请提供拍摄项目、角色、城市和日期。',
 'photos':'照片档案', 'sheet':'照片一览', 'comp':'选角资料卡',
 'usage':'照片使用说明', 'usage_body':'照片可用于初步选角参考和合作沟通。商业发布、广告使用、修改及再次传播需要与相应权利人另行确认。档案照片不是近期选角照片。',
 'source':'个人档案 / 非近期选角照', 'estimated':'参考数据，拍摄前请确认',
 'height':'身高', 'weight':'体重', 'waist':'腰围', 'age':'年龄', 'eyes':'眼睛', 'hair':'头发', 'beard':'胡须', 'build':'体格', 'base':'所在地',
 'brown':'棕色', 'dark':'深色', 'athletic':'运动型', 'belarus':'白俄罗斯',
 'unknown':'暂未确认', 'names':'同一个人 / 不同形象',
 'closing':'期待合作。', 'short_note':'真实个人档案，不使用生成面孔或虚构经历。',
 'full':'国际选角资料', 'edition_file':'本语言版本的文件及资料',
 'sections':'资料内容', 'vintage':'个人档案',
 'directions':'时尚拍摄 · 运动广告 · 生活方式 · 人物造型 · 镜头表现',
}}


def load_data():
    """Read authoritative site data, never duplicate mutable model parameters."""
    js = r'''global.window={};require('./data/profile.js');require('./data/media.js');require('./data/i18n.js');process.stdout.write(JSON.stringify({profile:window.MODEL_PROFILE,archive:window.MODEL_ARCHIVE,i18n:window.MODEL_I18N}));'''
    out = subprocess.check_output(['node', '-e', js], cwd=ROOT, text=True)
    return json.loads(out)


def fonts():
    global FONT_CACHE
    if FONT_CACHE:
        return FONT_CACHE
    cache = Path(tempfile.mkdtemp(prefix='pm-fonts-'))
    # Existing locally hosted (OFL-licensed) CJK font. Converted only inside build cache.
    for name in ['Sans', 'Serif']:
        original = ROOT / 'assets' / 'fonts' / ('Noto'+name+'SC-subset.woff2')
        font = FontToolsTTFont(original)
        font.flavor = None
        if 'fvar' in font:
            instantiateVariableFont(font, {'wght':400}, inplace=True)
        target = cache / ('PM'+name+'.ttf')
        font.save(target)
        font.close()
        pdfmetrics.registerFont(TTFont('PM'+name, str(target)))
    fonts = [
        ('PMSans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),
        ('PMBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    ]
    for label,path in fonts:
        if not Path(path).exists():
            raise FileNotFoundError('System font missing: '+path)
        pdfmetrics.registerFont(TTFont(label,path))
    # Full CJK coverage for the additional PDF-only phrases. Ubuntu CI installs
    # fonts-arphic-gbsn00lp; no heavy CJK web-font download is introduced.
    fallback = Path('/usr/share/fonts/truetype/arphic-gbsn00lp/gbsn00lp.ttf')
    if fallback.exists():
        pdfmetrics.registerFont(TTFont('PMChineseFallback',str(fallback)))
    else:
        raise FileNotFoundError('CJK PDF font missing: install fonts-arphic-gbsn00lp')
    FONT_CACHE = {'cache':cache}
    return FONT_CACHE


def cmap_of(name):
    # reportlab reports character mappings on _ttf's subset; direct check from source
    src = ROOT/'assets/fonts'/('NotoSerifSC-subset.woff2' if name=='PMSerif' else 'NotoSansSC-subset.woff2')
    with FontToolsTTFont(src) as f:
        return set(f.getBestCmap().keys())


def paint(c, lang):
    p=COLOR[lang]
    c.setFillColor(HexColor(p['paper']))
    c.rect(0,0,A4_W,A4_H,stroke=0,fill=1)
    return p


def font_for(lang, text, display=False, bold=False):
    if lang != 'zh': return 'PMBold' if bold else 'PMSans'
    base='PMSerif' if display else 'PMSans'
    supported=MAPS['serif' if display else 'sans']
    if any(ord(ch)>=0x3000 and ord(ch) not in supported for ch in str(text)):
        return 'PMChineseFallback'
    return base


def wrap_text(text, font, size, width):
    """Metrics-based wrapping for Russian and Chinese, including long words."""
    blocks=[]
    for part in str(text).split('\n'):
        if not part:
            blocks.append('');continue
        is_cjk = any('\u3400'<=ch<='\u9fff' for ch in part)
        chunks=list(part) if is_cjk else re.findall(r'\S+\s*',part)
        line=''
        for chunk in chunks:
            trial=line+chunk
            if pdfmetrics.stringWidth(trial,font,size)<=width or not line:
                line=trial;continue
            blocks.append(line.strip());line=chunk.lstrip()
        if line:blocks.append(line.strip())
    return blocks


def txt(c,lang,text,x,y,size=12,max_width=None,leading=None,bold=False,display=False,color=None,max_lines=None):
    f=font_for(lang,text,display,bold)
    c.setFont(f,size)
    c.setFillColor(HexColor(color or COLOR[lang]['ink']))
    lines=wrap_text(text,f,size,max_width) if max_width else str(text).split('\n')
    if max_lines:lines=lines[:max_lines]
    leading=leading or size*1.48
    for line in lines:
        c.drawString(x,y,line)
        y-=leading
    return y


def hairline(c,x1,y1,x2,y2,hex_color,lw=.55):
    c.setStrokeColor(HexColor(hex_color));c.setLineWidth(lw);c.line(x1,y1,x2,y2)


def head(c,lang,doc,index):
    p=paint(c,lang)
    txt(c,lang,'P / M .',LEFT,A4_H-39,15,bold=True)
    txt(c,lang,doc.upper() if lang!='zh' else doc,LEFT+103,A4_H-38,9,color=p['muted'])
    txt(c,lang,COPY[lang]['edition'],A4_W-190,A4_H-38,8,color=p['accent'])
    hairline(c,LEFT,A4_H-54,RIGHT,A4_H-54,p['soft'])
    hairline(c,LEFT,43,RIGHT,43,p['soft'])
    txt(c,lang,'PAVEL MARKOV / THE HUMAN FRAME',LEFT,28,7.2,bold=True,color=p['muted'])
    c.setFont('PMSans',7.3);c.setFillColor(HexColor(p['muted']))
    c.drawRightString(RIGHT,28,f'{index:02d} / 2026')
    return p


def jpeg_for(path, width, height, focus=(.5,.4), qual=83):
    im=Image.open(path).convert('RGB')
    ratio=width/height
    if im.width/im.height>ratio:
        crop_w=int(im.height*ratio)
        left=max(0,min(im.width-crop_w,int((im.width-crop_w)*focus[0])))
        im=im.crop((left,0,left+crop_w,im.height))
    else:
        crop_h=int(im.width/ratio)
        top=max(0,min(im.height-crop_h,int((im.height-crop_h)*focus[1])))
        im=im.crop((0,top,im.width,top+crop_h))
    scale=min(1.0,1400/max(im.size))
    if scale<1:im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
    b=io.BytesIO();im.save(b,format='JPEG',quality=qual,optimize=True,subsampling=0)
    b.seek(0);return ImageReader(b)


def image(c,path,x,y,w,h,focus=(.5,.4)):
    c.drawImage(jpeg_for(path,w,h,focus),x,y,width=w,height=h,mask='auto')


def new_pdf(path,lang,title):
    path.parent.mkdir(parents=True,exist_ok=True)
    c=canvas.Canvas(str(path),pagesize=A4,pageCompression=1,invariant=1)
    c.setAuthor('Pavel Markov')
    c.setTitle(f'Pavel Markov - {title} - {lang.upper()}')
    c.setSubject('Personal archive casting materials - not current agency digitals')
    return c


def decorate_label(c,lang,text,x,y):
    p=COLOR[lang]
    c.setFillColor(HexColor(p['accent']))
    c.rect(x,y-2,18,2,fill=1,stroke=0)
    return txt(c,lang,text,x+25,y-3,9,bold=True,color=p['accent'])


def draw_cover(path,lang,profile):
    c=new_pdf(path,lang,'Start Here');p=paint(c,lang)
    image(c,ROOT/'assets/portrait-fashion.webp',A4_W*.41,0,A4_W*.59,A4_H,focus=(.48,.3))
    c.setFillColor(HexColor(p['paper']));c.rect(0,0,A4_W*.425,A4_H,fill=1,stroke=0)
    txt(c,lang,'P / M .',LEFT,A4_H-56,18,bold=True)
    hairline(c,LEFT,A4_H-75,A4_W*.41-20,A4_H-75,p['soft'])
    txt(c,lang,COPY[lang]['kit'],LEFT,A4_H-129,10,color=p['accent'],bold=True)
    name=COPY[lang]['cover']
    fs=39 if lang=='zh' else 46
    yy=txt(c,lang,name,LEFT,A4_H-193,fs,leading=fs*1.14,display=(lang=='zh'),bold=(lang!='zh'))
    txt(c,lang,COPY[lang]['role'],LEFT,yy-31,11,max_width=A4_W*.34,leading=18)
    hairline(c,LEFT,285,A4_W*.41-20,285,p['soft'])
    txt(c,lang,COPY[lang]['meta'],LEFT,255,8,max_width=210,color=p['accent'])
    txt(c,lang,COPY[lang]['intro'],LEFT,218,10,max_width=190,leading=17)
    txt(c,lang,COPY[lang]['source'],LEFT,70,8,max_width=205,color=p['muted'])
    c.setFillColor(HexColor(p['accent']));c.rect(A4_W*.41,0,4,A4_H,fill=1,stroke=0)
    c.save()


def row(c,lang,name,value,y,estimated=False):
    p=COLOR[lang]
    txt(c,lang,name,LEFT,y,10,color=p['muted'])
    txt(c,lang,str(value),LEFT+155,y,13,bold=True)
    if estimated: txt(c,lang,'*',LEFT+410,y+1,12,color=p['accent'])
    hairline(c,LEFT,y-15,RIGHT,y-15,p['soft'])
    return y-45


def facts_from_profile(lang,profile):
    z=COPY[lang]
    facts=[(z['height'],str(profile['height'])+' cm',False),
           (z['age'],str(profile['age']),False),
           (z['build'],z['athletic'],False),
           (z['eyes'],z['brown'],False),
           (z['hair'],z['dark'],False),
           (z['beard'],z['dark'],False),
           (z['base'],z['belarus'],False)]
    if profile.get('weight'):facts.append((z['weight'],str(profile['weight'])+' kg',True))
    if profile.get('waist'):facts.append((z['waist'],str(profile['waist'])+' cm',True))
    return facts


def draw_profile(path,lang,profile,compact=False):
    title=COPY[lang]['comp' if compact else 'profile']
    c=new_pdf(path,lang,title);p=head(c,lang,title,1)
    image(c,ROOT/'assets/portrait-digital.webp',LEFT,391,220,354,focus=(.49,.33))
    txt(c,lang,COPY[lang]['source'],LEFT,378,8,max_width=227,color=p['muted'])
    xx=LEFT+243
    txt(c,lang,COPY[lang]['cover'].replace('\n',' '),xx,696,25 if lang!='zh' else 23,display=(lang=='zh'),bold=(lang!='zh'))
    txt(c,lang,COPY[lang]['role'],xx,658,9.5,max_width=266,leading=16)
    hairline(c,xx,631,RIGHT,631,p['soft'])
    y=606
    for name,value,estimated in facts_from_profile(lang,profile):
        txt(c,lang,name,xx,y,8,color=p['muted'])
        txt(c,lang,value,xx+107,y,10,bold=True)
        if estimated:txt(c,lang,'*',RIGHT-4,y,8,color=p['accent'])
        hairline(c,xx,y-14,RIGHT,y-14,p['soft']);y-=30
    txt(c,lang,'* '+COPY[lang]['estimated'],xx,y-8,7.4,max_width=255,leading=12,color=p['muted'])
    hairline(c,LEFT,359,RIGHT,359,p['soft'])
    decorate_label(c,lang,COPY[lang]['available'],LEFT,332)
    txt(c,lang,COPY[lang]['directions'],LEFT,292,10,max_width=490,leading=18)
    decorate_label(c,lang,COPY[lang]['brief'][:0]+('ABOUT' if lang=='en' else 'ОБО МНЕ' if lang=='ru' else '关于'),LEFT,224)
    txt(c,lang,COPY[lang]['brief'],LEFT,194,9.5,max_width=490,leading=17)
    txt(c,lang,'@markovmade     ·     castefeudal@gmail.com',LEFT,77,10,bold=True)
    c.showPage();c.save()


def draw_parameters(path,lang,profile):
    c=new_pdf(path,lang,COPY[lang]['specs']);p=head(c,lang,COPY[lang]['specs'],1)
    txt(c,lang,COPY[lang]['specs'],LEFT,706,37 if lang!='zh' else 33,display=(lang=='zh'),bold=(lang!='zh'))
    txt(c,lang,COPY[lang]['profile_sub'],LEFT,668,10,color=p['muted'])
    hairline(c,LEFT,636,RIGHT,636,p['accent'],1.3)
    y=610
    for fact,value,estimated in facts_from_profile(lang,profile):y=row(c,lang,fact,value,y,estimated)
    txt(c,lang,'* '+COPY[lang]['estimated'],LEFT,167,9,max_width=470,color=p['accent'])
    txt(c,lang,COPY[lang]['source'],LEFT,132,9,color=p['muted'])
    txt(c,lang,'@markovmade  /  castefeudal@gmail.com',LEFT,94,11,bold=True)
    c.showPage();c.save()


def draw_lookbook(path,lang,items):
    c=new_pdf(path,lang,COPY[lang]['looks']);p=paint(c,lang)
    txt(c,lang,'P / M .',LEFT,A4_H-54,16,bold=True)
    txt(c,lang,COPY[lang]['looks'],LEFT,643,38 if lang!='zh' else 36,display=(lang=='zh'))
    txt(c,lang,COPY[lang]['names'],LEFT,597,12,color=p['accent'])
    image(c,ROOT/'assets/portrait-fashion.webp',LEFT,97,PAGE_W,458,focus=(.42,.38))
    txt(c,lang,COPY[lang]['source'],LEFT,71,9,color=p['muted']);c.showPage()
    for idx,(filename,cat,label) in enumerate(items,1):
        p=head(c,lang,COPY[lang]['looks'],idx+1)
        # Use full-width editorial crops with real image metadata, never generated photographs.
        img_path=ROOT/'assets'/filename
        with Image.open(img_path) as im:aspect=im.width/im.height
        frame_h=590 if aspect<=1.15 else 390
        if aspect>1.25:frame_h=360
        top=A4_H-94
        image(c,img_path,LEFT,top-frame_h,PAGE_W,frame_h,focus=(.5,.35))
        txt(c,lang,f'{idx:02d}  /  {label.split(" / ")[-1]}',LEFT,top-frame_h-28,21,bold=True)
        txt(c,lang,COPY[lang]['source'],LEFT,top-frame_h-51,9,max_width=500,color=p['muted'])
        c.showPage()
    c.save()


def draw_contact_sheet(path,lang,items):
    c=new_pdf(path,lang,COPY[lang]['sheet']);p=head(c,lang,COPY[lang]['sheet'],1)
    txt(c,lang,COPY[lang]['sheet'],LEFT,A4_H-97,30 if lang!='zh' else 28,bold=True,display=(lang=='zh'))
    txt(c,lang,COPY[lang]['source'],LEFT,A4_H-128,9,color=p['muted'])
    cell_w=(PAGE_W-20)/3
    for i,(filename,cat,label) in enumerate(items):
        col=i%3;row_i=i//3;px=LEFT+col*(cell_w+10);py=390-row_i*295
        image(c,ROOT/'assets'/filename,px,py,cell_w,245,focus=(.5,.38))
        txt(c,lang,f'{i+1:02d} / {label.split(" / ")[-1]}',px,py-16,8.5,bold=True)
        txt(c,lang,filename,px,py-32,7,color=p['muted'])
    c.showPage();c.save()


def draw_bio(path,lang,profile):
    c=new_pdf(path,lang,COPY[lang]['bio_title']);p=head(c,lang,COPY[lang]['bio_title'],1)
    image(c,ROOT/'assets/editorial-markovmade.webp',LEFT,403,PAGE_W,348,focus=(.5,.25))
    decorate_label(c,lang,COPY[lang]['bio_title'],LEFT,367)
    txt(c,lang,COPY[lang]['cover'].replace('\n',' '),LEFT,318,31 if lang!='zh' else 27,bold=True)
    txt(c,lang,COPY[lang]['bio_body'],LEFT,273,12,max_width=PAGE_W,leading=20)
    txt(c,lang,COPY[lang]['role'],LEFT,137,11,color=p['accent'])
    txt(c,lang,COPY[lang]['meta'],LEFT,112,9,color=p['muted'])
    c.showPage();c.save()


def draw_contact(path,lang,profile):
    c=new_pdf(path,lang,COPY[lang]['contact']);p=head(c,lang,COPY[lang]['contact'],1)
    txt(c,lang,COPY[lang]['contact'],LEFT,650,38 if lang!='zh' else 33,bold=True)
    txt(c,lang,COPY[lang]['contact_intro'],LEFT,602,13,max_width=470,leading=21)
    hairline(c,LEFT,545,RIGHT,545,p['accent'],1.3)
    txt(c,lang,'TELEGRAM',LEFT,510,9,color=p['muted'])
    txt(c,lang,'@markovmade',LEFT,476,23,bold=True)
    c.linkURL('https://t.me/markovmade',(LEFT,468,RIGHT,509),relative=0)
    hairline(c,LEFT,447,RIGHT,447,p['soft'])
    txt(c,lang,'EMAIL',LEFT,412,9,color=p['muted'])
    txt(c,lang,profile['contacts']['email'],LEFT,375,19,bold=True)
    c.linkURL('mailto:'+profile['contacts']['email'],(LEFT,367,RIGHT,407),relative=0)
    hairline(c,LEFT,350,RIGHT,350,p['soft'])
    txt(c,lang,'PORTFOLIO',LEFT,312,9,color=p['muted'])
    txt(c,lang,'castefeudal.github.io/model/',LEFT,278,14,bold=True)
    c.linkURL('https://castefeudal.github.io/model/',(LEFT,270,RIGHT,310),relative=0)
    txt(c,lang,COPY[lang]['source'],LEFT,118,10,max_width=PAGE_W,color=p['muted'])
    c.showPage();c.save()


def draw_usage(path,lang):
    c=new_pdf(path,lang,COPY[lang]['usage']);p=head(c,lang,COPY[lang]['usage'],1)
    txt(c,lang,COPY[lang]['usage'],LEFT,689,35 if lang!='zh' else 31,bold=True)
    hairline(c,LEFT,651,RIGHT,651,p['accent'],1.3)
    txt(c,lang,COPY[lang]['usage_body'],LEFT,610,13,max_width=PAGE_W,leading=22)
    decorate_label(c,lang,COPY[lang]['short_note'],LEFT,431)
    txt(c,lang,COPY[lang]['source'],LEFT,379,11,max_width=PAGE_W,color=p['muted'])
    txt(c,lang,COPY[lang]['contact_intro'],LEFT,304,11,max_width=PAGE_W)
    txt(c,lang,'@markovmade   /   castefeudal@gmail.com',LEFT,222,13,bold=True)
    c.showPage();c.save()


DOCS = [
  ('00_START_HERE/README.pdf',draw_cover),
  ('01_CASTING_PROFILE/Pavel_Markov_Casting_Profile.pdf',draw_profile),
  ('01_CASTING_PROFILE/Pavel_Markov_Comp_Card.pdf',draw_profile),
  ('01_CASTING_PROFILE/Pavel_Markov_Parameters.pdf',draw_parameters),
  ('02_PORTFOLIO/Pavel_Markov_Lookbook.pdf',draw_lookbook),
  ('02_PORTFOLIO/Pavel_Markov_Contact_Sheet.pdf',draw_contact_sheet),
  ('04_PRESENTATION/Pavel_Markov_Professional_Bio.pdf',draw_bio),
  ('05_CONTACT_AND_USAGE/Contact_Information.pdf',draw_contact),
  ('05_CONTACT_AND_USAGE/Image_Usage_Notes.pdf',draw_usage),
]


def hash_file(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(65536),b''):h.update(b)
    return h.hexdigest()


def put_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf8')


def make_zip(out,root,prefix=None):
    out.parent.mkdir(parents=True,exist_ok=True)
    files=sorted(p for p in root.rglob('*') if p.is_file())
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=7,allowZip64=True,strict_timestamps=True) as z:
        for f in files:
            n=f.relative_to(root).as_posix()
            if prefix:n=prefix.rstrip('/')+'/'+n
            info=zipfile.ZipInfo(n,dt.datetime(2026,11,3,12,0,0).timetuple()[:6])
            info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(0o644<<16)
            with f.open('rb') as fd:z.writestr(info,fd.read(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=7)
    with zipfile.ZipFile(out) as z:
        corrupt=z.testzip()
        if corrupt:raise ValueError(f'Broken zip entry: {corrupt}')
        assert len(z.namelist())==len(set(z.namelist())), 'Duplicate ZIP members'
    return len(files)


def create_edition(root,lang,profile,archive_data):
    target=root/('PAVEL_MARKOV_CASTING_KIT_'+lang.upper())
    if target.exists():shutil.rmtree(target)
    target.mkdir(parents=True)
    for rel,action in DOCS:
        path=target/rel
        if action is draw_cover:action(path,lang,profile)
        elif action is draw_profile:action(path,lang,profile,compact=('Comp_Card' in rel))
        elif action is draw_parameters:action(path,lang,profile)
        elif action in (draw_lookbook,draw_contact_sheet):action(path,lang,PHOTOS)
        elif action is draw_bio:action(path,lang,profile)
        elif action is draw_contact:action(path,lang,profile)
        elif action is draw_usage:action(path,lang)
        else:raise AssertionError(rel)
    included=[]
    for filename,category,label in PHOTOS:
        source=ROOT/'assets'/filename
        if not source.exists():raise FileNotFoundError(source)
        with Image.open(source) as im:
            if im.info.get('exif') or im.getexif().get(34853):
                raise ValueError(f'EXIF/GPS metadata must be removed from original before packaging: {filename}')
        dst=target/'03_PHOTOGRAPHS'/category/filename
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(source,dst)
        included.append({'file':dst.relative_to(target).as_posix(),'sha256':hash_file(dst),
            'source':filename,'archival':True,'category':category,'source_label':label})
    contents='PAVEL MARKOV / '+COPY[lang]['kit']+'\n'+COPY[lang]['edition']+'\n\n'+COPY[lang]['intro']+'\n\n'+COPY[lang]['arch_note']+'\n\n'
    contents+='\n'.join(' - '+str(path.relative_to(target)) for path in sorted(target.rglob('*')) if path.is_file())
    cpath=target/'00_START_HERE'/'CONTENTS.txt';cpath.write_text(contents+'\n',encoding='utf8')
    entries=[]
    for f in sorted(target.rglob('*')):
        if f.is_file():entries.append({'path':f.relative_to(target).as_posix(),'bytes':f.stat().st_size,'sha256':hash_file(f)})
    manifest={'schema':'pm-casting-kit/v1','locale':lang,'edition':COPY[lang]['edition'],
      'version':CATALOG_VERSION,'issued':ISSUED,'model':'Pavel Markov',
      'verified_height_cm':profile['height'],'photo_count':len(included),'archival':True,
      'photos':included,'files':entries,'license_note':'Photos: owner archive. Commercial reuse needs separate authorization.'}
    put_json(target/'06_MANIFEST'/'manifest.json',manifest)
    sha_lines=[f'{rec["sha256"]}  {rec["path"]}' for rec in entries]
    sha_lines.append(hash_file(target/'06_MANIFEST'/'manifest.json')+'  06_MANIFEST/manifest.json')
    (target/'06_MANIFEST'/'SHA256SUMS.txt').write_text('\n'.join(sha_lines)+'\n',encoding='ascii')
    return target


def validate_archives(out):
    """Catch corrupt, missing, accidental duplicate or untranslated files."""
    from collections import defaultdict
    for lang in ('ru','en','zh'):
        path=out/f'Pavel_Markov_Casting_Kit_{lang.upper()}.zip'
        with zipfile.ZipFile(path) as z:
            if z.testzip():raise RuntimeError('bad ZIP: '+str(path))
            names=z.namelist()
            assert len([n for n in names if n.endswith('.pdf')])==len(DOCS)
            assert len([n for n in names if n.endswith('.webp')])==len(PHOTOS)
            for n in names:
                if n.endswith('.pdf'):
                    data=z.read(n)
                    if not data.startswith(b'%PDF-') or len(data)<1500:raise RuntimeError('invalid PDF '+n)
                if any(t in n.lower() for t in ('passport','id_card','contract','signature')):
                    raise RuntimeError('private/sensitive attachment: '+n)
            manifest_name=next(n for n in names if n.endswith('/06_MANIFEST/manifest.json'))
            data=json.loads(z.read(manifest_name))
            assert data['locale']==lang and data['photo_count']==6
            base=manifest_name.rsplit('/06_MANIFEST/',1)[0]+'/'
            for f in data['files']:
                assert hashlib.sha256(z.read(base+f['path'])).hexdigest()==f['sha256'],f['path']
        print(f'PASS {lang}: {len(names)} entries, {path.stat().st_size} bytes')
    full=out/'Pavel_Markov_Complete_Archive.zip'
    with zipfile.ZipFile(full) as z:
        assert not z.testzip()
        assert len([x for x in z.namelist() if x.endswith('.webp')])==6, 'International archive must deduplicate images'
        assert len([x for x in z.namelist() if x.endswith('.pdf')])==3*len(DOCS)
    print(f'PASS international: {len(z.namelist())} entries, {full.stat().st_size} bytes')


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,default=DEFAULT_OUTPUT)
    args=parser.parse_args()
    output=args.output_dir.resolve()
    output.mkdir(parents=True,exist_ok=True)
    data=load_data()
    assert data['profile']['height']==188
    assert not data['profile']['clothes'] and not data['profile']['shoes']
    source_archive={x['src'].removeprefix('assets/'):x for x in data['archive']}
    for filename,cat,label in PHOTOS:
        assert filename in source_archive and source_archive[filename]['archive'] and source_archive[filename].get('presskit_approved'),filename
    fonts()
    staging=Path(tempfile.mkdtemp(prefix='pm-kit-build-'))
    build=[]
    for lang in ('ru','en','zh'):
        source=create_edition(staging,lang,data['profile'],source_archive)
        name=f'Pavel_Markov_Casting_Kit_{lang.upper()}.zip'
        make_zip(output/name,source,prefix=source.name)
        build.append(source)
        # First-page preview is rendered FROM the actual localized README PDF.
        # It is not a generic placeholder and never requires a browser PDF plugin.
        import fitz
        front=source/'00_START_HERE'/'README.pdf'
        with fitz.open(front) as doc:
            pix=doc[0].get_pixmap(matrix=fitz.Matrix(.67,.67),alpha=False)
            preview=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            preview_path=output/'previews'/f'{lang.upper()}.webp'
            preview_path.parent.mkdir(parents=True,exist_ok=True)
            preview.save(preview_path,format='WEBP',quality=80,method=6)
        pub=output/'pdfs'/lang
        pub.mkdir(parents=True,exist_ok=True)
        for d in ('Pavel_Markov_Casting_Profile.pdf','Pavel_Markov_Comp_Card.pdf','Pavel_Markov_Parameters.pdf'):
            shutil.copy2(source/'01_CASTING_PROFILE'/d,pub/d)
    # International ZIP: all three document editions, but six photos once.
    intl=staging/'PAVEL_MARKOV_INTERNATIONAL'
    intl.mkdir()
    for source in build:
        lang=source.name.split('_')[-1]
        target=intl/('DOCUMENTS_'+lang)
        target.mkdir()
        for f in sorted(source.rglob('*')):
            if f.is_file() and not '/03_PHOTOGRAPHS/' in ('/'+f.relative_to(source).as_posix()):
                dest=target/f.relative_to(source)
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(f,dest)
    for f in sorted((build[0]/'03_PHOTOGRAPHS').rglob('*')):
        if f.is_file():
            target=intl/'SHARED_PHOTOGRAPHS'/f.relative_to(build[0]/'03_PHOTOGRAPHS')
            target.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(f,target)
    (intl/'READ_ME_FIRST.txt').write_text('PAVEL MARKOV / INTERNATIONAL PRESS KIT\n'+
        'Documents are available in RU, EN and ZH in three complete language folders.\n'+
        'The six authentic personal-archive photographs are stored once in SHARED_PHOTOGRAPHS to avoid duplication.\n'+
        'Archived images are not recent agency casting digitals. Commercial reuse requires separate permission.\n',encoding='utf8')
    make_zip(output/'Pavel_Markov_Complete_Archive.zip',intl,prefix=intl.name)
    catalog={'schema':'pm-download-catalog/v1','version':CATALOG_VERSION,'issued':ISSUED,'photoCount':6,'documentCount':len(DOCS),'locales':{},'international':{}}
    for lang in ('ru','en','zh'):
        z=output/f'Pavel_Markov_Casting_Kit_{lang.upper()}.zip'
        catalog['locales'][lang]={'zip':f'./downloads/{z.name}','bytes':z.stat().st_size,'sha256':hash_file(z),
            'profilePdf':f'./downloads/pdfs/{lang}/Pavel_Markov_Casting_Profile.pdf',
            'compPdf':f'./downloads/pdfs/{lang}/Pavel_Markov_Comp_Card.pdf',
            'parametersPdf':f'./downloads/pdfs/{lang}/Pavel_Markov_Parameters.pdf',
            'preview':f'./downloads/previews/{lang.upper()}.webp'}
    z=output/'Pavel_Markov_Complete_Archive.zip'
    catalog['international']={'zip':f'./downloads/{z.name}','bytes':z.stat().st_size,'sha256':hash_file(z)}
    put_json(output/'catalog.json',catalog)
    validate_archives(output)
    print('CATALOG',output/'catalog.json')
    shutil.rmtree(staging)
    shutil.rmtree(FONT_CACHE['cache'])

MAPS={}
if __name__=='__main__':
    MAPS={'sans':cmap_of('PMSans'),'serif':cmap_of('PMSerif')}
    main()