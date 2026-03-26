const API_BASE_URL = 'http://localhost:8000/api';
let chaptersMap = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'Login.html';
        return;
    }

    // Nav Load
    try {
        const userRes = await fetch(`${API_BASE_URL}/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
            const user = await userRes.json();
            document.getElementById('navUsername').textContent = user.username.toUpperCase();
            
            const navAvatar = document.getElementById('navAvatar');
            if (user.avatar) {
                navAvatar.style.backgroundImage = `url('${user.avatar}')`;
                navAvatar.style.backgroundSize = 'cover';
                navAvatar.style.backgroundPosition = 'center';
            } else {
                navAvatar.textContent = user.username.charAt(0).toUpperCase();
            }
        }
    } catch(e) {}

    // Load Chapters
    await fetchChapters(token);

    // Controls
    document.getElementById('btnPrev').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateCarousel();
        }
    });

    document.getElementById('btnNext').addEventListener('click', () => {
        if (currentIndex < chaptersMap.length - 1) {
            currentIndex++;
            updateCarousel();
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('access_token');
        window.location.href = 'index.html';
    });
});

async function fetchChapters(token) {
    const scene = document.querySelector('.scene');
    
    try {
        const res = await fetch(`${API_BASE_URL}/story/chapters`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to load chapters");
        
        const chapters = await res.json();
        chaptersMap = chapters;
        
        scene.innerHTML = '';
        document.getElementById('carouselControls').style.display = 'flex';
        
        chapters.forEach((chapter, i) => {
            const pct = (chapter.progress / chapter.total) * 100;
            const exercisesHTML = chapter.exercises.map(ex => `
                <div class="exercise-item ${ex.solved ? 'solved' : ''}" onclick="attemptExercise('${ex.id}', ${chapter.is_unlocked})">
                    <span class="exercise-name">${ex.title}</span>
                    <span class="exercise-status">${ex.solved ? '✓' : ''}</span>
                </div>
            `).join('');

            const isLocked = !chapter.is_unlocked;
            
            const card = document.createElement('div');
            card.className = `chapter-card ${isLocked ? 'locked' : ''}`;
            card.id = `chapter-card-${i}`;
            // Let the user click a side card to focus it
            card.onclick = () => {
                if (currentIndex !== i) {
                    currentIndex = i;
                    updateCarousel();
                }
            };

            card.innerHTML = `
                <div class="chapter-header">
                    <div class="chapter-number">CAPÍTULO 0${chapter.id}</div>
                    <div class="chapter-title">${chapter.title}</div>
                    <div class="chapter-desc">${chapter.description}</div>
                </div>
                
                <div class="exercises-list">
                    ${exercisesHTML}
                </div>
                
                <div class="progress-container">
                    <div class="progress-text">
                        <span>Progreso</span>
                        <span>${chapter.progress}/${chapter.total}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
                
                ${isLocked ? `
                <div class="locked-overlay">
                    <div class="lock-icon">🔒</div>
                    <div class="lock-text">CAPÍTULO BLOQUEADO</div>
                    <div class="lock-subtext">Resuelve los desafíos del capítulo anterior para avanzar.</div>
                </div>
                ` : ''}
            `;
            
            scene.appendChild(card);
        });
        
        // Auto-focus logic: Focus on the current active chapter
        let targetIndex = chapters.findIndex(c => c.progress < c.total);
        if (targetIndex === -1) targetIndex = chapters.length - 1; // All done
        
        currentIndex = targetIndex;
        updateCarousel();

    } catch(e) {
        console.error(e);
        scene.innerHTML = '<div style="color:red; text-align:center;">Error al cargar datos.</div>';
    }
}

function updateCarousel() {
    const cards = document.querySelectorAll('.chapter-card');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled = currentIndex === cards.length - 1;

    cards.forEach((card, index) => {
        let offset = index - currentIndex;
        
        // Base translations
        let xTranslate = offset * 280; // Horizontal spacing
        let zTranslate = Math.abs(offset) * -180; // Push back adjacent cards
        let yRotate = 0;
        let scale = 1;
        let opacity = 1;
        let zIndex = 10 - Math.abs(offset);

        if (offset < 0) {
            yRotate = 40; // Tilt left cards showing right face
            scale = 0.85;
            opacity = offset < -2 ? 0 : 0.6; // Fade out far items
        } else if (offset > 0) {
            yRotate = -40; // Tilt right cards showing left face
            scale = 0.85;
            opacity = offset > 2 ? 0 : 0.6;
        } else {
            // Active center card
            yRotate = 0;
            scale = 1;
            opacity = 1;
            zIndex = 20;
        }

        // Apply transformations
        card.style.transform = `translateX(${xTranslate}px) translateZ(${zTranslate}px) rotateY(${yRotate}deg) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;

        // Pointer events: only clickable fully if front, otherwise only clicks focus it
        if (offset === 0) {
            card.style.pointerEvents = 'auto';
        } else {
            // When inactive, we disable children clicking so the user can just click the card to bring it front.
            // But we actually handle that via the root onclick. We just don't want the inner buttons clashing.
            card.style.pointerEvents = 'auto'; 
        }
    });
}

window.attemptExercise = function(exerciseId, isUnlocked) {
    if (!isUnlocked) {
        showToast("Debes desbloquear el capítulo antes de resolver este desafío.");
        return;
    }
    
    // Stop propagation so it doesn't trigger the card selection if it's somehow clicked
    event.stopPropagation();
    
    // Navigate exactly same as offline mode
    window.location.href = `SolvePage.html?id=${exerciseId}`;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}
