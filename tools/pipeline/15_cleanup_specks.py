# 14 のあとに実行(会話中に直接実行した処理を、再現できるよう保存)。小さな黒点・白点を周囲の色に置き換える。
import cv2, numpy as np
L = np.load('L_ground.npy')
g = (L == 3).astype(np.uint8)
n, lb, st, _ = cv2.connectedComponentsWithStats(g, connectivity=8)
k = np.ones((9, 9), np.uint8)
for i in range(1, n):
    if st[i, 4] < 40000:
        m = (lb == i).astype(np.uint8)
        ring = cv2.dilate(m, k) - m
        vals = L[ring > 0]; vals = vals[vals != 3]
        if len(vals): L[m > 0] = np.bincount(vals).argmax()
for cls, other in ((6, 1), (1, 6)):
    w = (L == cls).astype(np.uint8)
    n, lb, st, _ = cv2.connectedComponentsWithStats(w, connectivity=8)
    for i in range(1, n):
        if st[i, 4] < 900:
            L[lb == i] = other if cls == 6 else 6
L = cv2.medianBlur(L, 5)
np.save('L_ground.npy', L)
