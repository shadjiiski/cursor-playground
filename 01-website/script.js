// Cookie consent functionality
function checkCookieConsent() {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === null) {
        const modal = document.getElementById('cookie-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
}

function setCookieConsent(accepted) {
    localStorage.setItem('cookieConsent', accepted);
    const modal = document.getElementById('cookie-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    if (accepted) {
        // Initialize analytics or other cookies here
        console.log('Cookies accepted');
    } else {
        // Remove any non-essential cookies here
        console.log('Cookies rejected');
    }
}

// Initialize cookie consent
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for cookie consent buttons
    const acceptBtn = document.querySelector('.cookie-btn.accept');
    const rejectBtn = document.querySelector('.cookie-btn.reject');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => setCookieConsent(true));
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => setCookieConsent(false));
    }
    
    // Check cookie consent after a short delay to ensure DOM is fully loaded
    setTimeout(checkCookieConsent, 100);
});

// Language switching functionality
let currentLang = 'bg';

// Initialize with Bulgarian language
document.addEventListener('DOMContentLoaded', () => {
    updateLanguage('bg');
});

function updateLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    
    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });

    // Update all translatable elements
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.dataset.translate;
        const value = getTranslation(key, lang);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = value;
        } else {
            element.textContent = value;
        }
    });
}

function getTranslation(key, lang) {
    const keys = key.split('.');
    let value = translations[lang];
    
    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return key; // Return the key if translation not found
        }
    }
    
    return value || key;
}

// Initialize language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        updateLanguage(lang);
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Form handling with GDPR compliance
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Add timestamp and consent information
        data.timestamp = new Date().toISOString();
        data.cookieConsent = localStorage.getItem('cookieConsent') === 'true';
        
        // Here you would typically send the data to a server
        // For now, we'll just show a success message
        const successMessage = currentLang === 'en' 
            ? 'Thank you for your message! We will get back to you soon.'
            : 'Благодарим ви за съобщението! Ще се свържем с вас скоро.';
        alert(successMessage);
        this.reset();
        
        // Log the form submission (in a real application, this would be sent to a server)
        console.log('Form submitted with data:', data);
    });
}

// Add active class to navigation items on scroll
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 60) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
}); 