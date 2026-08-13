/**
 * HyperNova Technology - Coming Soon Countdown & Subscriber Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // Target Launch Date: 15th August 2026 00:00:00
  const launchDate = new Date('2026-08-15T00:00:00+05:30').getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = launchDate - now;

    if (distance <= 0) {
      document.getElementById('timer-days').innerText = '00';
      document.getElementById('timer-hours').innerText = '00';
      document.getElementById('timer-mins').innerText = '00';
      document.getElementById('timer-secs').innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('timer-days').innerText = days < 10 ? '0' + days : days;
    document.getElementById('timer-hours').innerText = hours < 10 ? '0' + hours : hours;
    document.getElementById('timer-mins').innerText = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById('timer-secs').innerText = seconds < 10 ? '0' + seconds : seconds;
  }

  // Initial call & 1-second interval
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Email Notification Form Handler
  document.getElementById('form-coming-soon-email')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('subscriber-email');
    const email = emailInput.value.trim();

    if (!email) return;

    try {
      const subscriberObj = {
        id: 'sub-' + Date.now(),
        email: email,
        subscribedAt: new Date().toISOString()
      };

      await window.HyperNovaStore.setDoc('subscribers', subscriberObj.id, subscriberObj);

      window.HyperNovaNotify.showToast(
        "Subscription Confirmed!",
        `Thank you! You'll be notified at ${email} on 15th August 2026.`,
        "success"
      );

      emailInput.value = '';
    } catch (err) {
      window.HyperNovaNotify.showToast("Subscription Error", err.message, "error");
    }
  });
});
