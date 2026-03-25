# System Design: Image to PDF Converter

This document outlines the architectural decisions, data flow, and technical trade-offs of the Image to PDF converter. It is intended for code review and as an overview of the system design.

## 1. System Overview

The Image to PDF Converter is a **100% client-side Web Application** built with vanilla HTML, CSS, and JavaScript. The primary goal is to securely, quickly, and locally convert multiple image files into a single consolidated PDF document without depending on a backend service.

### Technologies
- **Frontend Core**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Core Dependencies**: [jsPDF](https://github.com/parallax/jsPDF) (Loaded via CDN) for PDF generation.

---

## 2. Architecture & Data Flow

The architecture follows a minimal Model-View-Controller (MVC) -like pattern executed entirely within a single script (`app.js`).

### State Management
State is managed using simple global variables within the DOMContentLoaded scope.
- `selectedFiles`: An array of augmented JavaScript `File` objects. Each file is given a unique `id` (to avoid referencing issues with duplicate filenames) and an `addedIndex` (to maintain the original insertion order before any sort operations).
- `fileCounter`: An integer tracking the total number of files ever added to ensure `addedIndex` is always strictly increasing.

### Execution Flow
1. **Input Phase**:
   - The user inputs files via the Drag & Drop API or through a hidden `<input type="file">`.
   - The application intercepts the files, filters out non-image MIME types, and adds them to `selectedFiles` with unique identifiers.
2. **Reactivity & Rendering**:
   - Any state change (adding, removing, deleting, or sorting files) triggers the `updateUI()` function.
   - `updateUI()` updates macroscopic components (e.g., hiding/showing action buttons, updating total count).
   - `renderPreviews()` completely flushes and rehydrates the preview grid DOM based on the current sorted `selectedFiles` state. 
3. **File Reading (Asynchronous)**:
   - Preview thumbnails are constructed synchronously as pure DOM elements to maintain the sorted order visually.
   - The `FileReader` API fetches the Data URLs asynchronously. As each promise resolves, it binds to the respective `<img>` tag. This avoids freezing the main UI thread during heavy reads.
4. **PDF Generation Phase**:
   - Triggered by the generation block.
   - `Promise.all` surrounds `FileReader` operations to compute the intrinsic width and height of every image.
   - For each image, the `jsPDF` instance dynamically allocates a new page utilizing the image's specific dimensions (`width`, `height`) and calculates the optimal orientation (`portrait` or `landscape`).
   - The document invokes `doc.save()`, utilizing the browser's download API to output the file.

---

## 3. Key Design Decisions & Trade-offs

### 1. Client-Side Processing vs Backend Processing
* **Decision**: All image processing and PDF generation occur in the browser utilizing `jsPDF`.
* **Pros**:
  - **Zero server costs**: Infinite scalability with $0 compute overhead.
  - **Absolute Privacy**: Files never leave the user's device.
  - **Latency**: No network upload/download delays for large files.
* **Cons/Trade-offs**: 
  - **Memory constraints**: Base64 strings from `readAsDataURL` are memory-intensive. Loading 100+ high-resolution images might crash the browser tab on low-end devices due to heap memory limits. A chunked/streamed processing approach could mitigate this but is limited by jsPDF's current API capabilities.

### 2. Vanilla JS vs Frontend Framework (React, Vue)
* **Decision**: Vanilla JavaScript was chosen over a modern framework.
* **Pros**:
  - **Zero Build Step**: No Webpack/Vite configuration. It can be hosted on any static server or opened directly from the file system.
  - **Minimal bundle size**: Fast initial load times.
* **Cons/Trade-offs**:
  - **DOM Manipulation**: The DOM is manually cleared and rebuilt (`previewGrid.innerHTML = ''`) on every state change. While acceptable for tens of images, this is computationally inefficient compared to a Virtual DOM reconciliation engine for thousands of elements.

### 3. Dynamic PDF Canvas Scaling
* **Decision**: Each PDF page perfectly bounds the dimensions of its respective image, rather than enforcing a standard sheet size like A4.
* **Pros**: Maintains 100% of the image's original aspect ratio without ugly white borders, stretching, or cropping.
* **Cons**: The resulting PDF contains varying page sizes, which may behave unpredictably if sent directly to physical hardware printers without standard scaling configurations.

### 4. Unique ID Generation
* **Decision**: `Math.random().toString(36).substr(2, 9)` is used to create unique IDs.
* **Reasoning**: Two images might have the exact same filename. Identifying DOM elements strictly by `file.name` during deletion would be unsafe. While `crypto.randomUUID()` is more robust, the simple pseudo-random generator is sufficient and lightweight for client-side ephemeral sessions.

---

## 4. Potential Future Improvements

1. **Web Workers for Image Processing**: Utilizing Web Workers to compress, resize, or parse base64 strings off the main thread to prevent unresponsiveness during the PDF generation.
2. **Image Compression API**: Utilizing `<canvas>` to downscale and compress high-resolution JPEGs before injecting them into `jsPDF` to significantly reduce the final PDF file size out.
3. **Sort Persistence**: Storing preference data (like the default sort mechanism) in `localStorage`.
4. **Drag-to-Reorder**: Implementing an interactive drag-to-sort grid rather than relying entirely on preset dropdown sorting.
