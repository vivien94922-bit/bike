import { estimateRental, estimateRentals, getBookingPrice, validateBooking, VEHICLES } from './booking.mjs';

const form = document.querySelector('#booking-form');
const estimate = document.querySelector('#estimate');
const errorBox = document.querySelector('#form-error');
const modal = document.querySelector('#success-modal');
const money = (amount) => `NT$ ${amount.toLocaleString('zh-TW')}`;
const vehicleButtons = [...document.querySelectorAll('[data-vehicle]')];
const vehicleDetails = document.querySelector('#selected-vehicles');
const bikeDetailModal = document.querySelector('#bike-detail-modal');
const bikeIntros = {
  standard: { icon: '/icons/bike.svg', title: '一般單車', copy: '輕巧好上手，適合沿著海岸慢慢騎。租借不限時間，舊草嶺隧道來回約 4.2 公里。', prices: '不限時間原價 NT$ 100・預約 NT$ 80' },
  child: { icon: '/icons/family-bike.svg', title: '親子車', copy: '親子一起出遊的選擇，租借不限時間。騎乘前可請店家協助調整坐姿與舒適度，先試騎再出發。', prices: '不限時間原價 NT$ 150・預約 NT$ 120' },
  tandem: { icon: '/icons/tandem.svg', title: '協力車', copy: '兩人同騎、一起欣賞海岸風景，租借不限時間，適合探索舊草嶺環狀線。', prices: '不限時間原價 NT$ 200・預約 NT$ 160' },
  electric: { icon: '/icons/electric-bike.svg', title: '電動車', copy: '可選單人或雙人，租期可選 1.5 小時或 3 小時。預約每台折 NT$ 50。', prices: '單人 1.5 小時 NT$ 200・雙人 1.5 小時 NT$ 300・單人 3 小時 NT$ 300・雙人 3 小時 NT$ 400' },
};

function selectedIds() {
  return vehicleButtons.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.vehicle);
}

function collectVehicles() {
  return selectedIds().map((vehicleId) => ({
    vehicleId,
    packageId: form.querySelector(`[name="package-${vehicleId}"]`).value,
    quantity: form.querySelector(`[name="quantity-${vehicleId}"]`).value,
  }));
}

function renderVehicleDetails() {
  const ids = selectedIds();
  if (!ids.length) {
    vehicleDetails.replaceChildren(Object.assign(document.createElement('p'), { className: 'vehicle-hint', textContent: '可複選車種，選好後再分別設定方案與台數。' }));
    return;
  }
  vehicleDetails.replaceChildren(...ids.map((vehicleId) => {
    const vehicle = VEHICLES[vehicleId];
    const card = document.createElement('fieldset');
    card.className = 'rental-config';
    const legend = document.createElement('legend');
    legend.textContent = vehicle.name;
    const packageLabel = document.createElement('label');
    packageLabel.textContent = '租借時限';
    const packageSelect = document.createElement('select');
    packageSelect.name = `package-${vehicleId}`;
    packageSelect.className = 'rental-package';
    packageSelect.required = true;
    for (const [packageId, rentalPackage] of Object.entries(vehicle.packages)) {
      const option = document.createElement('option');
      option.value = packageId;
      const promo = rentalPackage.reservationPrice == null ? '預約 8 折' : '預約折 NT$ 50';
      option.textContent = `${rentalPackage.label}・原價 ${money(rentalPackage.price)}・${promo} ${money(getBookingPrice(vehicleId, packageId))}`;
      packageSelect.append(option);
    }
    packageLabel.append(packageSelect);
    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = '租借台數';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.name = `quantity-${vehicleId}`;
    quantityInput.className = 'rental-quantity';
    quantityInput.min = '1';
    quantityInput.max = '20';
    quantityInput.value = '1';
    quantityInput.required = true;
    quantityLabel.append(quantityInput);
    card.append(legend, packageLabel, quantityLabel);
    return card;
  }));
}

function refreshEstimate() {
  try {
    estimate.textContent = money(estimateRentals(collectVehicles()));
  } catch {
    estimate.textContent = '請先選車';
  }
  updateBookingReview();
}

async function getSubmissionError(response) {
  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};
  if (result.message) return result.message;
  if (response.status === 404 || response.status === 405) {
    return '預約服務尚未部署或目前網址沒有啟用預約 API。請使用店家正式網站重新送出，或致電 02-2499-1585。';
  }
  if (response.status === 503) {
    return '預約寄信服務尚未完成設定，需求沒有送出。請致電 02-2499-1585。';
  }
  if (response.status >= 500) {
    return `預約服務暫時故障（錯誤代碼 ${response.status}），需求沒有送出。請致電 02-2499-1585。`;
  }
  return `預約需求未送出（錯誤代碼 ${response.status}）。請檢查資料後重試，或致電 02-2499-1585。`;
}

const bookingSteps = [
  { title: '聯絡資料', elements: [...form.querySelectorAll('.form-row')].slice(0, 2).concat(form.querySelector('.booking-email-label'), form.querySelector('.booking-plate-label')) },
  { title: '選車與方案', elements: [form.querySelector('.full-label'), form.querySelector('.vehicle-options'), vehicleDetails, [...form.querySelectorAll('.form-row')][2]] },
  { title: '確認需求', elements: [form.querySelector('.estimate'), form.querySelector('.button-submit'), form.querySelector('.cancellation-notice'), form.querySelector('.form-privacy')] },
];
const progress = document.createElement('ol');
progress.className = 'booking-progress';
progress.setAttribute('aria-label', '預約步驟');
const panels = bookingSteps.map(({ title, elements }, index) => {
  const panel = document.createElement('section');
  panel.className = 'booking-step-panel';
  panel.dataset.step = String(index + 1);
  panel.setAttribute('aria-label', `第 ${index + 1} 步：${title}`);
  for (const element of elements) panel.append(element);
  if (index < 2) {
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'button button-dark booking-next';
    next.textContent = index === 0 ? '下一步：選擇車款 →' : '下一步：確認需求 →';
    next.addEventListener('click', () => {
      const data = Object.fromEntries(new FormData(form));
      data.vehicles = index === 0
        ? [{ vehicleId: 'standard', packageId: 'unlimited', quantity: '1' }]
        : collectVehicles();
      const errors = validateBooking(data);
      if (errors.length) return showBookingError(errors[0]);
      errorBox.textContent = '';
      showBookingStep(index + 2);
    });
    panel.append(next);
  }
  if (index > 0) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'booking-back';
    back.textContent = '← 上一步';
    back.addEventListener('click', () => showBookingStep(index));
    panel.prepend(back);
  }
  const item = document.createElement('li');
  item.textContent = `${index + 1}. ${title}`;
  progress.append(item);
  return panel;
});
form.querySelector('.form-heading').after(progress, ...panels);
progress.after(errorBox);
const review = document.createElement('div');
review.className = 'booking-review';
review.setAttribute('aria-live', 'polite');
review.innerHTML = '<strong>租借內容</strong><p>尚未選擇車款</p>';
form.querySelector('.estimate').before(review);

function showBookingStep(stepNumber) {
  panels.forEach((panel, index) => { panel.hidden = index + 1 !== stepNumber; });
  [...progress.children].forEach((item, index) => {
    if (index + 1 === stepNumber) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  if (stepNumber === 3) updateBookingReview();
  panels[stepNumber - 1].querySelector('button, input, select')?.focus({ preventScroll: true });
}

function showBookingError(message) {
  errorBox.textContent = message;
  const invalidField = message.includes('稱呼') ? '[name="name"]'
    : message.includes('日期') ? '[name="date"]'
      : message.includes('時間') ? '[name="time"]'
        : message.includes('電話') ? '[name="phone"]'
          : message.includes('電子郵件') ? '[name="email"]'
            : message.includes('車牌') ? '[name="plate"]'
            : message.includes('車款') ? '[data-vehicle]'
              : message.includes('時限') ? '.rental-package'
                : message.includes('台數') ? '.rental-quantity' : null;
  form.querySelector(invalidField)?.focus();
}

function updateBookingReview() {
  const paragraph = review.querySelector('p');
  const vehicles = collectVehicles();
  if (!vehicles.length) {
    paragraph.textContent = '尚未選擇車款';
    return;
  }
  paragraph.textContent = `${vehicles.map(({ vehicleId, packageId, quantity }) =>
    `${VEHICLES[vehicleId].name}｜${VEHICLES[vehicleId].packages[packageId].label}｜${quantity} 台，${money(getBookingPrice(vehicleId, packageId))} × ${quantity}`).join('　／　')}　｜　總計 ${money(estimateRentals(vehicles))}`;
}
showBookingStep(1);

vehicleButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selected = button.getAttribute('aria-pressed') !== 'true';
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    renderVehicleDetails();
    refreshEstimate();
    errorBox.textContent = '';
  });
});

document.querySelectorAll('[data-select-bike]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.querySelector(`[data-vehicle="${button.dataset.selectBike}"]`);
    if (target.getAttribute('aria-pressed') !== 'true') target.click();
    document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#booking-form [name="name"]').focus({ preventScroll: true });
  });
});

vehicleDetails.addEventListener('change', refreshEstimate);
vehicleDetails.addEventListener('input', refreshEstimate);
vehicleDetails.addEventListener('change', updateBookingReview);
vehicleDetails.addEventListener('input', updateBookingReview);
form.elements.date.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const timeSelect = form.elements.time;
for (let minutes = 8 * 60; minutes <= 17 * 60; minutes += 15) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  const option = document.createElement('option');
  option.value = `${hour}:${minute}`;
  option.textContent = option.value;
  timeSelect.append(option);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.vehicles = collectVehicles();
  const errors = validateBooking(data);
  if (errors.length) {
    errorBox.textContent = errors[0];
    showBookingError(errors[0]);
    return;
  }
  if (panels[2].hidden) {
    showBookingStep(3);
    return;
  }

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  errorBox.textContent = '正在安全送出需求…';
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      errorBox.textContent = await getSubmissionError(response);
      return;
    }
    const result = await response.json();

    const summary = data.vehicles.map(({ vehicleId, packageId, quantity }) =>
      `${VEHICLES[vehicleId].name}・${VEHICLES[vehicleId].packages[packageId].label} × ${quantity} 台`).join('、');
    modal.querySelector('.confirmation-summary').textContent = `${data.date} ${data.time}｜${summary}｜預估 ${money(estimateRentals(data.vehicles))}`;
    modal.querySelector('.confirmation-ref strong').textContent = result.requestId;
    modal.querySelector('.success-message').textContent = `需求已送到店家，確認副本會寄到 ${data.email}。這還不是預約成立通知，店家會再以電話確認車輛與時段。`;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
    form.reset();
    showBookingStep(1);
    vehicleButtons.forEach((button) => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    renderVehicleDetails();
    refreshEstimate();
    errorBox.textContent = '';
  } catch {
    errorBox.textContent = navigator.onLine
      ? '預約服務目前無法連線，可能尚未部署或暫時故障。需求沒有送出；請致電 02-2499-1585。'
      : '目前沒有網路連線，需求沒有送出；請連線後重試或致電 02-2499-1585。';
  } finally {
    submitButton.disabled = false;
  }
});

function closeModal() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
}
modal.querySelector('.modal-close').addEventListener('click', closeModal);
modal.querySelector('.modal-done').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeModal();
});

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

bikeDetailModal.querySelector('.bike-detail-close').addEventListener('click', closeBikeDetail);
bikeDetailModal.addEventListener('click', (event) => {
  if (event.target === bikeDetailModal) closeBikeDetail();
});
bikeDetailModal.querySelector('.bike-detail-book').addEventListener('click', () => {
  const vehicleId = bikeDetailModal.dataset.vehicle;
  const button = document.querySelector(`[data-vehicle="${vehicleId}"]`);
  if (button.getAttribute('aria-pressed') !== 'true') button.click();
  closeBikeDetail();
  document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
  document.querySelector('#booking-form [name="name"]').focus({ preventScroll: true });
});
bikeDetailModal.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeBikeDetail();
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.desktop-nav');
menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

renderVehicleDetails();
refreshEstimate();
