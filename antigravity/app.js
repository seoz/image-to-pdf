document.addEventListener('DOMContentLoaded', () => {
    // State
    let selectedFiles = []; // Array of file objects representing images
    let fileCounter = 0; // Counter to maintain original insertion order

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const actionsArea = document.getElementById('actions-area');
    const previewGrid = document.getElementById('preview-grid');
    const rawImageCount = document.getElementById('image-count');
    const estimatedSizeContainer = document.getElementById('estimated-size-container');
    const estimatedSizeElement = document.getElementById('estimated-size');
    const sortSelect = document.getElementById('sort-select');
    const compressionSelect = document.getElementById('compression-select');
    const clearBtn = document.getElementById('clear-btn');
    const generateBtn = document.getElementById('generate-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // === Drag and Drop Events ===
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight dropzone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('dragover');
        }, false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle file input selection
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset input so same files can be selected again if needed
    });

    // Handle dropzone click (delegates to file input)
    dropzone.addEventListener('click', (e) => {
        // Prevent clicking the label from triggering it twice
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            fileInput.click();
        }
    });

    // === Core Logic ===

    function handleFiles(files) {
        // Filter out non-images
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (newFiles.length === 0) return;

        // Give each file a unique ID for easier deletion
        newFiles.forEach(f => {
            f.id = Math.random().toString(36).substr(2, 9);
            f.addedIndex = fileCounter++;
            selectedFiles.push(f);
        });

        sortFiles();
        updateUI();
    }

    // Handle sort selection change
    sortSelect.addEventListener('change', () => {
        sortFiles();
        updateUI();
    });

    compressionSelect.addEventListener('change', () => {
        updateEstimatedSize();
    });

    function sortFiles() {
        const sortType = sortSelect.value;
        
        selectedFiles.sort((a, b) => {
            if (sortType === 'name-asc') {
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortType === 'name-desc') {
                return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
            } else if (sortType === 'date-asc') {
                return a.lastModified - b.lastModified;
            } else if (sortType === 'date-desc') {
                return b.lastModified - a.lastModified;
            } else if (sortType === 'size-asc') {
                return a.size - b.size;
            } else if (sortType === 'size-desc') {
                return b.size - a.size;
            } else {
                // default
                return a.addedIndex - b.addedIndex;
            }
        });
    }

    function removeFile(id) {
        selectedFiles = selectedFiles.filter(f => f.id !== id);
        updateUI();
    }

    function clearAll() {
        selectedFiles = [];
        updateUI();
    }

    function updateUI() {
        const count = selectedFiles.length;
        rawImageCount.textContent = count;

        if (count > 0) {
            actionsArea.classList.remove('hidden');
        } else {
            actionsArea.classList.add('hidden');
        }

        updateEstimatedSize();
        renderPreviews();
    }

    function updateEstimatedSize() {
        if (selectedFiles.length === 0) {
            estimatedSizeContainer.classList.add('hidden');
            return;
        }

        let totalOriginalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
        const comp = compressionSelect.value;
        
        // Basic heuristic for estimating the PDF size
        let estimatedSize = totalOriginalSize;
        if (comp === 'low') {
            estimatedSize = totalOriginalSize * 0.70;
        } else if (comp === 'medium') {
            estimatedSize = totalOriginalSize * 0.40;
        } else if (comp === 'high') {
            estimatedSize = totalOriginalSize * 0.15;
        }
        
        // Add minor baseline overhead for PDF formatting (~2KB)
        estimatedSize += 2048;

        estimatedSizeElement.textContent = formatBytes(estimatedSize);
        estimatedSizeContainer.classList.remove('hidden');
    }

    function formatBytes(bytes, decimals = 1) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function renderPreviews() {
        previewGrid.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            // Create container synchronously to maintain order
            const div = document.createElement('div');
            div.className = 'preview-item';
            
            const dateObj = new Date(file.lastModified);
            const dateStr = dateObj.toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const sizeStr = formatBytes(file.size);

            div.innerHTML = `
                <div class="image-container">
                    <button class="delete-btn" data-id="${file.id}" aria-label="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <span class="preview-number">${index + 1}</span>
                    <img class="preview-img" src="" alt="Preview">
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-details">${dateStr} &bull; ${sizeStr}</div>
                </div>
            `;
            
            // Add event listener to delete button
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent dropzone click if within dropzone (it's not)
                removeFile(file.id);
            });

            // Append to DOM immediately
            previewGrid.appendChild(div);

            // Fetch image data asynchronously
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                const img = div.querySelector('.preview-img');
                img.src = reader.result;
            };
        });
    }

    // === PDF Generation ===

    clearBtn.addEventListener('click', clearAll);

    generateBtn.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        loadingOverlay.classList.remove('hidden');
        generateBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            
            // We need to wait for all images to load to get their dimensions
            const loadedImages = await Promise.all(selectedFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            let width = img.width;
                            let height = img.height;
                            let dataUrl = e.target.result;
                            let type = file.type;

                            const compressionLevel = compressionSelect ? compressionSelect.value : 'none';
                            if (compressionLevel !== 'none') {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                
                                let scale = 1;
                                let quality = 0.9;
                                if (compressionLevel === 'low') {
                                    scale = 0.8;
                                    quality = 0.8;
                                } else if (compressionLevel === 'medium') {
                                    scale = 0.6;
                                    quality = 0.6;
                                } else if (compressionLevel === 'high') {
                                    scale = 0.4;
                                    quality = 0.4;
                                }
                                
                                width = Math.max(1, Math.floor(width * scale));
                                height = Math.max(1, Math.floor(height * scale));
                                canvas.width = width;
                                canvas.height = height;
                                ctx.drawImage(img, 0, 0, width, height);
                                
                                type = 'image/jpeg';
                                dataUrl = canvas.toDataURL(type, quality);
                            }

                            resolve({
                                dataUrl: dataUrl,
                                width: width,
                                height: height,
                                type: type
                            });
                        };
                        img.onerror = reject;
                        img.src = e.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }));

            // Create PDF
            // We initialize empty, then add pages per image to match exactly
            let doc = null;

            loadedImages.forEach((img, i) => {
                // Determine format
                // jsPDF expects orientation: 'p' (portrait) or 'l' (landscape)
                // format: [width, height] in 'px'
                const orientation = img.width > img.height ? 'l' : 'p';
                const format = [img.width, img.height];

                let imageType = img.type.split('/')[1].toUpperCase();
                // jsPDF expects JPEG, PNG, WEBP.
                if (imageType === 'JPG') {
                    imageType = 'JPEG';
                }

                if (i === 0) {
                    // Initialize first page
                    doc = new jsPDF({
                        orientation: orientation,
                        unit: 'px',
                        format: format,
                        compress: true
                    });
                } else {
                    // Add subsequent pages
                    doc.addPage(format, orientation);
                }

                // Add image to current page
                // x, y, width, height
                doc.addImage(img.dataUrl, imageType, 0, 0, img.width, img.height);
            });

            // Download the PDF
            doc.save('Converted_Images.pdf');

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('An error occurred while generating the PDF. Please check the console.');
        } finally {
            loadingOverlay.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });
});
