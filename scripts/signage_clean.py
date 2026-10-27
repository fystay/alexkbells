"""
Paint the other gym's signage out of a tripod clip (owner's class clip, 2026-10-27).

    python3 scripts/signage_clean.py <source.mp4> <cleaned.mp4>

1. A background plate: per pixel, the most common value over the clip (the sign
   itself, even where people stand in front of it a lot of the time).
2. The sign areas (REGIONS, plus solid boxes over the banner graphics and the wall
   sign) are inpainted on that plate.
3. Per frame: camera drift and exposure are matched to the plate, pixels that
   differ from it (people in front) are kept, the rest of each sign area is
   replaced by the clean plate with a little grain. Needs opencv-python, numpy and ffmpeg.
The coordinates fit that one clip (464 x 832); check them for any other.
"""
import cv2, numpy as np, sys

def mode_plate(path, y0=280, y1=520):
    cap = cv2.VideoCapture(path); frames = []; first = None; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if first is None: first = f.copy()
        if i % 3 == 0: frames.append(f)
        i += 1
    full = np.median(np.stack(frames[::2]), 0).astype(np.uint8)
    st = np.stack([f[y0:y1] for f in frames]).astype(np.float32)
    q = (st.mean(3) // 6).astype(np.int32)
    T, h, w = q.shape
    counts = np.zeros((64, h, w), np.int32); idx = np.indices((h, w))
    for t in range(T): np.add.at(counts, (q[t], *idx), 1)
    counts = counts + np.roll(counts, 1, 0) + np.roll(counts, -1, 0)
    mode = counts.argmax(0)
    wgt = (np.abs(q - mode[None]) <= 1).astype(np.float32)[..., None]
    full[y0:y1] = ((st * wgt).sum(0) / np.maximum(wgt.sum(0), 1)).astype(np.uint8)
    return full

src,out=sys.argv[1],sys.argv[2]
ref=mode_plate(src); H,W=ref.shape[:2]
regions=[(84,296,166,496),(284,362,464,418)]
rg=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
text=np.zeros((H,W),np.uint8); reg=np.zeros((H,W),np.uint8)
for x0,y0,x1,y1 in regions:
    r=rg[y0:y1,x0:x1].astype(np.float32); base=cv2.medianBlur(rg[y0:y1,x0:x1],31).astype(np.float32)
    text[y0:y1,x0:x1]=((r-base)>10).astype(np.uint8)*255; reg[y0:y1,x0:x1]=255
text=cv2.dilate(text,np.ones((5,5),np.uint8),iterations=3)
cv2.rectangle(text,(90,326),(160,476),255,-1)
cv2.rectangle(text,(288,368),(464,412),255,-1)
plate=cv2.inpaint(ref,text,9,cv2.INPAINT_TELEA)
pb=cv2.GaussianBlur(plate,(0,0),4); tm=(cv2.GaussianBlur(text,(0,0),3)/255.0)[...,None]
plate=(pb*tm+plate*(1-tm)).astype(np.float32)
textsoft=cv2.GaussianBlur(text.astype(np.float32)/255,(0,0),2.5)
reff=ref.astype(np.float32)
y0,y1=280,520
rgf=rg[y0:y1].astype(np.float32); win=cv2.createHanningWindow((W,y1-y0),cv2.CV_32F)
cap=cv2.VideoCapture(src); fps=cap.get(cv2.CAP_PROP_FPS)
import subprocess
pr=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r',str(fps),'-i','-','-c:v','libx264','-crf','10','-preset','veryfast','-pix_fmt','yuv420p',out],stdin=subprocess.PIPE); rng=np.random.default_rng(1)
def sh(img,dx,dy):
    M=np.float32([[1,0,dx],[0,1,dy]]); return cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
while True:
    ok,f=cap.read()
    if not ok: break
    ff=f.astype(np.float32); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    (dx,dy),_=cv2.phaseCorrelate(rgf,g[y0:y1],win)
    R=sh(reff,dx,dy); P=sh(plate,dx,dy); TS=sh(textsoft,dx,dy); TM=TS>0.05
    d0=np.abs(ff-R).max(2); bgsel=(reg>0)&(~TM)&(d0<20)
    gain=(ff[bgsel].mean(0)+1)/(R[bgsel].mean(0)+1) if bgsel.sum()>200 else np.ones(3)
    d=np.abs(ff-R*gain).max(2)
    # neutral bright pixels inside the sign mask are sign text, not people
    hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    neutral=(hsv[...,1]<45)&TM
    fg=((d>30)&~neutral).astype(np.uint8)
    fg=cv2.morphologyEx(fg,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    fg=cv2.dilate(fg,np.ones((5,5),np.uint8),iterations=2)
    fgs=cv2.GaussianBlur(fg.astype(np.float32),(0,0),2)
    p=P*gain+rng.normal(0,2.2,ff.shape)
    a=(TS*(1-fgs))[...,None]
    pr.stdin.write(np.clip(ff*(1-a)+p*a,0,255).astype(np.uint8).tobytes())
pr.stdin.close(); pr.wait()
