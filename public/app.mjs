const bikeDetailModal = document.querySelector('#bike-detail-modal');

const bikeIntros = {
  standard: {
    icon: '/icons/bike.svg',
    title: '一般單車・兒童車',
    copy: '提供兒童可騎車款與輔助輪，價格和一般單車相同。各年齡層歡迎詢問適合車款；現場可調整並試騎。租借不限時間，舊草嶺隧道來回約 4.2 公里。',
    prices: '不限時間原價 NT$ 100・預約 NT$ 80'
  },
  child: {
    icon: '/icons/family-bike.svg',
    title: '親子車',
    copy: '親子一起出遊的選擇，租借不限時間。騎乘前可請店家協助調整坐姿與舒適度，先試騎再出發。',
    prices: '不限時間原價 NT$ 150・預約 NT$ 120'
  },
  tandem: {
    icon: '/icons/tandem.svg',
    title: '協力車',
    copy: '專為雙人騎乘設計，提供絕佳的同步騎行體驗。配備舒適高彈力鞍座與高強度鋼管車架，讓您與夥伴輕鬆享受沿途美景與雙人協同踩踏的樂趣。',
    prices: '不限時間原價 NT$ 200・預約 NT$ 160'
  },
  electric: {
    icon: '/icons/electric-bike.svg',
    title: '電動車',
    copy: '可選單人或雙人，租借時間為 1.5 小時。預約每台折 NT$ 50。',
    prices: '單人 NT$ 250・預約 NT$ 200；雙人 NT$ 350・預約 NT$ 300'
  }
};


/* =========================
   車款詳細介紹
========================= */

function closeBikeDetail() {
  bikeDetailModal.hidden = true;
  document.body.classList.remove('bike-detail-open');
}

function openBikeDetail(vehicleId) {
  const intro = bikeIntros[vehicleId];
  if (!intro) return;

  bikeDetailModal.dataset.vehicle = vehicleId;

  bikeDetailModal.querySelector('.bike-detail-icon img').src = intro.icon;
  bikeDetailModal.querySelector('#bike-detail-title').textContent = intro.title;
  bikeDetailModal.querySelector('.bike-detail-copy').textContent = intro.copy;
  bikeDetailModal.querySelector('.bike-detail-price').textContent = intro.prices;

  bikeDetailModal.hidden = false;
  document.body.classList.add('bike-detail-open');

  bikeDetailModal.querySelector('.bike-detail-close').focus();
}

document.querySelectorAll('[data-bike-details]').forEach((button) => {
  button.addEventListener('click', () => {
    openBikeDetail(button.dataset.bikeDetails);
  });
});

bikeDetailModal
  .querySelector('.bike-detail-close')
  .addEventListener('click', closeBikeDetail);

bikeDetailModal.addEventListener('click', (event) => {
  if (event.target === bikeDetailModal) {
    closeBikeDetail();
  }
});

bikeDetailModal
  .querySelector('.bike-detail-book')
  .addEventListener('click', () => {
    closeBikeDetail();

    document
      .querySelector('#booking')
      .scrollIntoView({ behavior: 'smooth' });
  });

bikeDetailModal.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeBikeDetail();
  }
});


/* =========================
   導覽列
========================= */

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.desktop-nav');

menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  });
});


/* =========================
   單車圖片輪播
========================= */

document.querySelectorAll('[data-bike-gallery]').forEach((gallery) => {
  const track = gallery.querySelector('[data-gallery-track]');
  const photos = [...track.querySelectorAll('img')];
  const dots = gallery.querySelector('[data-gallery-dots]');

  let activeIndex = 0;

  photos.forEach((photo, index) => {
    const dot = document.createElement('button');

    dot.type = 'button';
    dot.setAttribute(
      'aria-label',
      `查看第 ${index + 1} 張單車照片`
    );

    dot.addEventListener('click', () => {
      track.scrollTo({
        left: index * track.clientWidth,
        behavior: 'smooth'
      });
    });

    dots.append(dot);
  });

  const dotButtons = [...dots.children];

  function goTo(index) {
    const nextIndex =
      (index + photos.length) % photos.length;

    track.scrollTo({
      left: nextIndex * track.clientWidth,
      behavior: 'smooth'
    });
  }

  gallery
    .querySelector('[data-gallery-prev]')
    .addEventListener('click', () => {
      goTo(activeIndex - 1);
    });

  gallery
    .querySelector('[data-gallery-next]')
    .addEventListener('click', () => {
      goTo(activeIndex + 1);
    });

  function updateActive() {
    activeIndex = Math.round(
      track.scrollLeft / track.clientWidth
    );

    dotButtons.forEach((dot, index) => {
      if (index === activeIndex) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  track.addEventListener(
    'scroll',
    () => requestAnimationFrame(updateActive),
    { passive: true }
  );

  window.addEventListener('resize', updateActive);

  updateActive();
});
