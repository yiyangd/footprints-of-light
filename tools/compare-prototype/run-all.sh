#!/bin/bash
# 把小样（prototype/）和正式工程逐帧同步地各跑一遍，再比较结果。
# 改了正式工程、但画面和玩法不应该变的时候（例如 M0 的后两步），用它确认真的没变。
# 用法见同一个文件夹里的 README.md。
set -e
cd "$(dirname "$0")"
rm -rf out
for device in desktop portrait landscape; do
  for lang in bi en; do
    node run-one.cjs old $device $lang &
    node run-one.cjs new $device $lang &
  done
  wait
done
echo
echo "===== 游戏状态（位置、镜头、世界、存档、界面文字、绘制次数）====="
for device in desktop portrait landscape; do
  for lang in bi en; do node diff-state.cjs $device $lang | grep -v '^   '; done
done
echo
echo "===== 截图（只列出不完全相同的）====="
for device in desktop portrait landscape; do
  for lang in bi en; do node diff-pixels.cjs $device $lang | grep -v '完全相同'; done
done
echo
echo "===== 样式规则 ====="
node diff-css.cjs | tail -1
