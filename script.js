

const header         = document.querySelector('header');
const sections       = document.querySelectorAll("div[id]");
const navLinks       = document.querySelectorAll(".side-nav a");
const videoPlayer    = document.getElementById('video-player');
const videoFrame     = document.getElementById('videoFrame');
const songsContainer = document.getElementById('songs-container');

let currentlyPlayingSong = null;
let currentActiveColumn  = null;
let galleryImages        = [];
let currentModalIndex    = 0;


async function loadSongs() {
    try {
        const res  = await fetch('songs.txt');
        const text = await res.text();
        const lines = text.trim().split('\n');

        const songsPerColumn = Math.ceil(lines.length / 3);
        const columns = [[], [], []];

        lines.forEach((line, i) => {
            const [rawTitle, rawVideo] = line.split('|');
            const title = rawTitle ? rawTitle.trim() : '';
            const video = rawVideo ? rawVideo.trim() : '';
            const col   = Math.floor(i / songsPerColumn);
            if (col < 3 && title) {
                columns[col].push({ title, video, hasVideo: video && video !== '' && !video.includes('example') });
            }
        });

        columns.forEach((songs, colIndex) => {
            if (!songs.length) return;
            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 mb-3';
            col.dataset.column = colIndex;

            const ul = document.createElement('ul');
            ul.className = 'list-group';

            songs.forEach((song, idx) => {
                const li = document.createElement('li');
                li.className = 'list-group-item song-item';
                li.dataset.songId = `${colIndex}-${idx}`;

                const shimmer = document.createElement('span');
                shimmer.className = 'item-shimmer';
                li.appendChild(shimmer);

                if (song.hasVideo) {
                    li.dataset.video = song.video;
                    li.innerHTML += `<span class="song-title">${song.title}</span><span class="play-icon">💿</span>`;
                    li.addEventListener('click', () => toggleVideo(song.video, li, col));
                } else {
                    li.classList.add('no-video');
                    li.innerHTML += `<span class="song-title">${song.title}</span><span class="no-video-label">// скоро</span>`;
                }
                ul.appendChild(li);
            });

            col.appendChild(ul);
            songsContainer.appendChild(col);
        });
    } catch (e) {
        console.error('Songs error:', e);
        songsContainer.innerHTML = `<div class="col-12"><div class="placeholder-message"><div class="placeholder-icon">🎵</div><div class="placeholder-text">Ошибка загрузки</div></div></div>`;
    }
}

function toggleVideo(url, el, col) {
    const id = el.dataset.songId;
    if (currentlyPlayingSong === id) { closeVideo(); return; }
    if (currentlyPlayingSong) {
        const prev = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (prev) prev.classList.remove('active');
    }
    const vid = getYouTubeId(url);
    if (!vid) return;
    videoFrame.src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
    videoPlayer.classList.add('active');
    el.classList.add('active');
    songsContainer.classList.add('playing');
    if (currentActiveColumn) currentActiveColumn.classList.remove('active-column');
    col.classList.add('active-column');
    currentActiveColumn  = col;
    currentlyPlayingSong = id;
    setTimeout(() => videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
}

function closeVideo() {
    videoFrame.src = '';
    videoPlayer.classList.remove('active');
    songsContainer.classList.remove('playing');
    if (currentlyPlayingSong) {
        const el = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (el) el.classList.remove('active');
    }
    if (currentActiveColumn) { currentActiveColumn.classList.remove('active-column'); currentActiveColumn = null; }
    currentlyPlayingSong = null;
}

function getYouTubeId(url) {
    const m = url.match(/^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
    return (m && m[7].length === 11) ? m[7] : null;
}

/* ============================================================
   ALBUM
   ============================================================ */

async function loadAlbumImage() {
    try {
        const res  = await fetch('album.txt');
        const text = await res.text();
        const src  = text.trim().split('\n')[0];
        if (!src) return;
        const img = document.createElement('img');
        img.src = src.trim();
        img.className = 'img-fluid my-3';
        img.alt = 'Roselia Album';
        img.onerror = () => { img.src = 'https://via.placeholder.com/800x400/0e0b1c/3344AA?text=Album'; };
        img.addEventListener('click', () => {
            const idx = galleryImages.indexOf(src.trim());
            openModal(idx >= 0 ? idx : -1, src.trim());
        });
        document.getElementById('album-container').appendChild(img);
    } catch (e) { console.error('Album error:', e); }
}

/* ============================================================
   SCROLL / NAV HIGHLIGHT
   ============================================================ */

window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
    const pos = window.scrollY + 150;
    sections.forEach(sec => {
        if (pos >= sec.offsetTop && pos < sec.offsetTop + sec.offsetHeight) {
            navLinks.forEach(l => l.classList.remove('active'));
            const a = document.querySelector(`.side-nav a[href="#${sec.id}"]`);
            if (a) a.classList.add('active');
        }
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape')      { closeVideo(); closeModal(); }
    if (e.key === 'ArrowRight')  navigateModal(1);
    if (e.key === 'ArrowLeft')   navigateModal(-1);
});


let carouselViewport = null;
let carouselItemWidth = 0;   // card width + gap
let carouselRealCount = 0;
let carouselCloneCount = 0;  // clones on each side
let isDragging = false;
let dragStartX = 0;
let dragScrollStart = 0;
let hasDragged = false;

function buildCarousel(images) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';

    if (!images.length) {
        container.innerHTML = '<div class="gallery-loading">// изображений не найдено</div>';
        return;
    }

    carouselRealCount  = images.length;
    // Enough clones to fill viewport on either side (we clone the whole set)
    carouselCloneCount = images.length;

    const outer    = document.createElement('div');
    outer.className = 'gallery-carousel-outer';

    const viewport = document.createElement('div');
    viewport.className = 'gallery-carousel-viewport';
    viewport.id = 'carouselViewport';

    const track = document.createElement('div');
    track.className = 'carousel-track';
    track.id = 'carouselTrack';

    // tail clones (end of real set, placed at start)
    for (let i = images.length - carouselCloneCount; i < images.length; i++) {
        const real = ((i % images.length) + images.length) % images.length;
        track.appendChild(makeCard(images[real], real, true));
    }
    // real items
    images.forEach((src, i) => track.appendChild(makeCard(src, i, false)));
    // head clones (start of real set, placed at end)
    for (let i = 0; i < carouselCloneCount; i++) {
        track.appendChild(makeCard(images[i], i, true));
    }

    viewport.appendChild(track);
    outer.appendChild(viewport);
    container.appendChild(outer);

    carouselViewport = viewport;

    // Measure card width after paint
    requestAnimationFrame(() => {
        const firstCard = track.querySelector('.carousel-item-card');
        if (!firstCard) return;
        const gap = 16; // matches CSS gap
        carouselItemWidth = firstCard.offsetWidth + gap;

        // Jump to real start (skip tail clones)
        const initialScroll = carouselCloneCount * carouselItemWidth;
        viewport.scrollLeft = initialScroll;

        // Seamless loop listener
        viewport.addEventListener('scroll', onCarouselScroll, { passive: true });
    });

    attachDragListeners(viewport);
}

function makeCard(src, realIndex, isClone) {
    const card = document.createElement('div');
    card.className = 'carousel-item-card';
    if (isClone) card.setAttribute('aria-hidden', 'true');

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Roselia ${realIndex + 1}`;
    img.loading = 'lazy';
    img.draggable = false;
    img.onerror = () => { img.src = 'https://via.placeholder.com/265x170/0e0b1c/3344AA?text=Roselia'; };

    const overlay = document.createElement('div');
    overlay.className = 'carousel-overlay';
    overlay.textContent = '🔍';

    // Only real cards open modal
    if (!isClone) {
        card.addEventListener('click', () => {
            if (!hasDragged) openModal(realIndex);
        });
    }

    card.appendChild(img);
    card.appendChild(overlay);
    return card;
}

/* Seamless loop — jump on boundary */
function onCarouselScroll() {
    if (!carouselViewport || carouselItemWidth === 0) return;
    const vp     = carouselViewport;
    const scroll = vp.scrollLeft;
    const realWidth  = carouselRealCount  * carouselItemWidth;
    const cloneWidth = carouselCloneCount * carouselItemWidth;

    // Past head clones → jump back to real start
    if (scroll >= cloneWidth + realWidth) {
        vp.scrollLeft = scroll - realWidth;
    }
    // Past tail clones → jump forward to real end
    if (scroll <= 0) {
        vp.scrollLeft = scroll + realWidth;
    }
}

/* Drag-to-scroll */
function attachDragListeners(vp) {
    vp.addEventListener('mousedown', e => {
        isDragging    = true;
        hasDragged    = false;
        dragStartX    = e.pageX;
        dragScrollStart = vp.scrollLeft;
        vp.classList.add('grabbing');
        e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.pageX - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        vp.scrollLeft = dragScrollStart - dx;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        carouselViewport && carouselViewport.classList.remove('grabbing');
        setTimeout(() => { hasDragged = false; }, 50);
    });

    // Touch
    vp.addEventListener('touchstart', e => {
        dragStartX    = e.touches[0].pageX;
        dragScrollStart = vp.scrollLeft;
        hasDragged    = false;
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
        const dx = e.touches[0].pageX - dragStartX;
        if (Math.abs(dx) > 4) hasDragged = true;
        vp.scrollLeft = dragScrollStart - dx;
    }, { passive: true });

    vp.addEventListener('touchend', () => {
        setTimeout(() => { hasDragged = false; }, 100);
    }, { passive: true });
}

async function loadGallery() {
    try {
        const res  = await fetch('gallery.txt');
        const text = await res.text();
        galleryImages = text.trim().split('\n').filter(l => l.trim()).map(l => l.trim());
        buildCarousel(galleryImages);
    } catch (e) {
        console.error('Gallery error:', e);
        document.getElementById('gallery-container').innerHTML =
            '<div class="gallery-loading">// ошибка загрузки галереи</div>';
    }
}

/* ============================================================
   MODAL LIGHTBOX
   ============================================================ */

function openModal(index, fallbackSrc) {
    currentModalIndex = index;
    const modal    = document.getElementById('galleryModal');
    const modalImg = document.getElementById('galleryModalImage');
    const src      = index >= 0 ? galleryImages[index] : fallbackSrc;
    modalImg.style.opacity = '1';
    modalImg.src = src;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (index >= 0) buildStrip(index);
    else document.getElementById('modalStrip').innerHTML = '';
}

function buildStrip(active) {
    const strip = document.getElementById('modalStrip');
    strip.innerHTML = '';
    galleryImages.forEach((src, i) => {
        const t = document.createElement('img');
        t.src = src; t.className = 'modal-thumb' + (i === active ? ' active' : '');
        t.loading = 'lazy';
        t.onerror = () => { t.src = 'https://via.placeholder.com/72x48/0e0b1c/3344AA?text=R'; };
        t.addEventListener('click', () => navigateModal(i - currentModalIndex));
        strip.appendChild(t);
    });
    const activeThumb = strip.children[active];
    if (activeThumb) setTimeout(() => activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }), 50);
}

function navigateModal(delta) {
    if (!document.getElementById('galleryModal').classList.contains('active') || !galleryImages.length) return;
    currentModalIndex = (currentModalIndex + delta + galleryImages.length) % galleryImages.length;
    const img = document.getElementById('galleryModalImage');
    img.style.opacity = '0';
    setTimeout(() => { img.src = galleryImages[currentModalIndex]; img.style.opacity = '1'; }, 180);
    buildStrip(currentModalIndex);
}

function closeModal() {
    const modal = document.getElementById('galleryModal');
    if (!modal.classList.contains('active')) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('galleryModal');
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.getElementById('modalPrev').addEventListener('click', e => { e.stopPropagation(); navigateModal(-1); });
    document.getElementById('modalNext').addEventListener('click', e => { e.stopPropagation(); navigateModal(1); });

    let tx = 0;
    modal.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    modal.addEventListener('touchend',   e => {
        const dx = e.changedTouches[0].clientX - tx;
        if (Math.abs(dx) > 50) navigateModal(dx < 0 ? 1 : -1);
    }, { passive: true });

    loadSongs();
    loadGallery();
    loadAlbumImage();
});