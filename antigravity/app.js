document.addEventListener('DOMContentLoaded', () => {
    // State
    let selectedFiles = []; // Array of file objects representing images

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const actionsArea = document.getElementById('actions-area');
    const previewGrid = document.getElementById('preview-grid');
    const rawImageCount = document.getElementById('image-count');
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
            selectedFiles.push(f);
        });

        updateUI();
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

        renderPreviews();
    }

    function renderPreviews() {
        previewGrid.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const reader = new FileReader();

            reader.readAsDataURL(file);
            reader.onloadend = () => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <button class="delete-btn" data-id="${file.id}" aria-label="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <span class="preview-number">${index + 1}</span>
                    <img src="${reader.result}" alt="Preview">
                `;
                
                // Add event listener to delete button
                const deleteBtn = div.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent dropzone click if within dropzone (it's not)
                    removeFile(file.id);
                });

                previewGrid.appendChild(div);
            }
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
                            resolve({
                                dataUrl: e.target.result,
                                width: img.width,
                                height: img.height,
                                type: file.type
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
                        format: format
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
