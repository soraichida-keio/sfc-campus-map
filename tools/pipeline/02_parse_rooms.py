import json,re
raw=json.load(open('raw.json'))
rooms={}
for code,L in raw.items():
    # content starts after last "Home" breadcrumb "> code"
    idx=[i for i,l in enumerate(L) if l.startswith('>')]
    s=idx[-1] if idx else 0
    body=L[s+1:]
    d={'code':code}
    # kind line: after 'Next Page' ■ (kind)
    try:
        k=body.index('■'); d['kind']=body[k+1]; desc=[]
        j=k+2
        while j<len(body) and body[j] not in ('360°画像','教室環境情報一覧表','教室全景'): desc.append(body[j]); j+=1
        d['desc']=desc
    except ValueError: pass
    def after(key,stop=None):
        if key in body:
            i=body.index(key)+1; v=[]
            while i<len(body) and body[i] not in ('教室人数','教卓タイプ','机・椅子','設置機材','備考','他の棟へのリンク','Home'): v.append(body[i]); i+=1
            return v
    for key,name in [('教室人数','cap'),('教卓タイプ','podium'),('机・椅子','desk'),('設置機材','equip'),('備考','note')]:
        v=after(key)
        if v: d[name]=v
    rooms[code]=d
json.dump(rooms,open('rooms_parsed.json','w'),ensure_ascii=False,indent=1)
for c,d in rooms.items(): print(c,d.get('kind'),d.get('cap'),d.get('desk'),'|',(d.get('note') or [''])[0][:30])
