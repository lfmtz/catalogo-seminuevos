// Phone configurations
const WHATSAPP_PHONE = "525521787900"; // International format for Mexico (52 + 5521787900)

document.addEventListener('DOMContentLoaded', () => {
    let carsData = [];
    const carsGrid = document.getElementById('cars-grid');
    const searchInput = document.getElementById('search-input');
    const ownerFilter = document.getElementById('owner-filter');

    // Fetch and initialize catalog
    fetch('data/cars.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al cargar los datos del catálogo');
            }
            return response.json();
        })
        .then(data => {
            carsData = data;
            renderCars(carsData);
            setupFilters();
        })
        .catch(error => {
            console.error('Error fetching cars:', error);
            carsGrid.innerHTML = `<div class="empty-state">
                <p>No se pudo cargar el catálogo de autos. Inténtalo más tarde.</p>
            </div>`;
        });

    function setupFilters() {
        searchInput.addEventListener('input', applyFilters);
        ownerFilter.addEventListener('change', applyFilters);
    }

    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const ownerVal = ownerFilter.value;

        const filtered = carsData.filter(car => {
            const matchesSearch = 
                car.marca.toLowerCase().includes(query) || 
                car.modelo.toLowerCase().includes(query) ||
                car.descripcion.toLowerCase().includes(query);

            let matchesOwner = true;
            if (ownerVal === 'Único Dueño') {
                matchesOwner = car.duenos === 'Único Dueño';
            } else if (ownerVal === 'Segundo Dueño') {
                matchesOwner = car.duenos !== 'Único Dueño';
            }

            return matchesSearch && matchesOwner;
        });

        renderCars(filtered);
    }

    function renderCars(cars) {
        if (cars.length === 0) {
            carsGrid.innerHTML = `<div class="empty-state">
                <p>No se encontraron autos que coincidan con tu búsqueda.</p>
            </div>`;
            return;
        }

        carsGrid.innerHTML = '';
        cars.forEach(car => {
            const card = createCarCard(car);
            carsGrid.appendChild(card);
        });
    }

    function createCarCard(car) {
        const card = document.createElement('div');
        card.className = 'car-card';

        // Image state tracking for carousel
        let currentImageIndex = 0;
        const totalImages = car.fotos && car.fotos.length ? car.fotos.length : 0;

        // Build carrousel HTML or placeholder
        let carouselHTML = '';
        if (totalImages > 0) {
            const slidesHTML = car.fotos.map((foto, index) => `
                <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${foto}" alt="${car.marca} ${car.modelo} - Foto ${index + 1}" onerror="this.onerror=null; this.parentNode.innerHTML=getImgPlaceholder('${car.marca} ${car.modelo}');">
                </div>
            `).join('');

            const navigationHTML = totalImages > 1 ? `
                <button class="carousel-btn prev" aria-label="Foto anterior">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="carousel-btn next" aria-label="Siguiente foto">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <div class="carousel-dots">
                    ${car.fotos.map((_, index) => `<span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('')}
                </div>
            ` : '';

            carouselHTML = `
                <div class="media-carousel">
                    ${slidesHTML}
                    ${navigationHTML}
                </div>
            `;
        } else {
            carouselHTML = getImgPlaceholder(`${car.marca} ${car.modelo}`);
        }

        // WhatsApp message construction
        const waText = encodeURIComponent(`Hola, me interesa el ${car.marca} ${car.modelo}`);
        const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${waText}`;

        card.innerHTML = `
            <div class="media-container">
                <span class="owner-badge">${car.duenos}</span>
                ${carouselHTML}
            </div>
            <div class="card-body">
                <h2 class="card-title">${car.marca} ${car.modelo}</h2>
                <div class="card-price">${car.precio}</div>
                <div class="specs-grid">
                    <div class="spec-item" title="Motor">
                        <span class="spec-icon">🚗</span>
                        <span class="spec-value">${car.motor}</span>
                    </div>
                    <div class="spec-item" title="Kilometraje">
                        <span class="spec-icon">📏</span>
                        <span class="spec-value">${car.kilometraje}</span>
                    </div>
                    <div class="spec-item" title="Transmisión">
                        <span class="spec-icon">⚙️</span>
                        <span class="spec-value">${car.transmision}</span>
                    </div>
                    <div class="spec-item" title="Tenencias">
                        <span class="spec-icon">📜</span>
                        <span class="spec-value">${car.tenencias}</span>
                    </div>
                    <div class="spec-item" title="Verificación" style="grid-column: span 2;">
                        <span class="spec-icon">🛡️</span>
                        <span class="spec-value">${car.verificacion}</span>
                    </div>
                </div>
                <p class="card-description">${car.descripcion}</p>
                <div class="card-actions">
                    <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
                        </svg>
                        Preguntar por WhatsApp
                    </a>
                </div>
            </div>
        `;

        // Initialize carousel event listeners if there's navigation
        if (totalImages > 1) {
            const nextBtn = card.querySelector('.carousel-btn.next');
            const prevBtn = card.querySelector('.carousel-btn.prev');
            const slides = card.querySelectorAll('.carousel-slide');
            const dots = card.querySelectorAll('.dot');

            const updateCarousel = (newIndex) => {
                slides[currentImageIndex].classList.remove('active');
                dots[currentImageIndex].classList.remove('active');
                
                currentImageIndex = (newIndex + totalImages) % totalImages;
                
                slides[currentImageIndex].classList.add('active');
                dots[currentImageIndex].classList.add('active');
            };

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateCarousel(currentImageIndex + 1);
            });

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                updateCarousel(currentImageIndex - 1);
            });

            dots.forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetIndex = parseInt(dot.getAttribute('data-index'), 10);
                    updateCarousel(targetIndex);
                });
            });
        }

        return card;
    }
});

function getImgPlaceholder(title) {
    return `
        <div class="image-placeholder">
            <svg class="placeholder-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>${title}</span>
        </div>
    `;
}
