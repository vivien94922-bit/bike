import { estimateRental, validateBooking, VEHICLES } from './booking.mjs';

const form = document.querySelector('#booking-form');
const estimate = document.querySelector('#estimate');
const errorBox = document.querySelector('#form-error');
const modal = document.querySelector('#success-modal');
const money = (amount) => `NT$ ${amount.toLocaleString('zh-TW')}`;
let selectedVehicle = 'city';

function refreshEstimate() {
  const quantity = form.elements.quantity.value;
  estimate.textContent = money(estimateRental(selectedVehicle, quantity));
}

document.querySelectorAll('[data-vehicle]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedVehicle = button.dataset.vehicle;
    document.querySelectorAll('[data-vehicle]').forEach((option) => {
      const active = option === button;
      option.classList.toggle('selected', active);
      option.setAttribute('aria-pressed', String(active));
    });
    refreshEstimate();
    errorBox.textContent = '';
  });
});

document.querySelectorAll('[data-select-bike]').forEach((button) => {
  button.addEventListener('click', () => {
    const target = document.querySelector(`[data-vehicle="${button.dataset.selectBike}"]`);
    target.click();
    document.querySelector('#booking').scrollIntoView({ behavior: 'smooth' });
    document.querySelector('#booking-form [name="name"]').focus({ preventScroll: true });
  });
});

form.elements.quantity.addEventListener('change', refreshEstimate);
form.elements.date.min = new Date().toISOString().slice(0, 10);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.vehicle = selectedVehicle;
  const errors = validateBooking(data);
  if (errors.length) {
    errorBox.textContent = errors[0];
    form.querySelector(`[name="${errors[0].includes('日期') ? 'date' : errors[0].includes('時段') ? 'time' : errors[0].includes('手機') ? 'phone' : 'name'}"]`).focus();
    return;
  }

  const requestId = `SR-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  modal.querySelector('.confirmation-summary').textContent = `${data.date}・${data.time}｜${VEHICLES[data.vehicle].name} × ${data.quantity} 台｜預估 ${money(estimateRental(data.vehicle, data.quantity))}`;
  modal.querySelector('.confirmation-ref strong').textContent = requestId;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  modal.querySelector('.modal-close').focus();
  form.reset();
  selectedVehicle = 'city';
  document.querySelectorAll('[data-vehicle]').forEach((option) => {
    const active = option.dataset.vehicle === selectedVehicle;
    option.classList.toggle('selected', active);
    option.setAttribute('aria-pressed', String(active));
  });
  refreshEstimate();
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
    toast.textContent = `${VEHICLES[button.dataset.selectBike].name} 已帶入預約表單`;
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

refreshEstimate();
