const list = document.querySelector('#review-list');
const form = document.querySelector('#review-form');
const status = document.querySelector('#review-status');

function renderReviews(reviews) {
  if (!reviews.length) {
    list.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'review-empty',
      textContent: '目前還沒有公開評論，歡迎留下第一則心得。',
    }));
    return;
  }
  list.replaceChildren(...reviews.map((review) => {
    const article = document.createElement('article');
    article.className = 'review-entry';
    const heading = document.createElement('div');
    heading.className = 'review-entry-heading';
    const name = document.createElement('strong');
    name.textContent = review.name || '匿名旅人';
    const rating = document.createElement('span');
    rating.className = 'review-stars';
    rating.setAttribute('aria-label', `${review.rating} 顆星`);
    rating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;
    heading.append(name, rating);
    const comment = document.createElement('p');
    comment.textContent = review.comment;
    article.append(heading, comment);
    if (review.date) {
      const date = document.createElement('time');
      date.className = 'review-date';
      date.textContent = review.date;
      article.append(date);
    }
    return article;
  }));
}

async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    const result = await response.json();
    renderReviews(Array.isArray(result.reviews) ? result.reviews : []);
  } catch {
    list.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'review-empty',
      textContent: '評論列表暫時無法載入，你仍可先送出心得。',
    }));
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  status.className = 'review-status';
  status.textContent = '正在送出評論…';
  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        rating: Number(data.get('rating')),
        comment: data.get('comment'),
        consent: data.get('consent') === 'on',
        website: data.get('website'),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || '評論送出失敗，請稍後重試。');
    form.reset();
    status.classList.add('success');
    status.textContent = '評論已公開，謝謝你分享旅程！';
    await loadReviews();
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || '目前無法連線，請稍後重試。';
  } finally {
    button.disabled = false;
  }
});

loadReviews();
