import cv2,numpy as np
L=np.load('L_crop.npy')
# palette: 0 bld(ground under building) 1 green 2 pond 3 gray 4 sports 5 road 6 white
# slopes/arrows/bld pixels -> fill later by buildings; make bld ground = white-ish plaza
bld=(L==0).astype(np.uint8)
L2=L.copy(); L2[L==0]=6   # temp treat as white; buildings are drawn in 3D
# median to remove speckle
L2=cv2.medianBlur(L2,7)
# callout removal: small rectangular white blobs
wh=(L2==6).astype(np.uint8)
n,lb,st,_=cv2.connectedComponentsWithStats(wh,connectivity=4)
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<70000 and a>2500 and w>40 and h>40 and a/(w*h)>0.80 and max(w,h)/min(w,h)<4.5:
        L2[lb==i]=1
np.save('L_clean.npy',L2)
pal=np.array([(70,70,70),(150,205,161),(90,200,255),(125,129,140),(255,248,176),(219,220,220),(255,255,255)],np.uint8)
v=pal[L2]
cv2.imwrite('ground_prev.png',cv2.resize(v[:,:,::-1],None,fx=0.35,fy=0.35,interpolation=cv2.INTER_AREA))
