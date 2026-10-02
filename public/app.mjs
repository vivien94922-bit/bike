import { estimateRental, estimateRentals, getBookingPrice, validateBooking, VEHICLES } from './booking.mjs';

const form = document.querySelector('#booking-form');
const estimate = document.querySelector('#estimate');
const errorBox = document.querySelector('#form-error');
const modal = document.querySelector('#success-modal');
const money = (amount) => `NT$ ${amount.toLocaleString('zh-TW')}`;
const vehicleButtons = [...document.querySelectorAll('[data-vehicle]')];
const vehicleDetails = document.querySelector('#selected-vehicles');

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
      option.textContent = `${rentalPackage.label}・原價 ${money(rentalPackage.price)}・預約 ${money(getBookingPrice(vehicleId, packageId))}（8 折）`;
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
    const result = await response.json();
    if (!response.ok) {
      errorBox.textContent = result.message || '目前無法送出需求，請稍後再試或直接來電。';
      return;
    }

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
    errorBox.textContent = '目前無法連線送出需求，請稍後再試或直接來電。';
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

document.querySelectorAll('.choose-bike').forEach((button) => {
  button.addEventListener('click', () => {
    const toast = document.querySelector('#toast');
    toast.textContent = `${VEHICLES[button.dataset.selectBike].name} 已加入預約選車`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  });
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
