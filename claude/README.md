# Images to PDF

A lightweight macOS tool to merge multiple images into a single PDF file. Works as a **Finder Quick Action** (right-click menu) or as a **command-line script**. No external dependencies — uses only tools built into macOS.

## Features

- Merge any number of images into one PDF in a single click
- Files are sorted alphabetically to give you predictable page order
- Output PDF is saved in the same folder as your images
- Timestamped filename prevents accidental overwrites
- macOS notification when the PDF is ready
- Zero dependencies — uses `sips`, `python3`, and `Quartz`, all built into macOS

## Supported Image Formats

Any format supported by `sips`: JPEG, PNG, HEIC, TIFF, BMP, GIF, and more.

## Installation

### Quick Action (Finder right-click)

**Option A — double-click to install:**

Double-click `Images to PDF.workflow`. macOS will prompt you to install it as a Quick Action.

**Option B — copy manually:**

```bash
cp -r "Images to PDF.workflow" ~/Library/Services/
```

### CLI Script

```bash
chmod +x convert.sh
```

Optionally move it somewhere on your `$PATH` to use it from anywhere:

```bash
cp convert.sh /usr/local/bin/images-to-pdf
```

## Usage

### Quick Action

1. Select one or more images in Finder
2. Right-click → **Quick Actions → Images to PDF**
3. A notification appears when the PDF is saved

The output file is saved in the same folder as your images, named:
```
Images 2026-03-24 10.30.00.pdf
```

### CLI

```bash
./convert.sh image1.jpg image2.png image3.heic
```

Or with a glob:

```bash
./convert.sh ~/Desktop/photos/*.jpg
```

The output path is printed to stdout when complete.

## How It Works

1. **Convert** — each image is converted to a temporary single-page PDF using `sips`
2. **Merge** — the temporary PDFs are merged in order using Python's `Quartz` framework
3. **Notify** — a macOS notification confirms the output path
4. **Clean up** — temporary files are deleted automatically

## Requirements

- macOS (any recent version)
- No additional installs needed
