import re, json, sys
sys.path.insert(0, '.')
from en import EN
ROOT = '/home/claude/src/coffee-v3.6/'
runtime = open('runtime.js', encoding='utf-8').read().replace('/*EN_DICT*/{}', json.dumps(EN, ensure_ascii=False, separators=(',', ':')))
theme = open('theme.css', encoding='utf-8').read()

KEEP = ('.brand', '.badge10', '.support', '.itoc', '.cwi-', '.hbtn', '.hero', '.top', 'footer', '.mark', '.qrbox img', '@page')
DECL = [
    (r'background:#fff\b(?!f)', 'background:var(--surface)'),
    (r'background:#ffffff\b', 'background:var(--surface)'),
    (r'background:#fbfaff', 'background:var(--surface-2)'),
    (r'color:var\(--purple-dark\)', 'color:var(--heading)'),
    (r'(?<![-\w])color:var\(--purple\)', 'color:var(--accent)'),
    (r'border:1px solid rgba\(80,30,140,\.25\)', 'border:1px solid var(--field-border)'),
    (r'background:#f3f1f6;color:#a59cb3', 'background:var(--off-bg);color:var(--off-ink)'),
    (r'background:#f2f4f7;color:#475467', 'background:var(--past-bg);color:var(--past-ink)'),
    (r'background:var\(--blue-light\);color:#08537f', 'background:var(--blue-light);color:var(--zoom-ink)'),
    (r'background:#fdf2fa;color:#9e165f', 'background:var(--office-bg);color:var(--office-ink)'),
    (r'background:#fef3f2;color:var\(--danger\);border:1px solid #fecdca', 'background:var(--err-bg);color:var(--danger);border:1px solid var(--err-line)'),
    (r'background:var\(--red-light\);color:var\(--red\);border:1px solid #fecdca', 'background:var(--red-light);color:var(--red);border:1px solid var(--err-line)'),
    (r'background:var\(--green-light\);color:var\(--green\);border:1px solid #abefc6', 'background:var(--green-light);color:var(--green);border:1px solid var(--ok-line)'),
    (r'background:var\(--blue-light\);color:#08537f;border:1px solid #b9dcf0', 'background:var(--info-bg);color:var(--info-ink);border:1px solid var(--info-line)'),
    (r'background:#e6f3fa;color:#08537f;border:1px solid #b9dcf0', 'background:var(--info-bg);color:var(--info-ink);border:1px solid var(--info-line)'),
    (r'background:#ecfdf3', 'background:var(--okbg)'),
    (r'color:#e8a317', 'color:var(--star)'),
    # direction-neutral properties
    (r'text-align:right', 'text-align:start'),
    (r'text-align:left', 'text-align:end'),
    (r'margin-left:5px', 'margin-inline-end:5px'),
    (r'border-right:1px solid', 'border-inline-start:1px solid'),
]
def transform_css(css):
    def rule(m):
        sel, body = m.group(1), m.group(2)
        if any(k in sel for k in KEEP): return m.group(0)
        for a, b in DECL: body = re.sub(a, b, body)
        return sel + '{' + body + '}'
    return re.sub(r'([^{}]+)\{([^{}]*)\}', rule, css)

CSS_A, CSS_B = '/* >>> cwi-theme */', '/* <<< cwi-theme */'
JS_A, JS_B = '<script id="cwi-runtime">', '</script><!-- /cwi-runtime -->'
def build(path, extra_css=''):
    s = open(ROOT + path, encoding='utf-8').read()
    # drop blocks from a previous build, then inject fresh ones (re-runnable)
    s = re.sub(re.escape('\n' + CSS_A) + '.*?' + re.escape(CSS_B), '', s, flags=re.S)
    s = re.sub(re.escape('\n' + JS_A) + '.*?' + re.escape(JS_B), '', s, flags=re.S)
    i = s.index('<style>') + len('<style>'); j = s.index('</style>')
    css = transform_css(s[i:j]).rstrip('\n')
    s = s[:i] + css + '\n' + CSS_A + '\n' + theme + extra_css + CSS_B + '\n' + s[j:]
    vp = s.index('<meta name="viewport"'); vp = s.index('>', vp) + 1
    s = s[:vp] + '\n' + JS_A + runtime + JS_B + s[vp:]
    open(ROOT + path, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    for p, extra in [('apps-script/Index.html', ''), ('apps-script/Rate.html', '\nhtml[dir="ltr"] .likert{direction:ltr}\n.lk span{direction:inherit!important}\ntextarea{background:var(--field);color:var(--ink)}\n'),
                     ('apps-script/Admin.html', '\ndialog.dlg{background:var(--surface)}\nhtml[lang="en"] #bk th:nth-child(5){width:140px!important}\nhtml[lang="en"] #bk th:nth-child(4){width:104px!important}\nhtml[lang="en"] #bk th{white-space:normal}\n'), ('index.html', '')]:
        build(p, extra); print('built', p)
