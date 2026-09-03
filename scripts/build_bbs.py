"""Build matching, standalone BBS HTML, A3 PDF, and PNG from one hierarchy."""
from pathlib import Path
from io import BytesIO
from collections import defaultdict
from datetime import datetime
import base64
import html
import json
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/pdf-tools'))
import pymupdf
from fontTools import subset
from fontTools.ttLib import TTFont

W, H = 1190.55, 841.89
FOREST, GOLD, EDGE, INK, PAPER = '#014917', '#e2ad39', '#b5a16e', '#193b29', '#f7f7f7'
LOGO = ROOT / 'assets/bbs-logo.png'
FONTS = {
    'Gotham': Path('/Users/graphicdesigner/Library/Fonts/Gotham-Bold.otf'),
    'Poppins': Path('/Users/graphicdesigner/Library/Fonts/Poppins-Medium.otf'),
}
MEASURE = {key:pymupdf.Font(fontfile=str(path)) for key,path in FONTS.items()}
NODES = []


def node(id, role, parent, cx, y, width, height, lines=None, kind='staff', size=13.2):
    lines = lines or [role]
    bounds = (cx-width/2, y, cx+width/2, y+height)
    band = 9 if kind in ('executive','commissioner') else 0
    baseline = y + (height-band)/2 - (len(lines)-1)*size*.6 + size*.35
    labels = [(line, cx-MEASURE['Gotham'].text_length(line,fontsize=size)/2,
               baseline+i*size*1.2, size) for i,line in enumerate(lines)]
    NODES.append(dict(id=id,role=role,parent=parent,bounds=bounds,labels=labels,kind=kind,size=size))


# Parent IDs are the authoritative reporting relationships for both formats.
node('ceo','CEO',None,596,70,88,44,kind='ceo',size=21.38)
node('commissioner','Commissioner','ceo',596,143,230,44,kind='commissioner',size=14.25)
node('chief-executive','Chief Executive Officer','commissioner',596,216,254,48,kind='executive',size=14.25)
node('marketing-chief','Chief Marketing Officer','chief-executive',160,318,220,58,['Chief Marketing','Officer'],'executive',14.25)
node('operations-chief','Chief Operation Officer','chief-executive',596,318,220,58,['Chief Operation','Officer'],'executive',14.25)
node('finance-chief','Chief Finance Officer','chief-executive',1032,318,220,58,['Chief Finance','Officer'],'executive',14.25)

node('marketing-manager','Marketing International Manager','marketing-chief',160,448,184,66,['Marketing','International Manager'],'manager',11.5)
node('marketing-1','Marketing Executive 1','marketing-manager',178,550,166,42,['Marketing Executive 1'])
node('marketing-2','Marketing Executive 2','marketing-manager',178,609,166,42,['Marketing Executive 2'])
node('marketing-3','Marketing Executive 3','marketing-manager',178,668,166,42,['Marketing Executive 3'])

node('international','International','operations-chief',378,448,184,66,['International'],'manager',13.2)
node('export-import','Export Import Staff','international',396,550,166,52,['Export Import','Staff'])
node('logistics','Logistic & Supply Chain Staff','international',396,619,166,52,['Logistic &','Supply Chain Staff'])
node('trade','Trade Manager','operations-chief',596,448,172,66,['Trade','Manager'],'manager',13.2)
node('operational-manager','Operational Manager','operations-chief',814,448,184,66,['Operational','Manager'],'manager',13.2)
node('legal','Legal Staff','operational-manager',832,550,166,42)
node('operational','Operational Staff','operational-manager',832,609,166,42)
node('supporting','Supporting Staff','operational-manager',832,668,166,42)

node('finance','Finance Staff','finance-chief',1050,448,166,42)
node('tax','Tax Staff','finance-chief',1050,507,166,42)

BY_ID = {n['id']:n for n in NODES}
CHILDREN = defaultdict(list)
for n in NODES:
    CHILDREN[n['parent']].append(n)

PATHS = []


def path(d, fill=False):
    PATHS.append(dict(d=d,fill=fill))


def down_arrow(x, tip_y):
    path(f'M{x-3.3},{tip_y-5.7} L{x},{tip_y} L{x+3.3},{tip_y-5.7} Z',True)


def straight(parent_id, child_id):
    a,b=BY_ID[parent_id],BY_ID[child_id]
    x=(b['bounds'][0]+b['bounds'][2])/2
    tip=b['bounds'][1]-7
    path(f'M{x},{a["bounds"][3]+8} L{x},{tip-4}')
    down_arrow(x,tip)


def branch(parent_id, child_ids, bus_y):
    parent=BY_ID[parent_id]
    center=(parent['bounds'][0]+parent['bounds'][2])/2
    targets=sorted((BY_ID[id] for id in child_ids),key=lambda n:n['bounds'][0])
    left=(targets[0]['bounds'][0]+targets[0]['bounds'][2])/2
    right=(targets[-1]['bounds'][0]+targets[-1]['bounds'][2])/2
    radius=6
    # One vertical stem meeting a shared branch. No overlapping crossing stubs.
    path(f'M{center},{parent["bounds"][3]+8} L{center},{bus_y}')
    path(f'M{left+radius},{bus_y} L{right-radius},{bus_y}')
    for i,child in enumerate(targets):
        cx=(child['bounds'][0]+child['bounds'][2])/2
        tip=child['bounds'][1]-7
        if i==0:
            path(f'M{cx+radius},{bus_y} C{cx+2.686},{bus_y} {cx},{bus_y+2.686} {cx},{bus_y+radius} L{cx},{tip-4}')
        elif i==len(targets)-1:
            path(f'M{cx-radius},{bus_y} C{cx-2.686},{bus_y} {cx},{bus_y+2.686} {cx},{bus_y+radius} L{cx},{tip-4}')
        else:
            path(f'M{cx},{bus_y} L{cx},{tip-4}')
        down_arrow(cx,tip)


def staff_branch(parent_id):
    parent=BY_ID[parent_id]
    children=CHILDREN[parent_id]
    trunk=children[0]['bounds'][0]-24
    last=children[-1]['bounds']
    last_y=(last[1]+last[3])/2
    path(f'M{trunk},{parent["bounds"][3]+8} L{trunk},{last_y-5}')
    for child in children:
        x0,y0,x1,y1=child['bounds']
        cy=(y0+y1)/2
        tip=x0-7
        path(f'M{trunk},{cy-5} C{trunk},{cy-2.239} {trunk+2.239},{cy} {trunk+5},{cy} L{tip-4},{cy}')
        path(f'M{tip-5.7},{cy-3.3} L{tip},{cy} L{tip-5.7},{cy+3.3} Z',True)


straight('ceo','commissioner')
straight('commissioner','chief-executive')
branch('chief-executive',['marketing-chief','operations-chief','finance-chief'],290)
straight('marketing-chief','marketing-manager')
branch('operations-chief',['international','trade','operational-manager'],414)
for parent in ('marketing-manager','international','operational-manager','finance-chief'):
    staff_branch(parent)


def font_bytes(family, web=False):
    font=TTFont(FONTS[family])
    s=subset.Subsetter(options=subset.Options())
    s.populate(unicodes=range(32,127))
    s.subset(font)
    if web: font.flavor='woff2'
    out=BytesIO()
    font.save(out)
    return out.getvalue()


def color(hex):
    return tuple(int(hex[i:i+2],16)/255 for i in (1,3,5))


LOGO_CROP=(70,225,1530,910)
MM=72/25.4
# Layout rule for this chart: 60 mm logo width with 10 mm clear space
# around the complete lockup, including the company name and tagline.
LOGO_WIDTH=60*MM
LOGO_CLEAR_SPACE=10*MM
LOGO_BOX=(62,42,LOGO_WIDTH,LOGO_WIDTH*685/1460)
LOGO_SAFE_BOX=(LOGO_BOX[0]-LOGO_CLEAR_SPACE,LOGO_BOX[1]-LOGO_CLEAR_SPACE,
               LOGO_BOX[2]+2*LOGO_CLEAR_SPACE,LOGO_BOX[3]+2*LOGO_CLEAR_SPACE)
WATERMARK_CROP=(575,225,1040,669)
WATERMARK_HEIGHT=545*444/465
WATERMARK_BOX=(323,(H-WATERMARK_HEIGHT)/2,545,WATERMARK_HEIGHT)
TITLE=[('Organizational',1128-MEASURE['Gotham'].text_length('Organizational',fontsize=22.19),75,22.19),
       ('Structure',1128-MEASURE['Gotham'].text_length('Structure',fontsize=22.19),101.63,22.19)]
FOOTER=[('PT. BERKAH BERJAYA SATU',62,786,10.8),
        ('Excellence in Global Trade',1128-MEASURE['Poppins'].text_length('Excellence in Global Trade',fontsize=10.8),786,10.8)]


def build_pdf():
    doc=pymupdf.open()
    page=doc.new_page(width=W,height=H)
    page.draw_rect(page.rect,fill=color(PAPER),color=None)
    resources=int(doc.xref_get_key(page.xref,'Resources')[1].split()[0])
    alpha=doc.get_new_xref()
    doc.update_object(alpha,'<< /Type /ExtGState /ca 0.04 /CA 0.04 >>')
    doc.xref_set_key(resources,'ExtGState',f'<< /BBSWatermark {alpha} 0 R >>')

    def image_crop(crop,box,watermark=False):
        sx,sy,ex,ey=crop
        x,y,w,h=box
        scale=w/(ex-sx)
        image_rect=pymupdf.Rect(x-sx*scale,y-sy*scale,x+(1600-sx)*scale,y+(1131-sy)*scale)
        page.insert_image(image_rect,filename=str(LOGO),keep_proportion=False)
        stream=page.get_contents()[-1]
        clip=f'q\n{"/BBSWatermark gs" if watermark else ""}\n{x} {H-y-h} {w} {h} re W n\n'.encode()
        doc.update_stream(stream,clip+doc.xref_stream(stream)+b'\nQ')

    image_crop(WATERMARK_CROP,WATERMARK_BOX,True)
    image_crop(LOGO_CROP,LOGO_BOX)

    for item in PATHS:
        shape=page.new_shape()
        current=None
        for command,numbers in re.findall(r'([MLCZ])([^MLCZ]*)',item['d']):
            v=[float(x) for x in re.findall(r'-?\d+(?:\.\d+)?',numbers)]
            if command=='M': current=pymupdf.Point(*v)
            elif command=='L':
                end=pymupdf.Point(*v)
                shape.draw_line(current,end)
                current=end
            elif command=='C':
                a,b,end=[pymupdf.Point(*v[i:i+2]) for i in (0,2,4)]
                shape.draw_bezier(current,a,b,end)
                current=end
        shape.finish(color=None if item['fill'] else color(EDGE),fill=color(EDGE) if item['fill'] else None,
                     width=1.2,closePath=item['fill'])
        shape.commit()

    for family in FONTS:
        page.insert_font(fontname=family,fontbuffer=font_bytes(family))

    for n in NODES:
        rect=pymupdf.Rect(n['bounds'])
        x0,y0,x1,y1=n['bounds']
        kind=n['kind']
        radius=7.1 if kind=='staff' else 10
        if kind=='ceo':
            radius=6.3
            page.draw_rect(rect+(0,5,0,5),radius=radius/rect.height,color=None,fill=color('#ba8b2c'))
            page.draw_rect(rect,radius=radius/rect.height,color=None,fill=color(GOLD))
        elif kind in ('executive','commissioner'):
            band=GOLD if kind=='commissioner' else FOREST
            page.draw_rect(rect,radius=radius/rect.height,color=None,fill=color(band))
            ybar=y1-9
            k=.55228475
            s=page.new_shape()
            s.draw_line((x0,ybar),(x0,y0+radius))
            s.draw_bezier((x0,y0+radius),(x0,y0+radius*(1-k)),(x0+radius*(1-k),y0),(x0+radius,y0))
            s.draw_line((x0+radius,y0),(x1-radius,y0))
            s.draw_bezier((x1-radius,y0),(x1-radius*(1-k),y0),(x1,y0+radius*(1-k)),(x1,y0+radius))
            s.draw_line((x1,y0+radius),(x1,ybar))
            s.finish(color=None,fill=(1,1,1),closePath=True)
            s.commit()
            page.draw_rect(rect,radius=radius/rect.height,color=color(EDGE),width=1.2)
        else:
            page.draw_rect(rect,radius=radius/rect.height,color=color(EDGE),fill=(1,1,1),width=1.2)
        for text,x,y,size in n['labels']:
            page.insert_text((x,y),text,fontname='Gotham',fontsize=size,color=color(INK))
    for text,x,y,size in TITLE:
        page.insert_text((x,y),text,fontname='Gotham',fontsize=size,color=color(FOREST))
    for text,x,y,size in FOOTER:
        page.insert_text((x,y),text,fontname='Poppins',fontsize=size,color=color(FOREST))
    page.draw_rect(pymupdf.Rect(0,H-27.349,W,H),color=None,fill=color(FOREST))
    page.draw_rect(pymupdf.Rect(0,H-30.349,W,H-27.349),color=None,fill=color(GOLD))
    doc.set_metadata({'title':'BBS Organizational Structure','author':'PT. Berkah Berjaya Satu',
                      'creator':'BBS organizational chart builder',
                      'creationDate':datetime.now().strftime('D:%Y%m%d%H%M%S')})
    output=ROOT/'output/pdf/BBS-Organizational-Structure.pdf'
    output.parent.mkdir(exist_ok=True,parents=True)
    doc.save(output,garbage=4,deflate=True)
    doc.close()
    return output


def position(box,canvas=(W,H)):
    x,y,w,h=box
    cw,ch=canvas
    return f'left:{100*x/cw:.6f}%;top:{100*y/ch:.6f}%;width:{100*w/cw:.6f}%;height:{100*h/ch:.6f}%'


def label(item,parent=(0,0,W,H),family='Gotham'):
    text,x,y,size=item
    px,py,pw,ph=parent
    return (f'<span class="text-line {family.lower()}" style="left:{100*(x-px)/pw:.6f}%;'
            f'top:{100*(y-.8*size-py)/ph:.6f}%;font-size:{100*size/W:.6f}cqw">{html.escape(text)}</span>')


def render_tree(parent_id=None):
    result=['<ol role="list">']
    for n in CHILDREN[parent_id]:
        x0,y0,x1,y1=n['bounds']
        box=(x0,y0,x1-x0,y1-y0)
        result.append(f'<li><div class="node {n["kind"]}" data-id="{n["id"]}" data-parent="{n["parent"] or ""}" data-role="{html.escape(n["role"])}" style="{position(box)}">')
        result.extend(label(item,box) for item in n['labels'])
        result.append('</div>')
        if CHILDREN[n['id']]: result.append(render_tree(n['id']))
        result.append('</li>')
    result.append('</ol>')
    return '\n'.join(result)


def build_png(pdf):
    output=ROOT/'output/png/BBS-Organizational-Structure.png'
    output.parent.mkdir(exist_ok=True,parents=True)
    with pymupdf.open(pdf) as doc:
        doc[0].get_pixmap(dpi=300,alpha=False).save(output)
    return output


def build_html(pdf,png):
    logo_uri='data:image/png;base64,'+base64.b64encode(LOGO.read_bytes()).decode()
    pdf_uri='data:application/pdf;base64,'+base64.b64encode(pdf.read_bytes()).decode()
    png_uri='data:image/png;base64,'+base64.b64encode(png.read_bytes()).decode()
    webfonts='\n'.join(f"@font-face {{ font-family: 'BBS {f}'; src: url(data:font/woff2;base64,{base64.b64encode(font_bytes(f,True)).decode()}) format('woff2'); font-weight: {700 if f=='Gotham' else 500}; font-style: normal; font-display: block; ascent-override:80%; descent-override:20%; line-gap-override:0%; }}" for f in FONTS)

    def logo_svg(crop,box,watermark=False,canvas=(W,H)):
        x0,y0,x1,y1=crop
        return f'<svg class="brand-image {"watermark" if watermark else "logo"}" style="{position(box,canvas)}" viewBox="{x0} {y0} {x1-x0} {y1-y0}" aria-hidden="true"><image href="{logo_uri}" width="1600" height="1131"/></svg>'

    connectors='<svg class="connectors" viewBox="0 0 1190.55 841.89" aria-hidden="true">'+''.join(f'<path d="{p["d"]}" fill="{EDGE if p["fill"] else "none"}" stroke="{"none" if p["fill"] else EDGE}" stroke-width="1.2"/>' for p in PATHS)+'</svg>'
    document=f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Organizational structure of PT. Berkah Berjaya Satu (BBS).">
  <title>BBS | Organizational Structure</title>
  <link rel="icon" href="data:,">
  <style>
{webfonts}
    * {{ box-sizing: border-box; }}
    html {{ color-scheme: light; background: {PAPER}; }}
    body {{ margin:0; color:{INK}; }}
    .document-actions {{ display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:10px; padding:12px 24px; border-bottom:1px solid #dfe4dc; font:500 12px 'BBS Poppins',Arial,sans-serif; }}
    .actions-title {{ margin-right:auto; color:{FOREST}; }}
    .action {{ display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:9px 16px; border:1px solid #c7d2c8; border-radius:7px; background:white; color:{FOREST}; font:inherit; text-decoration:none; white-space:nowrap; cursor:pointer; }}
    .action:hover {{ background:#edf1ea; }}
    .action:focus-visible {{ outline:2px solid {GOLD}; outline-offset:3px; }}
    .action-primary {{ background:{FOREST}; color:white; border-color:{FOREST}; }}
    .action-primary:hover {{ background:#08612b; }}
    .sheet {{ position:relative; container-type:inline-size; width:100%; aspect-ratio:1190.55 / 841.89; overflow:hidden; background:{PAPER}; isolation:isolate; }}
    h1,p,ol {{ margin:0; padding:0; }}
    ol {{ list-style:none; }}
    .logo-safe-area {{ position:absolute; pointer-events:none; }}
    .brand-image {{ position:absolute; pointer-events:none; overflow:hidden; }}
    .watermark {{ opacity:.04; z-index:-1; }}
    .connectors {{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }}
    .node {{ position:absolute; z-index:1; background:#fff; border-radius:{100*10/W:.6f}cqw; }}
    .node::after {{ content:''; position:absolute; inset:{-100*.6/W:.6f}cqw; border:{100*1.2/W:.6f}cqw solid {EDGE}; border-radius:{100*10.6/W:.6f}cqw; pointer-events:none; }}
    .staff {{ border-radius:{100*7.1/W:.6f}cqw; }}
    .staff::after {{ border-radius:{100*7.7/W:.6f}cqw; }}
    .executive {{ background:linear-gradient(to top,{FOREST} 0 {100*9/W:.6f}cqw,#fff {100*9/W:.6f}cqw); }}
    .commissioner {{ background:linear-gradient(to top,{GOLD} 0 {100*9/W:.6f}cqw,#fff {100*9/W:.6f}cqw); }}
    .ceo {{ background:{GOLD}; border-radius:{100*6.3/W:.6f}cqw; box-shadow:0 {100*5/W:.6f}cqw 0 #ba8b2c; }}
    .ceo::after {{ display:none; }}
    .text-line {{ position:absolute; display:block; white-space:pre; line-height:1; font-kerning:none; font-variant-ligatures:none; }}
    .gotham {{ font-family:'BBS Gotham',Arial,sans-serif; font-weight:700; }}
    .poppins {{ font-family:'BBS Poppins',Arial,sans-serif; font-weight:500; }}
    h1,footer {{ color:{FOREST}; }}
    .footer-band {{ position:absolute; left:0; right:0; bottom:0; height:{100*30.349/H:.6f}%; background:{FOREST}; border-top:{100*3/W:.6f}cqw solid {GOLD}; }}
    .sr-only {{ position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }}
    @media (max-width:600px) {{ .document-actions {{ padding:12px 16px; }} .actions-title {{ display:none; }} }}
    @page {{ size:A3 landscape; margin:0; }}
    @media print {{ .document-actions {{ display:none; }} html,body {{ width:420mm; height:297mm; }} body {{ print-color-adjust:exact; -webkit-print-color-adjust:exact; }} .sheet {{ width:420mm; height:297mm; aspect-ratio:auto; break-inside:avoid; }} }}
  </style>
</head>
<body>
  <nav class="document-actions" aria-label="Document actions">
    <span class="actions-title">BBS / Organizational Structure</span>
    <button class="action" id="print-pdf" type="button">Print / Save as PDF</button>
    <a class="action" id="download-png" href="{png_uri}" download="BBS-Organizational-Structure.png">Download PNG</a>
    <a class="action action-primary" href="{pdf_uri}" download="BBS-Organizational-Structure.pdf">Download PDF</a>
  </nav>
  <main class="sheet" aria-labelledby="page-title">
    {logo_svg(WATERMARK_CROP,WATERMARK_BOX,True)}
    <header>
      <div class="logo-safe-area" style="{position(LOGO_SAFE_BOX)}" aria-hidden="true">
        {logo_svg(LOGO_CROP,(LOGO_CLEAR_SPACE,LOGO_CLEAR_SPACE,LOGO_BOX[2],LOGO_BOX[3]),canvas=LOGO_SAFE_BOX[2:])}
      </div>
      <p class="sr-only">BBS - PT. Berkah Berjaya Satu. Excellence in Global Trade.</p>
      <h1 id="page-title">{''.join(label(item) for item in TITLE)}</h1>
    </header>
    {connectors}
    <section aria-label="Organizational hierarchy">
      {render_tree()}
    </section>
    <footer>
      {''.join('<p>'+label(item,family='Poppins')+'</p>' for item in FOOTER)}
      <div class="footer-band" aria-hidden="true"></div>
    </footer>
  </main>
  <script>
    document.getElementById('print-pdf').addEventListener('click',()=>window.print());
    const pngLink=document.getElementById('download-png');
    const pngBytes=Uint8Array.from(atob(pngLink.getAttribute('href').split(',')[1]),char=>char.charCodeAt(0));
    pngLink.href=URL.createObjectURL(new Blob([pngBytes],{{type:'image/png'}}));
  </script>
</body>
</html>
'''
    (ROOT/'bbs.html').write_text(document)


if __name__=='__main__':
    assert len(NODES)==20 and len(BY_ID)==20
    assert all(n['parent'] is None or n['parent'] in BY_ID for n in NODES)
    pdf=build_pdf()
    png=build_png(pdf)
    build_html(pdf,png)
    print('Created bbs.html, output/pdf/BBS-Organizational-Structure.pdf, and output/png/BBS-Organizational-Structure.png with 20 roles.')
