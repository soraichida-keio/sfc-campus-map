import cv2,numpy as np
S=300/110
off=np.load('crop_off.npy'); x0,y0=int(off[0]),int(off[1])
L=np.load('L_clean2.npy')
im=cv2.imread('hi-1.png')[y0:y0+L.shape[0],x0:x0+L.shape[1]][:,:,::-1].astype(int)
R,G,B=im[:,:,0],im[:,:,1],im[:,:,2]
blue=(((R<60)&(G>40)&(G<125)&(B>90)&(B<200)&(B-R>70))).astype(np.uint8)*255
print(blue.sum()/255)
bc=cv2.morphologyEx(blue,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
cs,_=cv2.findContours(bc,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
n=0
for c in cs:
    x,y,w,h=cv2.boundingRect(c)
    if w<40 or h<18: continue
    if w*h>130000 or w>700 or h>700: continue
    L[y-3:y+h+3,x-3:x+w+3]=1; n+=1
print('erased',n)
# frame lines of big regions are thin blue; already filled by nearest. thin leftovers: small median
L=cv2.medianBlur(L,5)
# remove isolated white blobs again
wh=(L==6).astype(np.uint8)
nn,lb,st,_=cv2.connectedComponentsWithStats(wh,connectivity=8)
big=np.argsort(-st[1:,4])[:3]+1
for i in range(1,nn):
    if st[i,4]<120000 and i not in big: L[lb==i]=1
np.save('L_final.npy',L)
pal=np.array([(70,70,70),(150,205,161),(90,200,255),(125,129,140),(255,248,176),(219,220,220),(255,255,255)],np.uint8)
cv2.imwrite('ground_prev3.png',cv2.resize(pal[L][:,:,::-1],None,fx=0.35,fy=0.35,interpolation=cv2.INTER_AREA))
