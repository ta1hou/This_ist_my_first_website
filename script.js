const header = document.querySelector('header');
const sections = document.querySelectorAll("div[id]");
const navLinks = document.querySelectorAll(".side-nav a");
const videoPlayer = document.getElementById('video-player');
const videoFrame = document.getElementById('videoFrame');
const songsContainer = document.getElementById('songs-container');

let currentlyPlayingSong = null;
let currentActiveColumn = null;

// Загрузка песен из файла
async function loadSongs() {
    try {
        const response = await fetch('songs.txt');
        const text = await response.text();
        const lines = text.trim().split('\n');

        const songsPerColumn = Math.ceil(lines.length / 3);
        const columns = [[], [], []];

        lines.forEach((line, index) => {
            const parts = line.split('|');
            const title = parts[0] ? parts[0].trim() : '';
            const video = parts[1] ? parts[1].trim() : '';
            const columnIndex = Math.floor(index / songsPerColumn);
            if (columnIndex < 3 && title) {
                columns[columnIndex].push({
                    title,
                    video,
                    hasVideo: video && video !== '' && !video.includes('example')
                });
            }
        });

        columns.forEach((columnSongs, colIndex) => {
            if (columnSongs.length === 0) return;

            const col = document.createElement('div');
            col.className = 'col-md-4 col-sm-6 mb-3';
            col.setAttribute('data-column', colIndex);

            const ul = document.createElement('ul');
            ul.className = 'list-group';

            columnSongs.forEach((song, songIndex) => {
                const li = document.createElement('li');
                li.className = 'list-group-item song-item';
                li.setAttribute('data-song-id', `${colIndex}-${songIndex}`);

                if (song.hasVideo) {
                    li.setAttribute('data-video', song.video);
                    li.innerHTML = `
                        <span class="song-title">${song.title}</span>
                        <span class="play-icon">💿</span>
                    `;
                    li.addEventListener('click', function () {
                        toggleVideo(song.video, song.title, li, col);
                    });
                } else {
                    li.classList.add('no-video');
                    li.innerHTML = `
                        <span class="song-title">${song.title}</span>
                        <span class="no-video-label">// скоро</span>
                    `;
                }

                ul.appendChild(li);
            });

            col.appendChild(ul);
            songsContainer.appendChild(col);
        });
    } catch (error) {
        console.error('Ошибка загрузки песен:', error);
        showPlaceholder('Ошибка загрузки списка песен');
    }
}

// Переключение видео
function toggleVideo(videoUrl, title, songElement, columnElement) {
    const songId = songElement.getAttribute('data-song-id');

    if (currentlyPlayingSong === songId) {
        closeVideo();
        return;
    }

    if (currentlyPlayingSong) {
        const prevSong = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (prevSong) prevSong.classList.remove('active');
    }

    const videoId = getYouTubeVideoId(videoUrl);
    if (videoId) {
        videoFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoPlayer.classList.add('active');
        songElement.classList.add('active');

        songsContainer.classList.add('playing');
        if (currentActiveColumn) currentActiveColumn.classList.remove('active-column');
        columnElement.classList.add('active-column');
        currentActiveColumn = columnElement;
        currentlyPlayingSong = songId;

        setTimeout(() => {
            videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function closeVideo() {
    videoFrame.src = '';
    videoPlayer.classList.remove('active');
    songsContainer.classList.remove('playing');

    if (currentlyPlayingSong) {
        const el = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (el) el.classList.remove('active');
    }

    if (currentActiveColumn) {
        currentActiveColumn.classList.remove('active-column');
        currentActiveColumn = null;
    }

    currentlyPlayingSong = null;
}

function getYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

function showPlaceholder(message) {
    songsContainer.innerHTML = `
        <div class="col-12">
            <div class="placeholder-message">
                <div class="placeholder-icon">🎵</div>
                <div class="placeholder-text">${message}</div>
            </div>
        </div>
    `;
}

// Скролл
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }

    let scrollPos = window.scrollY + 150;
    sections.forEach((section) => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
            navLinks.forEach((link) => link.classList.remove("active"));
            const activeLink = document.querySelector(`.side-nav a[href="#${section.id}"]`);
            if (activeLink) activeLink.classList.add("active");
        }
    });
});

// ESC для закрытия
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (currentlyPlayingSong) closeVideo();
        closeGalleryModal();
    }
});

// ============================================================
// ГАЛЕРЕЯ
// ============================================================

async function loadGallery() {
    try {
        const response = await fetch('gallery.txt');
        const text = await response.text();
        const images = text.trim().split('\n').filter(line => line.trim() !== '');

        const container = document.getElementById('gallery-container');
        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-scroll-wrapper';

        images.forEach((imagePath, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';

            const img = document.createElement('img');
            img.src = imagePath.trim();
            img.alt = `Roselia Image ${index + 1}`;
            img.loading = 'lazy';

            img.onerror = function () {
                this.src = 'https://via.placeholder.com/600x400/0e0b1c/3344AA?text=Roselia';
            };

            // Hover overlay
            const overlay = document.createElement('div');
            overlay.className = 'gallery-overlay';
            overlay.textContent = '🔍';

            item.addEventListener('click', () => openGalleryModal(imagePath.trim()));
            item.appendChild(img);
            item.appendChild(overlay);
            wrapper.appendChild(item);
        });

        container.appendChild(wrapper);
    } catch (error) {
        console.error('Ошибка загрузки галереи:', error);
        document.getElementById('gallery-container').innerHTML =
            '<div class="gallery-loading">// ошибка загрузки галереи</div>';
    }
}

// ============================================================
// МОДАЛЬНОЕ ОКНО ГАЛЕРЕИ
// ============================================================

function openGalleryModal(imagePath) {
    const modal = document.getElementById('galleryModal');
    const modalImg = document.getElementById('galleryModalImage');
    modalImg.src = imagePath;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGalleryModal() {
    const modal = document.getElementById('galleryModal');
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('galleryModal');
    const closeBtn = modal.querySelector('.close-modal');

    closeBtn.addEventListener('click', closeGalleryModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeGalleryModal();
    });

    loadSongs();
    loadGallery();
    loadAlbumImage();
});

// ============================================================
// АЛЬБОМ
// ============================================================

async function loadAlbumImage() {
    try {
        const response = await fetch('album.txt');
        const text = await response.text();
        const imagePath = text.trim().split('\n')[0];

        if (imagePath) {
            const container = document.getElementById('album-container');

            const img = document.createElement('img');
            img.src = imagePath.trim();
            img.className = 'img-fluid my-3';
            img.alt = 'Roselia Album';

            img.onerror = function () {
                this.src = 'https://via.placeholder.com/800x400/0e0b1c/3344AA?text=Album';
            };

            // Клик для просмотра альбома в лайтбоксе
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => openGalleryModal(img.src));

            container.appendChild(img);
        }
    } catch (error) {
        console.error('Ошибка загрузки картинки альбома:', error);
    }
}