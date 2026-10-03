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
  standard: { icon: '🚲', title: '一般單車', copy: '輕巧好上手，適合沿著海岸慢慢騎。騎訪舊草嶺隧道來回約 4.2 公里，可選 1.5 小時或不限時間方案。', prices: '1.5 小時預約 NT$ 50・不限時間預約 NT$ 80' },
  child: { icon: '🚲', title: '親子車', copy: '親子一起出遊的選擇，騎乘前可請店家協助調整坐姿與舒適度，先試騎再出發。', prices: '1.5 小時預約 NT$ 80・不限時間預約 NT$ 120' },
  tandem: { icon: '🚴', title: '協力車', copy: '兩人同騎、一起欣賞海岸風景，適合想並肩探索舊草嶺環狀線的旅伴。', prices: '1.5 小時預約 NT$ 160・不限時間預約 NT$ 200' },
  electric: { icon: '⚡🚲', title: '電動車', copy: '想輕鬆走遠一點，可選電動車方案。租期 3 小時，預約前請先來電確認車輛。', prices: '3 小時預約 NT$ 300' },
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
      option.textContent = `${rentalPackage.label}・原價 ${money(rentalPackage.price)}・預約優惠 ${money(getBookingPrice(vehicleId, packageId))}`;
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
form.elements.date.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.vehicles = collectVehicles();
  const errors = validateBooking(data);
  if (errors.length) {
    errorBox.textContent = errors[0];
    const invalidField = errors[0].includes('稱呼') ? '[name="name"]'
      : errors[0].includes('日期') ? '[name="date"]'
        : errors[0].includes('時間') ? '[name="time"]'
          : errors[0].includes('電話') ? '[name="phone"]'
            : errors[0].includes('電子郵件') ? '[name="email"]'
            : errors[0].includes('車款') ? '[data-vehicle]'
              : errors[0].includes('時限') ? '.rental-package'
                : errors[0].includes('台數') ? '.rental-quantity' : '[name="name"]';
    form.querySelector(invalidField)?.focus();
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
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
    form.reset();
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
  bikeDetailModal.querySelector('.bike-detail-icon').textContent = intro.icon;
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
