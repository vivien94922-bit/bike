const list = document.querySelector('#review-list');
const summary = document.querySelector('#review-summary');
const pagination = document.querySelector('#review-pagination');
const prevButton = document.querySelector('#review-prev');
const nextButton = document.querySelector('#review-next');
const pageInfo = document.querySelector('#review-page-info');

const REVIEWS_PER_PAGE = 5;

let allReviews = [];
let currentPage = 1;


/* =========================
   平均星等
========================= */

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

  const total = reviews.reduce((sum, review) => {
    return sum + Number(review.rating || 0);
  }, 0);

  const average = total / reviews.length;

  const roundedAverage = Math.round(average);

  summary.innerHTML = `
    <div class="review-average">${average.toFixed(1)}</div>

    <div class="review-summary-stars" aria-label="${average.toFixed(1)} 顆星">
      ${'★'.repeat(roundedAverage)}
      ${'☆'.repeat(5 - roundedAverage)}
    </div>

    <div class="review-summary-count">
      共 ${reviews.length} 則旅人評論
    </div>
  `;
}


/* =========================
   顯示評論
========================= */

function renderReviews() {
  if (!list) {
    console.error('找不到 #review-list');
    return;
  }

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

  const startIndex =
    (currentPage - 1) * REVIEWS_PER_PAGE;

  const pageReviews = allReviews.slice(
    startIndex,
    startIndex + REVIEWS_PER_PAGE
  );

  const reviewElements = pageReviews.map((review) => {
    const article = document.createElement('article');
    article.className = 'review-entry';

    const heading = document.createElement('div');
    heading.className = 'review-entry-heading';

    const name = document.createElement('strong');
    name.textContent =
      review.name || '匿名旅人';

    const rating = document.createElement('span');
    rating.className = 'review-stars';

    const ratingNumber = Math.min(
      5,
      Math.max(1, Number(review.rating) || 1)
    );

    rating.setAttribute(
      'aria-label',
      `${ratingNumber} 顆星`
    );

    rating.textContent =
      '★'.repeat(ratingNumber) +
      '☆'.repeat(5 - ratingNumber);

    heading.append(name, rating);

    const comment = document.createElement('p');
    comment.textContent =
      review.comment || '';

    article.append(
      heading,
      comment
    );

    if (review.date) {
      const date = document.createElement('time');

      date.className = 'review-date';
      date.textContent = review.date;

      article.append(date);
    }

    return article;
  });

  list.replaceChildren(...reviewElements);


  /* 分頁 */

  if (pagination) {
    pagination.hidden = totalPages <= 1;

    if (pageInfo) {
      pageInfo.textContent =
        `${currentPage} / ${totalPages}`;
    }

    if (prevButton) {
      prevButton.disabled =
        currentPage === 1;
    }

    if (nextButton) {
      nextButton.disabled =
        currentPage === totalPages;
    }
  }
}


/* =========================
   從 Cloudflare API 取得評論
========================= */

async function loadReviews() {
  try {
    const response = await fetch(
      '/api/reviews',
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    console.log(
      '網站取得的評論：',
      result.reviews
    );

    allReviews =
      Array.isArray(result.reviews)
        ? result.reviews
        : [];

    currentPage = 1;

    renderSummary(allReviews);
    renderReviews();

  } catch (error) {
    console.error(
      '評論載入失敗：',
      error
    );

    if (list) {
      list.replaceChildren(
        Object.assign(
          document.createElement('p'),
          {
            className: 'review-empty',
            textContent:
              '評論列表暫時無法載入。',
          }
        )
      );
    }

    if (pagination) {
      pagination.hidden = true;
    }
  }
}


/* =========================
   上一頁
========================= */

prevButton?.addEventListener(
  'click',
  () => {
    if (currentPage > 1) {
      currentPage--;
      renderReviews();

      window.scrollTo({
        top: list?.offsetTop - 100 || 0,
        behavior: 'smooth',
      });
    }
  }
);


/* =========================
   下一頁
========================= */

nextButton?.addEventListener(
  'click',
  () => {
    const totalPages =
      Math.ceil(
        allReviews.length /
        REVIEWS_PER_PAGE
      );

    if (currentPage < totalPages) {
      currentPage++;
      renderReviews();

      window.scrollTo({
        top: list?.offsetTop - 100 || 0,
        behavior: 'smooth',
      });
    }
  }
);


/* =========================
   開始
========================= */

loadReviews();
