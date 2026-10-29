import re,html,json,time,urllib.request
B='https://classroom.sfc.keio.ac.jp/'
def get(u):
    r=urllib.request.Request(B+u,headers={'User-Agent':'Mozilla/5.0 (campus-map personal project)'})
    return urllib.request.urlopen(r,timeout=30).read().decode('utf-8','ignore')
def txt(t):
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S)
    t=html.unescape(re.sub(r'<[^>]+>','\n',t))
    return [l.strip() for l in t.split('\n') if l.strip()]
first=txt(get('class/k-to/k-11.html'))
fw=str.maketrans('０１２３４５６７８９','0123456789')
folder={'κ':'k','ε':'e','ι':'i','ο':'o','λ':'l','Ω':'w','τ':'t'}
pages=[];cur=None
for l in first:
    m=re.match(r'^(.)棟$',l)
    if m: cur=m.group(1); continue
    m=re.match(r'^\|-(.)([０-９]{2})$',l)
    if m and m.group(1)==cur:
        n=m.group(2).translate(fw); f=folder[cur]; pages.append((cur+n,f'class/{f}-to/{f}-{n}.html'))
    if l=='|-θ館': pages.append(('θ館','class/c-to/c-.html'))
print(len(pages))
out={}
for code,p in pages:
    try: out[code]=txt(get(p))
    except Exception as e: print('ERR',code,e)
    time.sleep(0.4)
json.dump(out,open('raw.json','w'),ensure_ascii=False)
print(len(out))
