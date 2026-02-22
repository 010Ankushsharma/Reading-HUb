/**
 * Reading Hub - Main JavaScript
 * Client-side functionality for the Web Reading Hub application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initThemeToggle();
    initMobileMenu();
    initFileInputs();
    initFlashMessages();
    initFormValidation();
});

/**
 * Theme Toggle (Dark/Light Mode)
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    if (!themeToggle) return;
    
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle.addEventListener('click', function() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
        themeToggle.title = 'Switch to Light Mode';
    } else {
        icon.className = 'fas fa-moon';
        themeToggle.title = 'Switch to Dark Mode';
    }
}

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (!mobileToggle || !navLinks) return;
    
    mobileToggle.addEventListener('click', function() {
        navLinks.classList.toggle('active');
        
        // Animate hamburger icon
        const spans = mobileToggle.querySelectorAll('span');
        if (navLinks.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    });
    
    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const spans = mobileToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        });
    });
}

/**
 * File Input Preview
 */
function initFileInputs() {
    // Cover image file input
    const coverInput = document.getElementById('coverImageFile');
    const coverPreview = document.getElementById('coverPreview');
    
    if (coverInput && coverPreview) {
        coverInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    showNotification('Please select a valid image file', 'error');
                    coverInput.value = '';
                    return;
                }
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    coverPreview.innerHTML = `
                        <img src="${e.target.result}" alt="Preview" class="preview-image">
                        <span class="preview-text">${file.name}</span>
                        <small>Click to change image</small>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // PDF file input
    const pdfInput = document.getElementById('pdfFile');
    const pdfPreview = document.getElementById('pdfPreview');
    
    if (pdfInput && pdfPreview) {
        pdfInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                if (file.type !== 'application/pdf') {
                    showNotification('Please select a valid PDF file', 'error');
                    pdfInput.value = '';
                    return;
                }
                
                // Validate file size (50MB)
                const maxSize = 50 * 1024 * 1024;
                if (file.size > maxSize) {
                    showNotification('File size must be less than 50MB', 'error');
                    pdfInput.value = '';
                    return;
                }
                
                // Show file name
                pdfPreview.innerHTML = `
                    <i class="fas fa-file-pdf" style="color: var(--color-danger);"></i>
                    <span>${file.name}</span>
                    <small>${formatFileSize(file.size)}</small>
                `;
            }
        });
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Flash Messages Auto-dismiss
 */
function initFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    
    flashMessages.forEach(message => {
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            dismissFlashMessage(message);
        }, 5000);
    });
}

function dismissFlashMessage(message) {
    message.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
        message.remove();
    }, 300);
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

/**
 * Form Validation Enhancement
 */
function initFormValidation() {
    const forms = document.querySelectorAll('.book-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
            let isValid = true;
            
            requiredInputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                    
                    // Add error message if not exists
                    let errorMsg = input.parentElement.querySelector('.form-error');
                    if (!errorMsg) {
                        errorMsg = document.createElement('span');
                        errorMsg.className = 'form-error';
                        input.parentElement.appendChild(errorMsg);
                    }
                    errorMsg.textContent = 'This field is required';
                } else {
                    input.classList.remove('error');
                    const errorMsg = input.parentElement.querySelector('.form-error');
                    if (errorMsg) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                showNotification('Please fill in all required fields', 'error');
            }
        });
        
        // Clear error on input
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('error');
                const errorMsg = this.parentElement.querySelector('.form-error');
                if (errorMsg) {
                    errorMsg.remove();
                }
            });
        });
    });
}

/**
 * Show notification (custom flash message)
 */
function showNotification(message, type = 'success') {
    const container = document.getElementById('flashMessages');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `flash-message ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="flash-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto-dismiss
    setTimeout(() => {
        dismissFlashMessage(notification);
    }, 5000);
}

/**
 * Confirm delete action
 */
function confirmDelete(message = 'Are you sure you want to delete this item?') {
    return confirm(message);
}

/**
 * Search debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Lazy load images
 */
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

/**
 * Smooth scroll to element
 */
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close mobile menu
    if (e.key === 'Escape') {
        const navLinks = document.getElementById('navLinks');
        const mobileToggle = document.getElementById('mobileToggle');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            if (mobileToggle) {
                const spans = mobileToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    }
});

/**
 * Handle window resize
 */
let resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        // Close mobile menu on large screens
        if (window.innerWidth > 768) {
            const navLinks = document.getElementById('navLinks');
            const mobileToggle = document.getElementById('mobileToggle');
            if (navLinks) {
                navLinks.classList.remove('active');
            }
            if (mobileToggle) {
                const spans = mobileToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        }
    }, 250);
});

// Export functions for global access
window.ReadingHub = {
    showNotification,
    confirmDelete,
    formatFileSize,
    scrollToElement,
    debounce
};
