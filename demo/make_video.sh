#!/usr/bin/env bash
# Cuts the screen capture from the moment Play was pressed and lays the app's own exported WAV (same notes, same recipe) under it. Captions only, no voice-over.
set -e; cd "$(dirname "$0")"; V=$(python3 -c "import json;print(json.load(open('marks.json'))['video'])"); S=$(python3 -c "import json;print(round(json.load(open('marks.json'))['play'],2))")
FONT="/usr/share/fonts/truetype/sand-box/google/Sen/Sen-VariableFont_wght.ttf"
ffmpeg -y -loglevel error -ss "$S" -i "$V" -i gallopwire-gallop-96bpm-Em.wav -t 20 -map 0:v -map 1:a \
 -vf "drawbox=y=ih-64:w=iw:h=64:color=black@0.75:t=fill,drawtext=fontfile=$FONT:text='GallopWire · MIDI keyboard holds Em C D Am B7 - Neon Gallop recipe - 96 BPM':x=24:y=h-44:fontsize=24:fontcolor=0xff8a1f:enable='lt(t\,10)',drawtext=fontfile=$FONT:text='Audio is the GallopWire 48k/24 WAV export of this take - gallopwire.vercel.app':x=24:y=h-44:fontsize=24:fontcolor=0x9fd0ff:enable='gte(t\,10)'" \
 -c:v libx264 -pix_fmt yuv420p -crf 22 -c:a aac -b:a 192k gallopwire-demo.mp4
