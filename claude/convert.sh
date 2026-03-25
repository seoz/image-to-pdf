#!/bin/bash
# Images to PDF converter
# Usage: ./convert.sh image1.jpg image2.png ...
set -e

[ $# -eq 0 ] && { echo "Usage: $0 image1 image2 ..."; exit 1; }

# Sort files alphabetically
IFS=$'\n' sorted=($(sort <<<"$(printf '%s\n' "$@")")); unset IFS

# Save PDF next to the first image
output_dir=$(dirname "${sorted[0]}")
output_path="$output_dir/Images $(date '+%Y-%m-%d %H.%M.%S').pdf"

# Temp dir, cleaned up on exit
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# Step 1: Convert each image to a temporary PDF using sips (built-in)
i=0; pdf_files=()
for f in "${sorted[@]}"; do
    out="$tmpdir/$(printf '%05d' $i).pdf"
    sips -s format pdf "$f" --out "$out" 2>/dev/null && pdf_files+=("$out")
    ((i++)) || true
done

# Step 2: Merge all temp PDFs using Python + Quartz (built into macOS)
python3 -c "
import sys
from Quartz import PDFDocument
from Foundation import NSURL

paths, output = sys.argv[1:-1], sys.argv[-1]
doc = PDFDocument.alloc().init()
for p in paths:
    src = PDFDocument.alloc().initWithURL_(NSURL.fileURLWithPath_(p))
    if src:
        for i in range(src.pageCount()):
            doc.insertPage_atIndex_(src.pageAtIndex_(i), doc.pageCount())
doc.writeToFile_(output)
" "${pdf_files[@]}" "$output_path"

echo "Saved: $output_path"

# macOS notification
osascript -e "display notification \"Saved: $(basename "$output_path")\" with title \"Images to PDF\" sound name \"Glass\""
