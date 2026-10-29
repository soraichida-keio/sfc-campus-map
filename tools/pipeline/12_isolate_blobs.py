import cv2,numpy as np
S=300/110
off=np.load('crop_off.npy'); x0,y0=int(off[0]),int(off[1])
L=np.load('L_clean.npy')
def rect(xa,ya,xb,yb,v):  # 110dpi page coords
    L[max(0,int(ya*S)-y0):int(yb*S)-y0, max(0,int(xa*S)-x0):int(xb*S)-x0]=v
rect(1195,770,1485,935,3)  # compass+scale
# erase isolated white blobs, and small blobs
wh=(L==6).astype(np.uint8)
n,lb,st,_=cv2.connectedComponentsWithStats(wh,connectivity=8)
big=np.argsort(-st[1:,4])[:3]+1
for i in range(1,n):
    if st[i,4]<120000 and i not in big:
        L[lb==i]=3 if False else 1
# callout boxes still attached: open with a big kernel to find fat rectangles of white, compare to path network
wh=(L==6).astype(np.uint8)
k=cv2.getStructuringElement(cv2.MORPH_RECT,(26,26))
fat=cv2.morphologyEx(wh,cv2.MORPH_OPEN,k)
n,lb,st,_=cv2.connectedComponentsWithStats(fat,connectivity=8)
cands=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    cands.append((a,x,y,w,h,round(a/(w*h),2)))
cands.sort(reverse=True)
for c in cands[:40]: print(c, 'p110',int((c[1]+x0)/S),int((c[2]+y0)/S),int(c[3]/S),int(c[4]/S))
np.save('L_clean2.npy',L)
pal=np.array([(70,70,70),(150,205,161),(90,200,255),(125,129,140),(255,248,176),(219,220,220),(255,255,255)],np.uint8)
cv2.imwrite('ground_prev2.png',cv2.resize(pal[L][:,:,::-1],None,fx=0.35,fy=0.35,interpolation=cv2.INTER_AREA))
