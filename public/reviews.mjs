const list = document.querySelector('#review-list');
const summary = document.querySelector('#review-summary');
const pagination = document.querySelector('#review-pagination');
const prevButton = document.querySelector('#review-prev');
const nextButton = document.querySelector('#review-next');
const pageInfo = document.querySelector('#review-page-info');

const REVIEWS_PER_PAGE = 5;

let allReviews = [];
let currentPage = 1;

function renderSummary(reviews) {
  if (!summary) return;

  if (!reviews.length) {
    summary.innerHTML = `
      <div class="review-average">—</div>
      <div class="review-summary-stars">★★★★★</div>
      <div class="review-summary-count">目前沒有評論</div>
    `;
    return;
  }

  const total = reviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0
  );

  const average = total / reviews.length;

  summary.innerHTML = `
    <div class="review-average">${average.toFixed(1)}</div>
    <div class="review-summary-stars">
      ${'★'.repeat(Math.round(average))}${'☆'.repeat(5 - Math.round(average))}
    </div>
    <div class="review-summary-count">
      共 ${reviews.length} 則旅人評論
    </div>
  `;
}

function renderReviews() {
  if (!allReviews.length) {
    list.replaceChildren(
      Object.assign(document.createElement('p'), {
        className: 'review-empty',
        textContent: '目前還沒有公開評論，歡迎留下第一則心得。',
      })
    );

    if (pagination) {
      pagination.hidden = true;
    }

    return;
  }

  const totalPages = Math.ceil(
    allReviews.length / REVIEWS_PER_PAGE
  );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const start = (currentPage - 1) * REVIEWS_PER_PAGE;
  const pageReviews = allReviews.slice(
    start,
    start + REVIEWS_PER_PAGE
  );

  list.replaceChildren(
    ...pageReviews.map((review) => {
      const article = document.createElement('article');
      article.className = 'review-entry';

      const heading = document.createElement('div');
      heading.className = 'review-entry-heading';

      const name = document.createElement('strong');
      name.textContent = review.name || '匿名旅人';

      const rating = document.createElement('span');
      rating.className = 'review-stars';
      rating.setAttribute(
        'aria-label',
        `${review.rating} 顆星`
      );

      rating.textContent =
        `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}`;

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
    })
  );

  if (pagination) {
    pagination.hidden = totalPages <= 1;

    pageInfo.textContent =
      `${currentPage} / ${totalPages}`;

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  }
}

async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');

    if (!response.ok) {
      throw new Error('評論載入失敗');
    }

    const result = await response.json();

    allReviews = Array.isArray(result.reviews)
      ? result.reviews
      : [];

    currentPage = 1;

    renderSummary(allReviews);
    renderReviews();

  } catch {
    list.replaceChildren(
      Object.assign(document.createElement('p'), {
        className: 'review-empty',
        textContent: '評論列表暫時無法載入。',
      })
    );

    if (pagination) {
      pagination.hidden = true;
    }
  }
}

prevButton?.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderReviews();
  }
});

nextButton?.addEventListener('click', () => {
  const totalPages = Math.ceil(
    allReviews.length / REVIEWS_PER_PAGE
  );

  if (currentPage < totalPages) {
    currentPage++;
    renderReviews();
  }
});

loadReviews();
