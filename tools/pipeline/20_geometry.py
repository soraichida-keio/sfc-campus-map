import cv2,numpy as np,json,pickle
M=0.2131
S=300/110
x0,y0=[int(v) for v in np.load('crop_off.npy')]
Lg=np.load('L_ground.npy'); Hh,Ww=Lg.shape
cs=pickle.load(open('cont.pkl','rb'))
def world(pt): return [round((pt[0]-x0-Ww/2)*M,2), round((pt[1]-y0-Hh/2)*M,2)]
def simp(c,eps=2.5):
    a=cv2.approxPolyDP(c,eps,True).reshape(-1,2)
    return a
def comp_polys(c,k,n_expected):
    bx,by,bw,bh=cv2.boundingRect(c); pad=40
    m=np.zeros((bh+2*pad,bw+2*pad),np.uint8)
    cv2.drawContours(m,[c-np.array([bx-pad,by-pad])],-1,255,-1)
    er=cv2.erode(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
    n,lb,st,cen=cv2.connectedComponentsWithStats(er)
    comps=[i for i in range(1,n) if st[i,4]>200]
    out=[]
    for i in comps:
        part=cv2.dilate((lb==i).astype(np.uint8)*255,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k+2,k+2)))&m
        cc,_=cv2.findContours(part,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        cc=max(cc,key=cv2.contourArea)+np.array([bx-pad,by-pad])
        out.append(cc)
    out.sort(key=lambda c:cv2.moments(c)['m10']/cv2.moments(c)['m00'])
    print('split',n_expected,'->',len(out))
    return out
def P(i): return simp(cs[i])
splits={41:(23,2),39:(23,2),20:(25,2),17:(25,2),8:(25,2)}
sp={i:comp_polys(cs[i],k,n) for i,(k,n) in splits.items()}
# Tateuchi house: small polygon near (558,783)@110dpi
bld=((np.load('lab.npy')==0)&(np.load('mind.npy')<4000)).astype(np.uint8)*255
bc=cv2.morphologyEx(bld,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
cc,_=cv2.findContours(bc,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
tat=None
for c in cc:
    a=cv2.contourArea(c)
    if 500<a<1600:
        M_=cv2.moments(c); cx,cy=M_['m10']/M_['m00']/S,M_['m01']/M_['m00']/S
        if abs(cx-558)<14 and abs(cy-783)<14: tat=c
print('tateuchi',tat is not None)
import sys
def pj(arr): return [world(p) for p in arr]
B={}  # id -> list of blocks (poly, kind)
def add(id,*blocks): B[id]=[(simp(b) if not isinstance(b,np.ndarray) or b.ndim==3 else b,k) for b,k in blocks]
add('alpha',(cs[19],'m'))
add('omega',(cs[21],'m'))
add('mu',(cs[29],'m'),(cs[28],'m'))
add('kappa',(cs[38],'s'),(sp[41][0],'n'))
add('epsilon',(cs[37],'s'),(sp[41][1],'n'))
add('iota',(cs[34],'s'),(sp[39][0],'n'))
add('omicron',(cs[33],'s'),(sp[39][1],'n'))
add('lambda',(cs[30],'s'),(cs[35],'n'))
add('theta',(cs[27],'m'))
add('sigma',(cs[42],'m'))
add('kamoike',(cs[26],'m'))
add('tau',(cs[48],'m'))
add('delta',(cs[50],'m'),(cs[49],'m'))
add('psi',(cs[53],'m'))
add('phi',(cs[44],'m'),(cs[40],'m'))
add('gamma',(cs[32],'m'))
add('salt',(cs[22],'m'))
add('rosemary',(sp[20][0],'m')); add('basil',(sp[20][1],'m'))
add('paprika',(sp[17][0],'m')); add('turmeric',(sp[17][1],'m'))
add('bstudio',(cs[10],'m')); add('bdome',(cs[5],'m')); add('beta2',(cs[6],'m'))
# split 8: upper (smaller y) = factory, lower = beta1
s8=sorted(sp[8],key=lambda c:cv2.moments(c)['m01']/cv2.moments(c)['m00'])
add('bfactory',(s8[0],'m'))
if len(s8)>1: add('beta1',(s8[1],'m'))
add('beta4',(cs[3],'m')); add('beta3',(cs[1],'m'))
add('zeta',(cs[13],'m')); add('iij',(cs[11],'m')); add('ntt',(cs[12],'m')); add('dnp',(cs[9],'m'))
add('mori',(cs[4],'m')); add('guest',(cs[2],'m')); add('archery',(cs[18],'m')); add('storage',(cs[25],'m'))
if tat is not None: add('tateuchi',(tat,'m'))
add('hs_south',(cs[52],'m')); add('hs_shared',(cs[46],'m')); add('hs_gym12',(cs[54],'m')); add('hs_west',(cs[55],'m')); add('hs_change',(cs[51],'m'))
out={k:[{'k':kind,'p':pj(poly)} for poly,kind in v] for k,v in B.items()}
# ponds: class 2 comps
pm=(Lg==2).astype(np.uint8)
pc,_=cv2.findContours(pm,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
ponds=[pj(simp(c,3)) for c in pc if cv2.contourArea(c)>800]
print('ponds',len(ponds))
# trees
rng=np.random.default_rng(7)
bm=np.zeros((Hh,Ww),np.uint8)
for v in B.values():
    for poly,_ in v:
        cv2.fillPoly(bm,[(poly-np.array([x0,y0])).astype(np.int32).reshape(-1,1,2)],1)
bm=cv2.dilate(bm,np.ones((41,41),np.uint8))
green=(Lg==1)&(bm==0)
# keep away from edges of green (roads) lightly
gerode=cv2.erode(green.astype(np.uint8),np.ones((15,15),np.uint8))>0
def vnoise(w,h,s):
    g=rng.random((h//s+2,w//s+2)).astype(np.float32)
    return cv2.resize(g,(w,h),interpolation=cv2.INTER_CUBIC)[:h,:w]
nz=0.55*vnoise(Ww,Hh,260)+0.3*vnoise(Ww,Hh,90)+0.15*vnoise(Ww,Hh,30)
pts=[]
cell=int(7/M); grid={}
for _ in range(90000):
    x=int(rng.integers(0,Ww)); y=int(rng.integers(0,Hh))
    if not gerode[y,x]: continue
    if rng.random()>(nz[y,x]-0.38)*3.2: continue
    gx,gy=x//cell,y//cell; ok=True
    for dx in(-1,0,1):
        for dy in(-1,0,1):
            for (px,py) in grid.get((gx+dx,gy+dy),[]):
                if (px-x)**2+(py-y)**2<cell*cell: ok=False;break
            if not ok:break
        if not ok:break
    if ok:
        grid.setdefault((gx,gy),[]).append((x,y)); pts.append((x,y))
print('trees',len(pts))
trees=[]
for x,y in pts:
    wx=(x-Ww/2)*M; wz=(y-Hh/2)*M
    trees+= [round(wx*10), round(wz*10), int(rng.integers(70,140))]
json.dump({'size':[round(Ww*M,1),round(Hh*M,1)],'b':out,'ponds':ponds,'trees':trees},open('geom.json','w'),separators=(',',':'))
import os;print(os.path.getsize('geom.json'))
