import cv2,numpy as np,pickle
lab=np.load('lab.npy'); mind=np.load('mind.npy')
# classes: 0 bld 1 green 2 pond 3 gray 4 sports 5 road 6 white
S=300/110
x0,x1,y0,y1=int(133*S),int(1487*S),int(175*S),int(1217*S)
H,W=lab.shape
L=lab.copy()
unk=(mind>1800)
# exclude panels -> gray
def rect(xa,ya,xb,yb):
    L[int(ya*S):int(yb*S),int(xa*S):int(xb*S)]=3; unk[int(ya*S):int(yb*S),int(xa*S):int(xb*S)]=False
rect(1484,170,1700,942,)   # legend
rect(128,1005,740,1225)    # building number list
rect(138,858,480,972)      # bus guide
rect(1413,955,1630,1115)   # nursing inset
# fill unknown pixels with nearest known class
known=(~unk).astype(np.uint8)
dist,idx=cv2.distanceTransformWithLabels((unk).astype(np.uint8),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
# build map label->class
ys,xs=np.where(~unk)
lbl_to_cls={}
# distanceTransformWithLabels labels zero pixels with index; need coordinates of zero pixels in order
zy,zx=np.where(unk==0)
cls_zero=L[zy,zx]
Lf=L.copy()
flat=idx[unk]
Lf[unk]=cls_zero[flat-1]
L=Lf
L=L[y0:y1,x0:x1]
np.save('L_crop.npy',L)
np.save('crop_off.npy',np.array([x0,y0]))
print(L.shape)
