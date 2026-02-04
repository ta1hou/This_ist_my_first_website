const header = document.querySelector('header');
const sections = document.querySelectorAll("div[id]");
const navLinks = document.querySelectorAll("nav a");
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
        
        // Группируем песни по колонкам (динамически)
        const songsPerColumn = Math.ceil(lines.length / 3);
        const columns = [[], [], []];
        
        lines.forEach((line, index) => {
            const parts = line.split('|');
            const title = parts[0] ? parts[0].trim() : '';
            const video = parts[1] ? parts[1].trim() : '';
            
            const columnIndex = Math.floor(index / songsPerColumn);
            if (columnIndex < 3 && title) {
                columns[columnIndex].push({ 
                    title: title, 
                    video: video,
                    hasVideo: video && video !== '' && !video.includes('example')
                });
            }
        });
        
        // Создаем колонки
        columns.forEach((columnSongs, colIndex) => {
            if (columnSongs.length > 0) {
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
                            <span class="play-icon">▶</span>
                        `;
                        
                        // Обработчик клика для открытия видео
                        li.addEventListener('click', function() {
                            toggleVideo(song.video, song.title, li, col);
                        });
                    } else {
                        li.classList.add('no-video');
                        li.innerHTML = `
                            <span class="song-title">${song.title}</span>
                            <span class="no-video-label">🎵 скоро</span>
                        `;
                    }
                    
                    ul.appendChild(li);
                });
                
                col.appendChild(ul);
                songsContainer.appendChild(col);
            }
        });
    } catch (error) {
        console.error('Ошибка загрузки песен:', error);
        showPlaceholder('Ошибка загрузки списка песен');
    }
}

// Переключение видео
function toggleVideo(videoUrl, title, songElement, columnElement) {
    const songId = songElement.getAttribute('data-song-id');
    
    // Если кликнули на ту же песню - закрываем
    if (currentlyPlayingSong === songId) {
        closeVideo();
        return;
    }
    
    // Закрываем предыдущее видео если оно было
    if (currentlyPlayingSong) {
        const prevSong = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (prevSong) {
            prevSong.classList.remove('active');
        }
    }
    
    // Открываем новое видео
    const videoId = getYouTubeVideoId(videoUrl);
    if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        videoFrame.src = embedUrl;
        videoPlayer.classList.add('active');
        songElement.classList.add('active');
        
        // Скрываем другие колонки
        songsContainer.classList.add('playing');
        if (currentActiveColumn) {
            currentActiveColumn.classList.remove('active-column');
        }
        columnElement.classList.add('active-column');
        currentActiveColumn = columnElement;
        
        currentlyPlayingSong = songId;
        
        // Плавная прокрутка к плееру
        setTimeout(() => {
            videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

// Закрытие видео
function closeVideo() {
    videoFrame.src = '';
    videoPlayer.classList.remove('active');
    songsContainer.classList.remove('playing');
    
    if (currentlyPlayingSong) {
        const currentSong = document.querySelector(`[data-song-id="${currentlyPlayingSong}"]`);
        if (currentSong) {
            currentSong.classList.remove('active');
        }
    }
    
    if (currentActiveColumn) {
        currentActiveColumn.classList.remove('active-column');
        currentActiveColumn = null;
    }
    
    currentlyPlayingSong = null;
}

// Извлечение ID видео из YouTube URL
function getYouTubeVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Показать заглушку
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

// Скролл эффекты
window.addEventListener("scroll", () => {
    // Сжатие навбара
    if(window.scrollY > 50){
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }

    // Подсветка активного пункта
    let scrollPos = window.scrollY + 150;
    sections.forEach((section) => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
            navLinks.forEach((link) => link.classList.remove("active"));
            const activeLink = document.querySelector(`nav a[href="#${section.id}"]`);
            if (activeLink) activeLink.classList.add("active");
        }
    });
});

// Закрытие видео при клике на ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentlyPlayingSong) {
        closeVideo();
    }
});

// Загрузка галереи из директории
async function loadGallery() {
    const galleryContainer = document.getElementById('gallery-container');
    
    try {
        // Загружаем список изображений через PHP
        const response = await fetch('get_gallery.php');
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить галерею');
        }
        
        const imageFiles = await response.json();
        
        galleryContainer.innerHTML = '';
        
        if (imageFiles.length === 0) {
            galleryContainer.innerHTML = '<div class="gallery-loading">Изображения не найдены 📷<br><small>Добавьте изображения в папку material/photo/</small></div>';
            return;
        }
        
        // Создаем элементы галереи
        imageFiles.forEach(filename => {
            const imagePath = `material/photo/${filename}`;
            
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = `Roselia - ${filename}`;
            img.loading = 'lazy';
            
            // Обработка ошибки загрузки изображения
            img.onerror = function() {
                galleryItem.style.display = 'none';
            };
            
            // Клик для полноэкранного просмотра
            galleryItem.addEventListener('click', () => {
                openGalleryModal(imagePath);
            });
            
            galleryItem.appendChild(img);
            galleryContainer.appendChild(galleryItem);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки галереи:', error);
        galleryContainer.innerHTML = `
            <div class="gallery-loading">
                <p>⚠️ Ошибка загрузки галереи</p>
                <small>Убедитесь, что файл get_gallery.php находится в корневой папке сайта</small>
            </div>
        `;
    }
}

// Открытие модального окна галереи
function openGalleryModal(imagePath) {
    const modal = document.getElementById('galleryModal');
    const modalImg = document.getElementById('galleryModalImage');
    
    modal.classList.add('active');
    modalImg.src = imagePath;
}

// Закрытие модального окна галереи
function closeGalleryModal() {
    const modal = document.getElementById('galleryModal');
    modal.classList.remove('active');
}

// Обработчики для модального окна
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('galleryModal');
    const closeBtn = modal.querySelector('.close-modal');
    
    closeBtn.addEventListener('click', closeGalleryModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeGalleryModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeGalleryModal();
        }
    });
});

// Загрузка песен при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadSongs();
    loadGallery();
    loadAlbumImage();
});

// Загрузка изображений галереи из файла
async function loadGallery() {
    try {
        const response = await fetch('gallery.txt');
        const text = await response.text();
        const images = text.trim().split('\n').filter(line => line.trim() !== '');
        
        const container = document.getElementById('gallery-container');
        container.innerHTML = ''; // Очищаем контейнер
        
        const wrapper = document.createElement('div');
        wrapper.className = 'gallery-scroll-wrapper';
        
        images.forEach((imagePath, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = imagePath.trim();
            img.alt = `Roselia Image ${index + 1}`;
            
            // Обработка ошибок загрузки
            img.onerror = function() {
                this.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
                this.alt = 'Изображение не найдено';
            };
            
            item.appendChild(img);
            wrapper.appendChild(item);
        });
        
        container.appendChild(wrapper);
    } catch (error) {
        console.error('Ошибка загрузки галереи:', error);
        document.getElementById('gallery-container').innerHTML = 
            '<p class="text-center text-danger">Не удалось загрузить галерею</p>';
    }
}

// Загрузка картинки альбома из файла
async function loadAlbumImage() {
    try {
        const response = await fetch('album.txt');
        const text = await response.text();
        const imagePath = text.trim().split('\n')[0]; // Берем первую строку
        
        if (imagePath) {
            const container = document.getElementById('album-container');
            
            const img = document.createElement('img');
            img.src = imagePath.trim();
            img.className = 'img-fluid my-3';
            img.alt = 'Roselia Album';
            
            // Обработка ошибок загрузки
            img.onerror = function() {
                this.src = 'https://via.placeholder.com/800x400?text=Album+Image+Not+Found';
                this.alt = 'Изображение альбома не найдено';
            };
            
            container.appendChild(img);
        }
    } catch (error) {
        console.error('Ошибка загрузки картинки альбома:', error);
    }
}
document.addEventListener('DOMContentLoaded', loadGallery);