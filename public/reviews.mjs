
const list = document.querySelector('#review-list');
const form = document.querySelector('#review-form');
const status = document.querySelector('#review-status');

const PAGE_SIZE = 5;
let allReviews = [];
let currentPage = 1;

// 自動建立平均星等區塊
const summary = document.createElement('section');
summary.id = 'review-summary';
summary.className = 'review-summary';
summary.setAttribute('aria-label', '評論平均星等與分布');

list.parentNode.insertBefore(summary, list);

// 自動建立分頁區塊
const pagination = document.createElement('nav');
pagination.id = 'review-pagination';
pagination.className = 'review-pagination';
pagination.setAttribute('aria-label', '評論分頁');

list.insertAdjacentElement('afterend', pagination);

// 建立星星文字
function starsText(rating) {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

// 顯示平均星等及星等分布
function renderSummary(reviews) {
  summary.replaceChildren();

  const validReviews = reviews.filter((review) =>
    Number.isInteger(Number(review.rating)) &&
    Number(review.rating) >= 1 &&
    Number(review.rating) <= 5
  );

  if (validReviews.length === 0) {
    const title = document.createElement('h2');

    const message = document.createElement('p');
    message.textContent = '目前還沒有評論';

    summary.append(title, message);
    return;
  }

  const total = validReviews.length;
  const average =
    validReviews.reduce((sum, review) =>
      sum + Number(review.rating), 0
    ) / total;

  const heading = document.createElement('h2');

  const averageBox = document.createElement('div');
  averageBox.className = 'review-average';

  const score = document.createElement('strong');
  score.className = 'review-average-score';
  score.textContent = average.toFixed(1);

  const stars = document.createElement('span');
  stars.className = 'review-stars';
  stars.textContent = starsText(Math.round(average));

  const count = document.createElement('p');
  count.className = 'review-total';
  count.textContent = `共 ${total} 則評論`;

  averageBox.append(score, stars, count);

  const distribution = document.createElement('div');
  distribution.className = 'review-distribution';

  for (let rating = 5; rating >= 1; rating--) {
    const amount = validReviews.filter(
      (review) => Number(review.rating) === rating
    ).length;

    const row = document.createElement('div');
    row.className = 'review-distribution-row';

    const label = document.createElement('span');
    label.textContent = `${rating} 星`;

    const track = document.createElement('div');
    track.className = 'review-bar-track';

    const bar = document.createElement('div');
    bar.className = 'review-bar-fill';
    bar.style.width = `${(amount / total) * 100}%`;

    track.append(bar);

    const number = document.createElement('span');
    number.textContent = `${amount} 則`;

    row.append(label, track, number);
    distribution.append(row);
  }

  summary.append(heading, averageBox, distribution);
}

// 顯示目前頁面的評論
function renderReviews(reviews) {
  list.replaceChildren();

  if (!reviews.length) {
    const empty = document.createElement('p');
    empty.className = 'review-empty';
    empty.textContent = '目前還沒有評論，歡迎留下第一則心得。';
    list.append(empty);

    pagination.replaceChildren();
    return;
  }

  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);

  // 若評論數減少，避免停留在不存在的頁數
  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageReviews = reviews.slice(start, start + PAGE_SIZE);

  pageReviews.forEach((review) => {
    const article = document.createElement('article');
    article.className = 'review-entry';

    const heading = document.createElement('div');
    heading.className = 'review-entry-heading';

    const name = document.createElement('strong');
    name.textContent = review.name || '匿名旅人';

    const rating = document.createElement('span');
    rating.className = 'review-stars';
    rating.setAttribute('aria-label', `${review.rating} 顆星`);
    rating.textContent = starsText(Number(review.rating));

    heading.append(name, rating);

    const comment = document.createElement('p');
    comment.textContent = review.comment || '';

    article.append(heading, comment);

    if (review.date) {
      const date = document.createElement('time');
      date.className = 'review-date';
      date.textContent = review.date;
      article.append(date);
    }

    list.append(article);
  });

  renderPagination(totalPages);
}

// 建立上一頁、頁碼及下一頁
function renderPagination(totalPages) {
  pagination.replaceChildren();

  if (totalPages <= 1) return;

  function addButton(label, page, disabled = false, active = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.className = active
      ? 'review-page-button active'
      : 'review-page-button';

    if (active) {
      button.setAttribute('aria-current', 'page');
    }

    button.addEventListener('click', () => {
      currentPage = page;
      renderReviews(allReviews);

      // 切頁後回到評論區，方便閱讀
      list.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });

    pagination.append(button);
  }

  addButton('上一頁', currentPage - 1, currentPage === 1);

  for (let page = 1; page <= totalPages; page++) {
    addButton(
      String(page),
      page,
      false,
      page === currentPage
    );
  }

  addButton(
    '下一頁',
    currentPage + 1,
    currentPage === totalPages
  );
}

// 載入評論
async function loadReviews(showLastPage = false) {
  try {
    const response = await fetch('/api/reviews');

    if (!response.ok) {
      throw new Error('評論列表載入失敗');
    }

    const result = await response.json();

    allReviews = (Array.isArray(result.reviews) ? result.reviews : [])
      .filter((review) => {
        const rating = Number(review.rating);

        return (
          review.comment &&
          Number.isInteger(rating) &&
          rating >= 1 &&
          rating <= 5
        );
      })
      .map((review) => ({
        ...review,
        rating: Number(review.rating)
      }));

    renderSummary(allReviews);

    const totalPages = Math.max(
      1,
      Math.ceil(allReviews.length / PAGE_SIZE)
    );

    currentPage = showLastPage ? totalPages : Math.min(currentPage, totalPages);

    renderReviews(allReviews);
  } catch {
    summary.textContent = '平均星等暫時無法載入。';

    list.replaceChildren(Object.assign(
      document.createElement('p'),
      {
        className: 'review-empty',
        textContent: '評論列表暫時無法載入，你仍可先送出心得。'
      }
    ));

    pagination.replaceChildren();
  }
}

// 保留原本的評論送出功能
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
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        name: data.get('name'),
        rating: Number(data.get('rating')),
        comment: data.get('comment'),
        consent: data.get('consent') === 'on',
        website: data.get('website')
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || '評論送出失敗，請稍後重試。'
      );
    }

    form.reset();

    status.classList.add('success');
    status.textContent = '評論已公開，謝謝你分享旅程！';

    // 新評論通常會加在試算表最後，因此切到最後一頁
    currentPage = 1;
    await loadReviews(true);
  } catch (error) {
    status.classList.add('error');
    status.textContent =
      error.message || '目前無法連線，請稍後重試。';
  } finally {
    button.disabled = false;
  }
});

loadReviews();
