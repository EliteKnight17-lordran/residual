"""Turns the frames saved by record.js into one .mp4 per clip, in real time.

Each browser frame is held until the moment the next one arrived, so the video
runs at the speed the app ran. Output: MPEG-4 video (mp4v) in an .mp4 file,
30 frames per second, no audio.

Usage: python demo/encode.py <framesDir> [clip names...]
"""
import json, os, sys
import cv2

FPS = 30
root = sys.argv[1]
want = sys.argv[2:]
out_dir = os.path.dirname(os.path.abspath(__file__))
summary = {}

for name in sorted(os.listdir(root)):
    d = os.path.join(root, name)
    if not os.path.isfile(os.path.join(d, 'meta.json')) or (want and name not in want):
        continue
    meta = json.load(open(os.path.join(d, 'meta.json'), encoding='utf-8'))
    frames = meta['frames']
    first = cv2.imread(os.path.join(d, '%06d.jpg' % frames[0]['i']))
    h, w = first.shape[:2]
    w2, h2 = w - w % 2, h - h % 2
    out = os.path.join(out_dir, name + '.mp4')
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), FPS, (w2, h2))
    assert vw.isOpened(), 'encoder did not open'
    start = frames[0]['ts']
    # the last frame is held until the recording was stopped
    length = max(frames[-1]['ts'] - start, meta['endWall'] - meta['startWall'])
    total = int(round(length * FPS))
    k, cur, written = 0, first, 0
    for n in range(total):
        t = start + n / FPS
        moved = False
        while k + 1 < len(frames) and frames[k + 1]['ts'] <= t:
            k += 1
            moved = True
        if moved:
            img = cv2.imread(os.path.join(d, '%06d.jpg' % frames[k]['i']))
            if img is not None:
                if img.shape[:2] != (h, w):
                    img = cv2.resize(img, (w, h))
                cur = img
        vw.write(cur[:h2, :w2])
        written += 1
    vw.release()
    summary[name] = {'file': name + '.mp4', 'seconds': round(written / FPS, 1), 'width': w2, 'height': h2,
                     'source_frames': len(frames), 'bytes': os.path.getsize(out), 'steps': meta['steps'],
                     'notes': meta['notes'], 'errors': meta['errors']}
    print('%s  %.1f s  %dx%d  %d source frames  %.1f MB' % (name + '.mp4', written / FPS, w2, h2, len(frames), os.path.getsize(out) / 1e6))

json.dump(summary, open(os.path.join(root, 'summary.json'), 'w', encoding='utf-8'), indent=1)
