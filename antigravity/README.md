# Image to PDF Converter

A sleek, 100% offline web application that allows you to instantly convert multiple images into a single PDF document right in your browser. 

## ✨ Features

- **100% Offline Processing**: Your images are processed entirely in your web browser. No files are ever uploaded to a server, ensuring complete privacy and fast execution.
- **Drag & Drop Interface**: Easily add images by dragging and dropping them into the designated area or by using the standard file browser.
- **Image Sorting**: Automatically arrange your uploaded images by:
  - File Name (A-Z, Z-A)
  - Date Modified (Oldest, Newest)
  - File Size (Smallest, Largest)
  - Default (Insertion order)
- **Detailed Previews**: View your selected images in a modern grid layout. Each preview displays detailed file metadata beneath the image, including the filename, date modified, and file size.
- **Selective Deletion**: Easily remove individual images from your queue before generating the PDF, or clear the entire selection with one click.
- **Dynamic PDF Generation**: The generated PDF automatically adapts to the dimensions and orientation (portrait or landscape) of each individual image.
- **Modern UI**: Features a beautiful dark-themed, glassmorphism design built with vanilla HTML, CSS, and JS.

## 🚀 How to Use

1. **Open the Tool**: Simply open the `index.html` file in any modern web browser. No server setup is required.
2. **Upload Images**: Drag and drop your images (JPEG, PNG, WEBP) into the dropzone or click "Browse Files" to select them from your computer.
3. **Organize**: Use the `Sort by` dropdown to arrange your images in the order you want them to appear in the PDF.
4. **Review**: Check the preview grid to ensure all desired images are included. You can delete individual images by clicking the red 'X' button on any preview.
5. **Convert**: Click the **"Generate PDF"** button.
6. **Download**: The application will automatically process the images and download the final `Converted_Images.pdf` file to your computer.

## 🛠️ Built With

- **HTML5 & Vanilla CSS**: For structure, styling, and animations.
- **Vanilla JavaScript**: For drag-and-drop logic, file handling, and sorting.
- **[jsPDF](https://github.com/parallax/jsPDF)**: Used for generating the PDF document securely from the browser.

## 💻 Local Development

Since it's a completely client-side application, simply clone the repository and open `index.html` in your browser. No build steps or package managers are required!
