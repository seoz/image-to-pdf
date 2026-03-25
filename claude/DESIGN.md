# System Design: Images to PDF (macOS Quick Action)

This document describes the architecture, data flow, and technical trade-offs of the macOS Quick Action implementation. It is intended for code review and system design discussion.

---

## 1. System Overview

The tool provides two entry points for the same conversion pipeline:

| Entry Point | Mechanism | Audience |
|---|---|---|
| `Images to PDF.workflow` | Automator Quick Action (Finder right-click) | End users |
| `convert.sh` | CLI script | Developers, power users, automation |

Both entry points feed into an identical processing pipeline. No external dependencies are required — the entire tool is built on components already present in every macOS installation: `sips`, `python3`, the `Quartz` framework via PyObjC, and `osascript`.

---

## 2. Architecture

### High-Level Pipeline

```
 [Input: image files]
         │
         ▼
 ┌───────────────────┐
 │  1. Sort & Dedupe │  Alphabetical sort for deterministic page order
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │  2. Format Stage  │  sips: image → single-page PDF (per file)
 │  (sips)           │  Written to ephemeral tmpdir
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │  3. Merge Stage   │  Python + Quartz: N single-page PDFs → 1 PDF
 │  (Python/Quartz)  │
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │  4. Output        │  Timestamped filename, saved alongside input files
 └────────┬──────────┘
          │
          ▼
 ┌───────────────────┐
 │  5. Notification  │  osascript: native macOS notification
 └───────────────────┘
```

### Why Two Stages Instead of One?

The two-stage design (sips → Quartz) reflects the capabilities of the available native tools:

- `sips` excels at format conversion but cannot concatenate PDFs.
- `Quartz.PDFDocument` can merge PDFs natively but does not handle raw image formats directly.
- Splitting the work allows each tool to do what it does best and keeps the logic in each stage minimal and testable in isolation.

---

## 3. Component Breakdown

### Stage 1 — Format Conversion (`sips`)

`sips` (Scriptable Image Processing System) is a macOS system binary (`/usr/bin/sips`) that handles rasterized image manipulation. The command used is:

```bash
sips -s format pdf "$input" --out "$output.pdf"
```

This converts each source image into a single-page PDF while preserving the original pixel dimensions and aspect ratio. No resampling or compression is applied; quality is lossless.

**Why `sips` over alternatives:**

| Option | Reason Not Used |
|---|---|
| ImageMagick / `convert` | Requires a separate install (`brew`), not universally available |
| `ffmpeg` | Heavyweight; image-to-PDF is not its primary use case |
| Python `Pillow` | Requires `pip install`; not guaranteed to be present |
| Python `Quartz` directly | `PDFDocument` cannot load raw JPEG/PNG pixels directly without a raster-to-PDF step |

`sips` supports all common formats: JPEG, PNG, HEIC, TIFF, BMP, GIF, and others. It is stable across macOS versions and requires no permissions beyond reading the source file.

### Stage 2 — PDF Merge (Python + Quartz)

The merge stage runs an inline Python script via `python3 -c`:

```python
from Quartz import PDFDocument
from Foundation import NSURL

doc = PDFDocument.alloc().init()
for p in paths:
    src = PDFDocument.alloc().initWithURL_(NSURL.fileURLWithPath_(p))
    if src:
        for i in range(src.pageCount()):
            doc.insertPage_atIndex_(src.pageAtIndex_(i), doc.pageCount())
doc.writeToFile_(output)
```

`Quartz.PDFDocument` is part of macOS's native PDF engine, the same one that backs Preview.app. It is accessed via PyObjC, which ships with macOS's system Python. The merge is done by iterating pages and appending them into a new empty document.

**Why an inline Python script over a separate `.py` file?**

The conversion logic is small enough that a self-contained shell script with an embedded Python snippet is simpler to distribute and install. A separate `.py` file would require an installation step or path assumption. The trade-off is that the embedded script is harder to unit-test in isolation.

### Temp Directory and Cleanup

```bash
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
```

The `trap ... EXIT` pattern guarantees that the temporary directory is deleted whether the script exits normally, encounters an error (`set -e`), or receives a signal. This prevents temp file accumulation if the conversion fails partway through.

### Output Naming

```bash
output_path="$output_dir/Images $(date '+%Y-%m-%d %H.%M.%S').pdf"
```

The output file is written to the same directory as the first (alphabetically first) input file. The filename includes a timestamp to the second, which prevents overwriting an existing file when the tool is run multiple times on the same image set. Periods are used as separators in the time component because macOS Finder sorts files with colons in their names unexpectedly.

---

## 4. Automator Workflow Architecture

The `.workflow` bundle is an Automator Service (Quick Action). Its structure:

```
Images to PDF.workflow/
└── Contents/
    ├── Info.plist        — Declares the service to macOS Services system
    └── document.wflow    — Plist describing the workflow steps and parameters
```

**`Info.plist`** registers a service named "Images to PDF" that:
- Accepts only image files (`public.image`) from Finder.
- Does not produce output back to Finder (`serviceOutputTypeIdentifier: nothing`).

**`document.wflow`** configures a single "Run Shell Script" action with:
- `workflowTypeIdentifier: com.apple.Automator.servicesMenu` — makes it a Quick Action (appears in Finder's right-click menu and the Services menu).
- `serviceInputTypeIdentifier: com.apple.Automator.fileSystemObject.image` — Finder only shows the menu item when image files are selected.
- `inputMethod: 1` — files are passed as positional arguments (`$@`) to the shell script, not piped via stdin.

The `inputMethod: 1` choice is important: it preserves full file paths with spaces intact without requiring additional quoting or `IFS` manipulation in the script.

---

## 5. Key Design Decisions and Trade-offs

### 5.1 No External Dependencies

**Decision:** The entire pipeline uses `sips`, `python3`, `Quartz`, and `osascript` — all available on every macOS machine without any install step.

**Trade-off:** The tool is macOS-only. The same functionality could be implemented cross-platform using `img2pdf` (Python) or ImageMagick, but those require external installation. For a tool that targets Mac power users and integrates with Finder, the zero-install guarantee was prioritized.

### 5.2 Alphabetical Sort

**Decision:** Input files are sorted alphabetically before processing.

**Trade-off:** This is predictable and reproducible but may not match user intent when files have non-sequential names (e.g., `scan_final.jpg` appears after `scan_1.jpg` alphabetically). Date-based ordering (file modification time) would be more appropriate for camera roll exports, but is not accessible reliably from the file path alone in a Finder Quick Action context. The CLI entry point can always accept pre-sorted arguments.

### 5.3 Lossless Intermediate PDFs

**Decision:** `sips` writes intermediate PDFs without compression or downsampling. The Quartz merge stage also does not re-encode.

**Trade-off:** Output file sizes reflect the full resolution of the original images. A 20-megapixel HEIC photo will produce a proportionally large PDF page. This preserves quality and is the right default, but users converting large photo libraries may want an optional compression pass. A canvas-based downscale before the `sips` step could reduce output size at the cost of quality.

### 5.4 Temp Files on Disk vs. In-Memory Pipeline

**Decision:** Intermediate single-page PDFs are written to a temp directory on disk, not held in memory.

**Trade-off:** The disk-based approach adds I/O overhead (each image is written as a temp PDF, then re-read by the merge stage) but avoids holding all images in memory simultaneously. For typical use cases (tens of images), the I/O cost is negligible. For very large batches (hundreds of high-resolution photos), a purely in-memory pipeline using `CGImageSource` and `CGContext` would be faster but significantly more complex.

### 5.5 Inline `python3 -c` vs. Subprocess Call to a File

**Decision:** The Python merge logic is passed as an inline string via `python3 -c`.

**Trade-off:** Simple to distribute as part of a single-file script, but the inline string is not directly testable with a test framework. If the merge logic grew significantly, extracting it to a dedicated `merge.py` script called via `python3 /path/to/merge.py` would improve maintainability.

---

## 6. Error Handling

| Failure Mode | Behavior |
|---|---|
| No files passed | `[ $# -eq 0 ] && exit 0` — exits silently (Quick Action context) |
| `sips` fails on a file | `&&` chains the `pdf_files+=` append — bad files are skipped silently |
| `python3` / Quartz unavailable | Script exits with a non-zero code; no notification is shown |
| Output directory not writable | Python raises an exception; no notification is shown |
| Temp dir creation fails | `set -e` causes the script to abort before any processing begins |

The current error handling is appropriate for a Quick Action where surfacing shell errors to the user is not straightforward. A more robust version would use `osascript` to display an error dialog on failure.

---

## 7. Security Considerations

- **Privacy:** Files never leave the machine. All processing is local.
- **No shell injection:** File paths are always passed as quoted positional parameters (`"$f"`, `"${sorted[@]}"`), not interpolated into unquoted strings.
- **Temp file isolation:** `mktemp -d` creates a directory with mode `700` (owner-only read/write). Intermediate PDFs are not readable by other users on a shared machine.
- **No persistent side effects:** The only output is the final PDF and the macOS notification. The `trap` ensures cleanup on all exit paths.

---

## 8. Limitations

1. **macOS-only.** `sips`, `Quartz` via PyObjC, and `osascript` are Apple-specific.
2. **No progress feedback** during processing. For large batches, the Quick Action appears frozen.
3. **No custom output path.** The PDF is always saved next to the first input file.
4. **Sort is alphabetical only.** No UI to change sort order in the Quick Action.
5. **No duplicate detection.** The same file passed twice will appear twice in the output PDF.

---

## 9. Potential Improvements

1. **Error dialog on failure.** Wrap the script body in a conditional and use `osascript` to display an error alert if conversion fails, so users are not left wondering why no PDF appeared.
2. **Progress notification.** Post an initial "Converting..." notification before the pipeline begins to give users immediate feedback.
3. **Compression option.** Add a `sips -s formatOptions` flag or a canvas-based downscale step to allow smaller output files.
4. **Custom output location.** Accept an output path as an optional environment variable or argument, enabling use in automated pipelines.
5. **Parallel image conversion.** The `sips` conversion loop is sequential. For large batches, running conversions in parallel with `xargs -P` or background jobs would reduce wall-clock time.
6. **Date-based sort option.** Use `mdls -name kMDItemContentCreationDate` to sort by EXIF creation date, which is more natural for photos.
