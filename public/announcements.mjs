const list = document.querySelector('#announcement-list');

function showMessage(message) {
  const item = document.createElement('p');
  item.className = 'announcement-empty';
  item.textContent = message;
  list.replaceChildren(item);
}

function render(announcements) {
  if (!announcements.length) {
    showMessage('目前沒有公告，請稍後再來查看。');
    return;
  }

  list.replaceChildren(...announcements.map((announcement) => {
    const article = document.createElement('article');
    article.className = 'announcement-card';
    const date = document.createElement('time');
    date.className = 'announcement-date';
    date.textContent = announcement.date;
    const title = document.createElement('h2');
    if (/遊覽車注意事項|預約享八折優惠|八折|8折/.test(announcement.title)) {
      const highlightedTitle = document.createElement('span');
      highlightedTitle.className = 'announcement-title-marker';
      highlightedTitle.textContent = announcement.title;
      title.append(highlightedTitle);
    } else {
      title.textContent = announcement.title;
    }
    const content = document.createElement('p');
    content.textContent = announcement.content;
    article.append(date, title, content);
    return article;
  }));
}

try {
  const response = await fetch('/api/announcements');
  const result = await response.json();
  if (!response.ok || !Array.isArray(result.announcements)) throw new Error('公告讀取失敗');
  render(result.announcements);
} catch {
  showMessage('公告暫時無法載入，請稍後再試或致電店家。');
}
