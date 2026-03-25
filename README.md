# image-to-pdf

Two implementations of an image-to-PDF converter, each built for a different context.

---

## claude — macOS Quick Action & CLI

A lightweight macOS tool to merge multiple images into a single PDF. Works as a **Finder Quick Action** (right-click menu) or as a **command-line script**. No external dependencies — uses only tools built into macOS.

**Features:**
- Merge any number of images into one PDF in a single click
- Files sorted alphabetically for predictable page order
- Output saved in the same folder as your images, with a timestamped filename
- macOS notification when the PDF is ready
- Zero dependencies — uses `sips`, `python3`, and `Quartz`, all built into macOS

**Supported formats:** JPEG, PNG, HEIC, TIFF, BMP, GIF, and any format supported by `sips`.

### Installation

**Quick Action (Finder right-click):**

```bash
cp -r "claude/Images to PDF.workflow" ~/Library/Services/
```

Or double-click `Images to PDF.workflow` to install via the macOS prompt.

**CLI:**

```bash
chmod +x claude/convert.sh
# Optionally add to PATH:
cp claude/convert.sh /usr/local/bin/images-to-pdf
```

### Usage

**Quick Action:** Select images in Finder → right-click → **Quick Actions → Images to PDF**

**CLI:**

```bash
./claude/convert.sh image1.jpg image2.png image3.heic
# or with a glob:
./claude/convert.sh ~/Desktop/photos/*.jpg
```

**Requirements:** macOS (any recent version). No additional installs needed.

---

## antigravity — Browser Web App

A sleek, 100% offline web application that converts multiple images into a single PDF entirely in the browser. No server, no uploads, no dependencies to install.

**Features:**
- 100% offline — files never leave your browser
- Drag & drop interface with file browser fallback
- Sort images by name, date modified, file size, or insertion order
- Grid preview with per-image metadata (filename, date, size)
- Selective deletion of individual images before conversion
- PDF adapts to each image's dimensions and orientation (portrait/landscape)
- Dark-themed glassmorphism UI built with vanilla HTML, CSS, and JS

**Supported formats:** JPEG, PNG, WEBP

### Usage

Open `antigravity/index.html` in any modern web browser. No server or build step required.

1. Drag & drop images into the dropzone (or click "Browse Files")
2. Sort and review the preview grid
3. Click **"Generate PDF"**
4. The file downloads automatically as `Converted_Images.pdf`

**Built with:** HTML5, Vanilla CSS/JS, and [jsPDF](https://github.com/parallax/jsPDF).
