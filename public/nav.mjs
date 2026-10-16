// 全站共用的手機版導覽選單
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.desktop-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('open') ?? false;
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? '關閉導覽選單' : '開啟導覽選單');
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', '開啟導覽選單');
  });
});

document.addEventListener('click', (event) => {
  if (!nav || !menuToggle || !nav.classList.contains('open')) return;
  if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '開啟導覽選單');
});
