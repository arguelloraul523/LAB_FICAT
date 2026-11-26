<template>
  <footer class="footer">
    <div class="footer-inner">
      <!-- Bloque superior: datos de LABFICAT -->
      <div class="footer-bloque">
        <div class="footer-titulo">LABFICAT — Caracterización Fisicoquímica de Alimentos</div>
        <div class="footer-sub">Centro Agroturístico de San Gil</div>
        <div class="footer-contacto">
          <div class="footer-item"><q-icon name="mail" size="1rem" /> labficat@sena.edu.co</div>
          <div class="footer-item"><q-icon name="phone" size="1rem" /> +57 300 000 0000</div>
          <div class="footer-item"><q-icon name="location_on" size="1rem" /> San Gil, Santander — Colombia</div>
        </div>
      </div>
    </div>

    <!-- Fila propia de redes sociales -->
    <div class="footer-social-row">
      <a href="#" class="social" aria-label="Facebook" title="Facebook">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
      </a>
      <a href="#" class="social" aria-label="Instagram" title="Instagram">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2 0 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2 0 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3 0-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2 0-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3 0 1.7-.1 4.9-.1zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.3a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>
      </a>
      <a href="#" class="social" aria-label="X" title="X">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.3L2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z"/></svg>
      </a>
      <a href="#" class="social" aria-label="YouTube" title="YouTube">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7L15.5 12l-6 3.5z"/></svg>
      </a>
    </div>

    <div class="footer-bottom">© 2026 SENA — Servicio Nacional de Aprendizaje</div>
  </footer>
</template>

<script setup>
// Footer público de la landing (Inicio y Servicios).
</script>

<style scoped>
.footer { background: #00324d; color: #cbd5e1; }
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 8px;
}
.footer-bloque { display: flex; flex-direction: column; gap: 10px; }
.footer-titulo { font-weight: 800; font-size: 1.05rem; color: #ffffff; }
.footer-sub { color: #9fb3c8; }
.footer-contacto {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  margin-top: 8px;
}
.footer-item { display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 0.85rem; }
.footer-item .q-icon { color: #39a900; }

/* Fila propia de redes sociales, antes del copyright. */
.footer-social-row {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transition: all 0.2s;
}
.social:hover { background: #39a900; transform: translateY(-2px); }

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
  color: #9fb3c8;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .footer-inner { padding: 32px 16px 4px; }
  .footer-contacto { flex-direction: column; gap: 8px; }
  .footer-social-row { padding: 12px 16px 20px; }
  .footer-bottom { padding: 14px 16px; }
}
</style>
