"""Builds out/final_v2.mp4.

Part 1 (title, prompt entry, agent run) is rendered again from the original
screen recording with exactly the same cuts, speeds, labels and captions as
out/final.mp4 (the list is imported from make_edit.py, first ten entries).
Part 2 is the app demo, cut from the clips in demo/ that the agent recorded
from the real app. Part 3 is the end card. No audio.
Run from the project folder: python out/make_edit_v2.py
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_edit as v1

OUT = 'out/final_v2.mp4'
W, H, FPS, VW, VH, VX = v1.W, v1.H, v1.FPS, v1.VW, v1.VH, v1.VX
NAME = 'Julian Miguel Vibar'
DEMO_LABEL = 'App demo recorded by the agent after the build'

# clip file, start (s), end (s), caption
DEMO = [
    ('02-slope', 16.0, 23.0, '1. Slope: the base fare, 2, was given as the slope. The app names the mix-up and replays the steps.'),
    ('10-correct', 8.8, 12.8, '2. Slope again: the correct answer, 3, is accepted. Both pictures match.'),
    ('03-two-lines', 19.5, 24.5, '3. Two lines: a wrong choice. Your picture never crosses; the correct one crosses at 5 km.'),
    ('11-parallel', 22.5, 26.5, '3. Parallel lines: the same rate per km, so the gap stays the same and they never meet.'),
    ('04-curve-slope', 42.5, 47.5, '4. Slope of a curve: the gap h shrinks and the dashed line swings onto the tangent.'),
    ('05-area', 24.3, 31.3, '5. Area: the slice sweeps across, then 4, 8, 16 and 100 rectangles close in on the exact area.'),
    ('06-closing', 43.5, 48.5, '6. Closing step: the slope of the distance curve equals the height of the speed curve.'),
    ('07-taglish', 9.5, 14.5, '7. Language toggle: the same caption switches from English to Taglish.'),
    ('12-plain-graph', 13.5, 17.5, '8. Plain graph: m is dragged below zero and the line goes down.'),
    ('08-phone', 16.5, 20.5, '9. Phone width, 375 pixels: the same slope question, checked.'),
    ('09-tests', 102.6, 107.6, "10. The app's own test page after its run: all groups pass, with the seed."),
]


def demo_canvas(frame):
    """A demo frame under a 45 px label strip, above the caption band."""
    canvas = np.zeros((H, W, 3), np.uint8)
    fh, fw = frame.shape[:2]
    scale = min(1600 / fw, 900 / fh)
    nw, nh = int(round(fw * scale)), int(round(fh * scale))
    small = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA)
    x = (W - nw) // 2
    canvas[45:45 + nh, x:x + nw] = small
    return canvas


def label_layer(caption):
    rgb, a = v1.overlay(caption, '', '')
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = v1.font(v1.BOLD, 30)
    d.text(((W - d.textlength(DEMO_LABEL, font=f)) // 2, 2), DEMO_LABEL, font=f, fill=(255, 221, 51, 255))
    arr = np.array(img)
    a2 = arr[:, :, 3:4].astype(np.float32) / 255.0
    rgb = rgb * (1 - a2) + arr[:, :, :3][:, :, ::-1].astype(np.float32) * a2
    return rgb, np.maximum(a, a2)


def main():
    vw = cv2.VideoWriter(OUT, cv2.CAP_MSMF, cv2.VideoWriter_fourcc(*'H264'), FPS, (W, H))
    assert vw.isOpened()
    timeline, n = [], 0
    cap = cv2.VideoCapture(v1.SRC)
    src_fps = cap.get(cv2.CAP_PROP_FPS)

    # ---- part 1: the user's own recording, same edit as final.mp4 ----
    for kind, s0, s1, speed, caption, skipped in v1.SEGMENTS[:10]:
        start = n / FPS
        if kind == 'title':
            img = v1.card([('Residual: see the gap between your answer and the right one', 76, True, 40),
                           ('Built from one prompt with Claude Code, inside the Antigravity IDE', 46, False, 0)])
            for _ in range(int(v1.CARD_SECONDS * FPS)):
                vw.write(img); n += 1
        else:
            step = int(round(src_fps / FPS * speed))
            first, last = int(round(s0 * src_fps)), int(round(s1 * src_fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, first)
            badge = '%dx' % speed if speed > 1 else ''
            lay_cut, lay = v1.overlay(caption, badge, skipped), v1.overlay(caption, badge, '')
            k, pos = 0, first
            while pos < last:
                ok, frame = cap.read()
                if not ok:
                    break
                for _ in range(step - 1):
                    cap.grab()
                pos += step
                t = k / FPS
                crop = None
                if kind == 'prompt':
                    z = 1 + 0.7 * (v1.ease(t / 1.6) - v1.ease((t - 3.15) / 1.2))
                    cw, ch = 1920 / z, 1080 / z
                    cx = 960 + (980 - 960) * (z - 1) / 0.7
                    cy = 540 + (850 - 540) * (z - 1) / 0.7
                    x0 = int(max(0, min(1920 - cw, cx - cw / 2))); y0 = int(max(0, min(1080 - ch, cy - ch / 2)))
                    crop = (x0, y0, int(x0 + cw), int(y0 + ch))
                vw.write(v1.blend(v1.place(frame, crop), lay_cut if (skipped and t < 2.5) else lay))
                n += 1; k += 1
        timeline.append({'part': 'my recording', 'kind': kind, 'out_start': round(start, 2), 'out_end': round(n / FPS, 2),
                         'source': v1.SRC if kind != 'title' else 'card', 'src_start': s0, 'src_end': s1, 'speed': speed,
                         'caption': caption, 'label': ' '.join(x for x in (skipped, ('%dx' % speed if speed > 1 else '')) if x)})
        print(kind, timeline[-1]['out_start'], timeline[-1]['out_end'], flush=True)

    # ---- part 2: app demo recorded by the agent ----
    for i, (clip, s0, s1, caption) in enumerate(DEMO):
        start = n / FPS
        text = (DEMO_LABEL + '. ' if i == 0 else '') + caption
        c = cv2.VideoCapture('demo/' + clip + '.mp4')
        c.set(cv2.CAP_PROP_POS_MSEC, s0 * 1000)
        lay = label_layer(caption)
        for _ in range(int(round((s1 - s0) * FPS))):
            ok, frame = c.read()
            if not ok:
                break
            vw.write(v1.blend(demo_canvas(frame), lay)); n += 1
        timeline.append({'part': 'agent demo', 'kind': 'demo', 'out_start': round(start, 2), 'out_end': round(n / FPS, 2),
                         'source': 'demo/' + clip + '.mp4', 'src_start': s0, 'src_end': s1, 'speed': 1, 'caption': text, 'label': DEMO_LABEL})
        print(clip, timeline[-1]['out_start'], timeline[-1]['out_end'], flush=True)

    # ---- part 3: end card ----
    start = n / FPS
    img = v1.card([('Residual. One prompt, four topics.', 84, True, 36),
                   ("One build prompt, plus one 'resume' message after a usage limit.", 38, False, 60),
                   (NAME, 50, False, 0)])
    for _ in range(int(v1.CARD_SECONDS * FPS)):
        vw.write(img); n += 1
    timeline.append({'part': 'card', 'kind': 'end', 'out_start': round(start, 2), 'out_end': round(n / FPS, 2), 'source': 'card',
                     'src_start': 0, 'src_end': 0, 'speed': 0, 'caption': "Residual. One prompt, four topics. (One build prompt, plus one 'resume' message after a usage limit.) " + NAME, 'label': ''})
    vw.release()

    def ts(x):
        ms = int(round(x * 1000)); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
    srt = []
    for i, seg in enumerate(timeline, 1):
        text = seg['caption'] or 'Residual: see the gap between your answer and the right one. Built from one prompt with Claude Code, inside the Antigravity IDE.'
        pre = ''.join('[' + x + '] ' for x in ([seg['label']] if seg['part'] == 'my recording' and seg['label'] else []))
        srt += [str(i), ts(seg['out_start']) + ' --> ' + ts(seg['out_end'] - 0.04), pre + text, '']
    open('out/captions_v2.srt', 'w', encoding='utf-8', newline='\n').write('\n'.join(srt))
    json.dump({'timeline': timeline, 'seconds': n / FPS}, open('out/timeline_v2.json', 'w', encoding='utf-8'), indent=1)
    print('done', n / FPS)


if __name__ == '__main__':
    main()
