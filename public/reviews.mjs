const list = document.querySelector('#review-list');
const summary = document.querySelector('#review-summary');
const pagination = document.querySelector('#review-pagination');
const prevButton = document.querySelector('#review-prev');
const nextButton = document.querySelector('#review-next');
const pageInfo = document.querySelector('#review-page-info');

const REVIEWS_PER_PAGE = 5;

let allReviews = [];
let currentPage = 1;


// =========================
// 顯示平均評分
// =========================
function renderSummary() {
  if (!summary) return;

  if (allReviews.length === 0) {
    summary.innerHTML = `
      <div class="review-average">—</div>
      <div class="review-summary-stars">★★★★★</div>
      <div class="review-summary-count">目前沒有評論</div>
    `;
    return;
  }

  const total = allReviews.reduce((sum, review) => {
    return sum + Number(review.rating || 0);
  }, 0);

  const average = total / allReviews.length;

  const rounded = Math.round(average);

  summary.innerHTML = `
    <div class="review-average">${average.toFixed(1)}</div>

    <div class="review-summary-stars">
      ${'★'.repeat(rounded)}
      ${'☆'.repeat(5 - rounded)}
    </div>

    <div class="review-summary-count">
      共 ${allReviews.length} 則旅人評論
    </div>
  `;
}


// =========================
// 顯示評論
// =========================
function renderReviews() {
  if (!list) {
    console.error('❌ 找不到 #review-list');
    return;
  }

  if (allReviews.length === 0) {
    list.innerHTML = `
      <p class="review-empty">
        目前還沒有公開評論，歡迎留下第一則心得。
      </p>
    `;

    if (pagination) {
      pagination.hidden = true;
    }

    return;
  }

  const totalPages = Math.ceil(
    allReviews.length / REVIEWS_PER_PAGE
  );

  const start =
    (currentPage - 1) * REVIEWS_PER_PAGE;

  const pageReviews =
    allReviews.slice(
      start,
      start + REVIEWS_PER_PAGE
    );


  list.innerHTML = '';


  pageReviews.forEach((review) => {

    const article =
      document.createElement('article');

    article.className = 'review-entry';


    const heading =
      document.createElement('div');

    heading.className =
      'review-entry-heading';


    const name =
      document.createElement('strong');

    name.textContent =
      review.name || '匿名旅人';


    const rating =
      document.createElement('span');

    rating.className =
      'review-stars';


    const ratingNumber = Math.min(
      5,
      Math.max(
        1,
        Number(review.rating) || 1
      )
    );


    rating.textContent =
      '★'.repeat(ratingNumber) +
      '☆'.repeat(5 - ratingNumber);


    heading.append(
      name,
      rating
    );


    const comment =
      document.createElement('p');

    comment.textContent =
      review.comment || '';


    article.append(
      heading,
      comment
    );


    list.appendChild(article);
  });


  // =========================
  // 分頁
  // =========================

  if (pagination) {

    if (totalPages <= 1) {
      pagination.hidden = true;
    } else {
      pagination.hidden = false;
    }

    if (pageInfo) {
      pageInfo.textContent =
        `${currentPage} / ${totalPages}`;
    }

    if (prevButton) {
      prevButton.disabled =
        currentPage <= 1;
    }

    if (nextButton) {
      nextButton.disabled =
        currentPage >= totalPages;
    }
  }
}


// =========================
// 從 Cloudflare API 取得評論
// =========================
async function loadReviews() {

  console.log('🔵 開始載入評論');


  try {

    const response =
      await fetch(
        '/api/reviews?t=' + Date.now(),
        {
          cache: 'no-store'
        }
      );


    console.log(
      '🟢 API 狀態：',
      response.status
    );


    const result =
      await response.json();


    console.log(
      '🟢 API 回傳：',
      result
    );


    if (!Array.isArray(result.reviews)) {

      throw new Error(
        'API 沒有回傳 reviews 陣列'
      );
    }


    allReviews =
      result.reviews;


    console.log(
      '🟢 取得評論數量：',
      allReviews.length
    );


    currentPage = 1;


    renderSummary();

    renderReviews();


    console.log(
      '🟢 評論顯示完成'
    );


  } catch (error) {

    console.error(
      '🔴 評論載入失敗：',
      error
    );


    if (summary) {
      summary.innerHTML = `
        <div class="review-average">!</div>
        <div class="review-summary-count">
          評論載入失敗
        </div>
      `;
    }


    if (list) {
      list.innerHTML = `
        <p class="review-empty">
          評論暫時無法載入，請稍後再試。
        </p>
      `;
    }


    if (pagination) {
      pagination.hidden = true;
    }
  }
}


// =========================
// 上一頁
// =========================
prevButton?.addEventListener(
  'click',
  () => {

    if (currentPage > 1) {

      currentPage--;

      renderReviews();

      window.scrollTo({
        top:
          list?.offsetTop - 100 || 0,
        behavior: 'smooth'
      });
    }
  }
);


// =========================
// 下一頁
// =========================
nextButton?.addEventListener(
  'click',
  () => {

    const totalPages =
      Math.ceil(
        allReviews.length /
        REVIEWS_PER_PAGE
      );


    if (
      currentPage <
      totalPages
    ) {

      currentPage++;

      renderReviews();

      window.scrollTo({
        top:
          list?.offsetTop - 100 || 0,
        behavior: 'smooth'
      });
    }
  }
);


// =========================
// 開始
// =========================
loadReviews();
