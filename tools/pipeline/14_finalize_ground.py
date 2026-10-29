import cv2,numpy as np
L=np.load('L_final.npy'); K=1/0.35
def pr(xa,ya,xb,yb,v):
    L[int(ya*K):int(yb*K),int(xa*K):int(xb*K)]=v
pr(143,241,239,267,1); pr(638,476,734,500,1); pr(378,325,434,344,1)
pr(834,710,960,732,1); pr(368,236,417,258,1); pr(92,28,302,44,3); pr(1220,743,1293,897,3)
pr(1195,860,1293,995,3)
# thin lines
wh=(L==6).astype(np.uint8)
op=cv2.morphologyEx(wh,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
thin=(wh==1)&(op==0)
# keep thin white only if next to road... simply drop to green when surrounded mostly by green
g=cv2.blur((L==1).astype(np.float32),(25,25))
L[thin&(g>0.55)]=1
L=cv2.medianBlur(L,5)
np.save('L_ground.npy',L)
pal=np.array([(206,214,205),(176,214,160),(118,196,238),(52,60,76),(230,226,176),(222,224,226),(244,243,238)],np.uint8)  # my own palette
# class 0 shouldn't exist anymore
img=pal[L]
img=cv2.resize(img,(2048,int(2048*L.shape[0]/L.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite('ground.png',img[:,:,::-1],[cv2.IMWRITE_PNG_COMPRESSION,9])
print(img.shape)
cv2.imwrite('ground_prev4.png',cv2.resize(img[:,:,::-1],None,fx=0.6,fy=0.6,interpolation=cv2.INTER_AREA))
