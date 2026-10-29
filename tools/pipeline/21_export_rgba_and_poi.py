# 15 のあとに実行。透過つき地面画像(public/ground.png)と、敷地の輪郭・門・バス停の座標を geom.json に追記する。
import cv2, numpy as np, json
M = 0.2131; S = 300 / 110      # 0.2131 m/px は地図の 150m スケールバーから実測
x0, y0 = [int(v) for v in np.load('crop_off.npy')]
L = np.load('L_ground.npy'); H, W = L.shape
g = json.load(open('geom.json'))
pal = np.array([(206,214,205),(176,214,160),(118,196,238),(222,224,226),(230,226,176),(222,224,226),(244,243,238)], np.uint8)
rgb = pal[L]; alpha = ((L != 3) * 255).astype(np.uint8)
tw = 2048; th = int(tw * H / W)
rgbf = cv2.resize(rgb, (tw, th), interpolation=cv2.INTER_AREA); al = cv2.resize(alpha, (tw, th), interpolation=cv2.INTER_AREA)
cv2.imwrite('ground_rgba.png', np.dstack([rgbf, al])[:, :, [2,1,0,3]], [cv2.IMWRITE_PNG_COMPRESSION, 9])
land = cv2.morphologyEx((L != 3).astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((15,15), np.uint8))
cs, _ = cv2.findContours(land, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
lp = []
for c in cs:
    if cv2.contourArea(c) < 20000: continue
    a = cv2.approxPolyDP(c, 5, True).reshape(-1, 2)
    lp.append([[round((x - W/2) * M, 1), round((y - H/2) * M, 1)] for x, y in a])
def w110(x, y): return [round((x * S - x0 - W/2) * M, 1), round((y * S - y0 - H/2) * M, 1)]
g['land'] = lp
g['poi'] = {'gate': [['西門','West Gate',*w110(712,272)],['南門','South Gate',*w110(200,468)],['東門','East Gate',*w110(435,750)],['北門(正門)','North Main Gate',*w110(942,1015)]],
            'bus': [['慶應大学本館前','Keio Daigaku Honkan Mae',*w110(686,693)],['慶應中等部前','Keio Chukotobu Mae',*w110(523,408)]],
            'area': [['鴨池(ガリバー池)','Kamoike',*w110(613,540)],['運動場','Sports Ground',*w110(1135,392)],['中高グラウンド','HS Grounds',*w110(390,575)],['テニスコート','Tennis Courts',*w110(555,805)]]}
json.dump(g, open('geom.json', 'w'), separators=(',', ':'))
