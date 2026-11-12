"""Builds out/final.mp4 from the raw screen recording. The original is only read.

No ffmpeg on this machine, so frames are read with OpenCV and written as H.264
through Windows' built-in encoder (Media Foundation). No audio track is made.
Run from the project folder: python out/make_edit.py
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC = 'demo/2026-11-12 19-11-53.mkv'
OUT = 'out/final.mp4'
W, H, FPS = 1920, 1080, 30
VW, VH = 1680, 945              # footage sits here, top centre; captions go in the band below it
VX = (W - VW) // 2
BOLD = 'C:/Windows/Fonts/segoeuib.ttf'
REG = 'C:/Windows/Fonts/segoeui.ttf'

# kind, source start (s), source end (s), speed, caption, skipped-before label
SEGMENTS = [
    ('title', 0, 0, 0, '', ''),
    ('prompt', 0.0, 7.0, 1, 'The build prompt is pasted into Claude Code (model picker: Fable 5.2), running inside the Antigravity IDE, and sent.', ''),
    ('run', 7.0, 23.0, 8, 'The agent starts: it checks the folder and begins thinking.', ''),
    ('run', 556.5, 562.5, 1, 'About nine minutes later the agent writes its plan, PLAN.md.', 'time skipped: 9 min'),
    ('run', 780.0, 844.0, 8, 'It writes the maths and mistake-catalog file, then smoke-tests it.', 'time skipped: 4 min'),
    ('run', 1325.0, 1389.0, 8, 'It fixes a graph label, writes the test page and runs it. The first run reports a failed check.', 'time skipped: 8 min'),
    ('run', 2110.0, 2114.0, 1, "The account's 5-hour usage limit stops the run.", 'time skipped: 12 min'),
    ('resume', 2267.0, 2275.0, 1, "Recording was paused until the limit reset. A second message, 'resume where you left off', restarts the run.", 'time skipped + recording paused'),
    ('run', 2520.0, 2584.0, 8, 'After resuming, the agent reviews screenshots of its own app and patches it.', 'time skipped: 4 min'),
    ('run', 2931.0, 2937.0, 1, "After more fixes, the agent's test run comes back: ALL GROUPS PASS.", 'time skipped: 6 min'),
    ('app', 3681.0, 3696.0, 1, 'The finished app in a browser: a wrong answer, 42, is checked and drawn beside the correct one.', 'time skipped: 12 min'),
    ('end', 0, 0, 0, '', ''),
]
CARD_SECONDS = 3.0


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, fnt, width):
    lines, cur = [], ''
    for word in text.split():
        t = (cur + ' ' + word).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur); cur = word
    if cur:
        lines.append(cur)
    return lines


def overlay(caption, badge, skipped):
    """RGBA layer with the caption band text and the small labels."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if caption:
        f = font(BOLD, 44)
        lines = wrap(d, caption, f, W - 160)
        if len(lines) > 2:
            f = font(BOLD, 38); lines = wrap(d, caption, f, W - 120)
        lh = f.size + 10
        y = VH + (H - VH - lh * len(lines)) // 2 - 2
        for ln in lines:
            x = (W - d.textlength(ln, font=f)) // 2
            d.text((x, y), ln, font=f, fill=(255, 255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0, 255))
            y += lh
    if badge:
        f = font(BOLD, 54)
        tw = d.textlength(badge, font=f)
        x, y = VX + VW - tw - 46, 70
        d.rounded_rectangle((x - 18, y - 6, x + tw + 18, y + 70), 12, fill=(0, 0, 0, 215))
        d.text((x, y), badge, font=f, fill=(255, 221, 51, 255))
    if skipped:
        f = font(BOLD, 40)
        tw = d.textlength(skipped, font=f)
        x, y = VX + 40, 70
        d.rounded_rectangle((x - 16, y - 6, x + tw + 16, y + 56), 12, fill=(0, 0, 0, 215))
        d.text((x, y), skipped, font=f, fill=(255, 255, 255, 255))
    arr = np.array(img)
    return arr[:, :, :3][:, :, ::-1].astype(np.float32), arr[:, :, 3:4].astype(np.float32) / 255.0


def card(lines):
    img = Image.new('RGB', (W, H), (18, 18, 20))
    d = ImageDraw.Draw(img)
    total = sum(sz + gap for _, sz, _, gap in lines)
    y = (H - total) // 2
    for text, sz, bold, gap in lines:
        f = font(BOLD if bold else REG, sz)
        for ln in wrap(d, text, f, W - 240):
            d.text(((W - d.textlength(ln, font=f)) // 2, y), ln, font=f, fill=(255, 255, 255))
            y += sz + 12
        y += gap
    return np.array(img)[:, :, ::-1].copy()


def ease(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def place(frame, crop=None):
    """Footage into the 1680x945 window on a black 1920x1080 canvas."""
    if crop is not None:
        x0, y0, x1, y1 = crop
        frame = frame[y0:y1, x0:x1]
    small = cv2.resize(frame, (VW, VH), interpolation=cv2.INTER_AREA if frame.shape[1] >= VW else cv2.INTER_CUBIC)
    canvas = np.zeros((H, W, 3), np.uint8)
    canvas[0:VH, VX:VX + VW] = small
    return canvas


def blend(canvas, layer):
    rgb, a = layer
    return (canvas.astype(np.float32) * (1 - a) + rgb * a).astype(np.uint8)


def main():
    cap = cv2.VideoCapture(SRC)
    src_fps = cap.get(cv2.CAP_PROP_FPS)
    info = {'file': SRC, 'width': int(cap.get(3)), 'height': int(cap.get(4)), 'fps': src_fps,
            'frames': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)), 'bytes': os.path.getsize(SRC)}
    info['seconds'] = info['frames'] / src_fps
    vw = cv2.VideoWriter(OUT, cv2.CAP_MSMF, cv2.VideoWriter_fourcc(*'H264'), FPS, (W, H))
    assert vw.isOpened(), 'H.264 writer did not open'
    timeline, n_out = [], 0

    for kind, s0, s1, speed, caption, skipped in SEGMENTS:
        start_out = n_out / FPS
        if kind == 'title':
            img = card([('Residual: see the gap between your answer and the right one', 76, True, 40),
                        ('Built from one prompt with Claude Code, inside the Antigravity IDE', 46, False, 0)])
            for _ in range(int(CARD_SECONDS * FPS)):
                vw.write(img); n_out += 1
        elif kind == 'end':
            img = card([('Residual. One prompt, four topics.', 84, True, 36),
                        ("One build prompt, plus one 'resume' message after a usage limit.", 38, False, 60),
                        ('[ your name here ]', 46, False, 0)])
            for _ in range(int(CARD_SECONDS * FPS)):
                vw.write(img); n_out += 1
        else:
            step = int(round(src_fps / FPS * speed))            # source frames per output frame
            first = int(round(s0 * src_fps)); last = int(round(s1 * src_fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, first)
            badge = '%dx' % speed if speed > 1 else ''
            lay_cut = overlay(caption, badge, skipped)
            lay = overlay(caption, badge, '')
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
                    # slow push-in on the prompt box and model picker, hold, then pull back after sending
                    z = 1 + 0.7 * (ease(t / 1.6) - ease((t - 3.15) / 1.2))
                    cw, ch = 1920 / z, 1080 / z
                    cx = 960 + (980 - 960) * (z - 1) / 0.7
                    cy = 540 + (850 - 540) * (z - 1) / 0.7
                    x0 = int(max(0, min(1920 - cw, cx - cw / 2))); y0 = int(max(0, min(1080 - ch, cy - ch / 2)))
                    crop = (x0, y0, int(x0 + cw), int(y0 + ch))
                canvas = place(frame, crop)
                vw.write(blend(canvas, lay_cut if (skipped and t < 2.5) else lay))
                n_out += 1; k += 1
        timeline.append({'kind': kind, 'out_start': round(start_out, 2), 'out_end': round(n_out / FPS, 2),
                         'src_start': s0, 'src_end': s1, 'speed': speed, 'caption': caption, 'skipped': skipped})
        print(kind, timeline[-1]['out_start'], timeline[-1]['out_end'], flush=True)
    vw.release()

    def ts(x):
        ms = int(round(x * 1000)); return '%02d:%02d:%02d,%03d' % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
    srt, i = [], 1
    for seg in timeline:
        text = seg['caption']
        if seg['kind'] == 'title':
            text = 'Residual: see the gap between your answer and the right one. Built from one prompt with Claude Code, inside the Antigravity IDE.'
        if seg['kind'] == 'end':
            text = "Residual. One prompt, four topics. (One build prompt, plus one 'resume' message after a usage limit.)"
        pre = ('[' + seg['skipped'] + '] ' if seg['skipped'] else '') + ('[' + str(seg['speed']) + 'x] ' if seg['speed'] > 1 else '')
        srt += [str(i), ts(seg['out_start']) + ' --> ' + ts(seg['out_end'] - 0.04), pre + text, '']
        i += 1
    open('out/captions.srt', 'w', encoding='utf-8', newline='\n').write('\n'.join(srt))
    json.dump({'source': info, 'timeline': timeline, 'seconds': n_out / FPS}, open('out/timeline.json', 'w', encoding='utf-8'), indent=1)
    print('done', n_out / FPS, 's')


if __name__ == '__main__':
    main()
