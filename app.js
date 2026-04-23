/* =========================================================
   Eonic Labs — Hero Background Animations
   4 variants, all mouse-reactive:
     - network     (constellation lines — matches logo's molecule)
     - particles   (displaced particle field)
     - dotgrid     (dot grid that bends toward cursor)
     - aurora      (gradient spotlight following mouse)
   ========================================================= */

(function () {
    const canvas = document.querySelector('canvas.hero-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;

    // Mouse state (smoothed)
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    // Track which variant is active; default = network
    let variant = localStorage.getItem('eonic-hero-variant') || 'network';

    // --- Resize ---------------------------------------------------
    function resize() {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initCurrent();
    }

    // --- Mouse ----------------------------------------------------
    window.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.tx = e.clientX - rect.left;
        mouse.ty = e.clientY - rect.top;
        mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
        mouse.active = false;
        mouse.tx = width / 2;
        mouse.ty = height / 2;
    });

    // Touch
    window.addEventListener('touchmove', e => {
        if (!e.touches.length) return;
        const rect = canvas.getBoundingClientRect();
        mouse.tx = e.touches[0].clientX - rect.left;
        mouse.ty = e.touches[0].clientY - rect.top;
        mouse.active = true;
    }, { passive: true });

    // ==============================================================
    // VARIANT 1: NETWORK (constellation, matches logo molecule)
    // ==============================================================
    const NET = { nodes: [], linkDist: 140, count: 70 };

    function initNetwork() {
        NET.count = Math.round((width * height) / 18000);
        NET.nodes = [];
        for (let i = 0; i < NET.count; i++) {
            NET.nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                r: Math.random() * 1.8 + 0.6
            });
        }
    }

    function drawNetwork() {
        ctx.clearRect(0, 0, width, height);

        // Subtle bg glow behind mouse
        if (mouse.active) {
            const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280);
            g.addColorStop(0, 'rgba(0, 174, 239, 0.12)');
            g.addColorStop(1, 'rgba(0, 174, 239, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }

        // Update & draw nodes with mouse influence
        for (const n of NET.nodes) {
            // Drift
            n.x += n.vx;
            n.y += n.vy;

            // Wrap
            if (n.x < -10) n.x = width + 10;
            if (n.x > width + 10) n.x = -10;
            if (n.y < -10) n.y = height + 10;
            if (n.y > height + 10) n.y = -10;

            // Mouse repulsion/attraction
            if (mouse.active) {
                const dx = n.x - mouse.x;
                const dy = n.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 140 * 140) {
                    const d = Math.sqrt(d2) || 1;
                    const force = (140 - d) / 140 * 0.6;
                    n.x += (dx / d) * force;
                    n.y += (dy / d) * force;
                }
            }
        }

        // Lines
        ctx.lineWidth = 1;
        for (let i = 0; i < NET.nodes.length; i++) {
            const a = NET.nodes[i];
            for (let j = i + 1; j < NET.nodes.length; j++) {
                const b = NET.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < NET.linkDist * NET.linkDist) {
                    const d = Math.sqrt(d2);
                    const alpha = (1 - d / NET.linkDist) * 0.45;
                    ctx.strokeStyle = `rgba(90, 190, 240, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // Link to mouse
            if (mouse.active) {
                const dx = a.x - mouse.x;
                const dy = a.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 200 * 200) {
                    const d = Math.sqrt(d2);
                    const alpha = (1 - d / 200) * 0.8;
                    ctx.strokeStyle = `rgba(34, 195, 255, ${alpha})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                    ctx.lineWidth = 1;
                }
            }
        }

        // Dots on top
        for (const n of NET.nodes) {
            ctx.fillStyle = 'rgba(180, 220, 245, 0.8)';
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ==============================================================
    // VARIANT 2: PARTICLES (flow field displaced by mouse)
    // ==============================================================
    const PT = { particles: [], count: 0 };

    function initParticles() {
        PT.count = Math.round((width * height) / 3200);
        PT.particles = [];
        for (let i = 0; i < PT.count; i++) {
            PT.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: 0,
                vy: 0,
                life: Math.random(),
                maxLife: 200 + Math.random() * 300,
                size: Math.random() * 1.4 + 0.4
            });
        }
    }

    function drawParticles() {
        // Trails: fade prev frame
        ctx.fillStyle = 'rgba(5, 11, 20, 0.08)';
        ctx.fillRect(0, 0, width, height);

        const t = performance.now() * 0.0002;

        for (const p of PT.particles) {
            // Base flow field (perlin-ish using sin combos)
            const angle =
                Math.sin(p.x * 0.004 + t) * 1.5 +
                Math.cos(p.y * 0.004 - t) * 1.5;

            p.vx += Math.cos(angle) * 0.05;
            p.vy += Math.sin(angle) * 0.05;

            // Mouse push
            if (mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 160 * 160 && d2 > 1) {
                    const d = Math.sqrt(d2);
                    const f = (160 - d) / 160 * 0.9;
                    p.vx += (dx / d) * f;
                    p.vy += (dy / d) * f;
                }
            }

            p.vx *= 0.93;
            p.vy *= 0.93;
            p.x += p.vx;
            p.y += p.vy;
            p.life++;

            if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                p.x = Math.random() * width;
                p.y = Math.random() * height;
                p.vx = 0;
                p.vy = 0;
                p.life = 0;
            }

            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            const alpha = Math.min(1, speed * 0.8 + 0.15);
            ctx.fillStyle = `rgba(34, 195, 255, ${alpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ==============================================================
    // VARIANT 3: DOT GRID (warps toward cursor)
    // ==============================================================
    const GRID = { spacing: 32 };

    function initGrid() { /* nothing */ }

    function drawGrid() {
        ctx.clearRect(0, 0, width, height);
        const s = GRID.spacing;
        const cols = Math.ceil(width / s) + 2;
        const rows = Math.ceil(height / s) + 2;
        const influence = 220;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                let x = i * s;
                let y = j * s;
                let size = 1.2;
                let alpha = 0.22;

                if (mouse.active) {
                    const dx = x - mouse.x;
                    const dy = y - mouse.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < influence * influence) {
                        const d = Math.sqrt(d2) || 1;
                        const f = (influence - d) / influence; // 0-1
                        // Push dots toward the cursor
                        x -= (dx / d) * f * 26;
                        y -= (dy / d) * f * 26;
                        size = 1.2 + f * 3.2;
                        alpha = 0.22 + f * 0.78;
                    }
                }

                ctx.fillStyle = `rgba(110, 200, 245, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ==============================================================
    // VARIANT 4: AURORA (radial gradient spotlight follows mouse)
    // ==============================================================
    const AUR = { blobs: [] };

    function initAurora() {
        AUR.blobs = [];
        for (let i = 0; i < 5; i++) {
            AUR.blobs.push({
                x: Math.random() * width,
                y: Math.random() * height,
                r: 260 + Math.random() * 200,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                hue: 195 + Math.random() * 20
            });
        }
    }

    function drawAurora() {
        // Fade bg subtly
        ctx.fillStyle = 'rgba(5, 11, 20, 0.14)';
        ctx.fillRect(0, 0, width, height);

        ctx.globalCompositeOperation = 'lighter';
        for (const b of AUR.blobs) {
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < -b.r) b.x = width + b.r;
            if (b.x > width + b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = height + b.r;
            if (b.y > height + b.r) b.y = -b.r;

            // Mouse nudge
            let cx = b.x, cy = b.y;
            if (mouse.active) {
                cx += (mouse.x - width / 2) * 0.15;
                cy += (mouse.y - height / 2) * 0.15;
            }

            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
            g.addColorStop(0, `hsla(${b.hue}, 100%, 55%, 0.28)`);
            g.addColorStop(0.5, `hsla(${b.hue}, 100%, 55%, 0.08)`);
            g.addColorStop(1, `hsla(${b.hue}, 100%, 55%, 0)`);
            ctx.fillStyle = g;
            ctx.fillRect(cx - b.r, cy - b.r, b.r * 2, b.r * 2);
        }

        // Strong spotlight at mouse
        if (mouse.active) {
            const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
            g.addColorStop(0, 'rgba(100, 220, 255, 0.22)');
            g.addColorStop(1, 'rgba(100, 220, 255, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // --- Init helpers ----------------------------------------------
    function initCurrent() {
        ctx.clearRect(0, 0, width, height);
        if (variant === 'network') initNetwork();
        else if (variant === 'particles') initParticles();
        else if (variant === 'dotgrid') initGrid();
        else if (variant === 'aurora') initAurora();
    }

    // --- Animation loop --------------------------------------------
    function tick() {
        // Smooth mouse
        if (mouse.tx > -9000) {
            mouse.x += (mouse.tx - mouse.x) * 0.15;
            mouse.y += (mouse.ty - mouse.y) * 0.15;
        }

        if (variant === 'network') drawNetwork();
        else if (variant === 'particles') drawParticles();
        else if (variant === 'dotgrid') drawGrid();
        else if (variant === 'aurora') drawAurora();

        requestAnimationFrame(tick);
    }

    // --- Public control for Tweaks panel ---------------------------
    window.setHeroVariant = function (v) {
        variant = v;
        localStorage.setItem('eonic-hero-variant', v);
        initCurrent();
    };

    window.getHeroVariant = function () { return variant; };

    // Kick off
    window.addEventListener('resize', resize);
    resize();
    mouse.x = width / 2;
    mouse.y = height / 2;
    mouse.tx = width / 2;
    mouse.ty = height / 2;
    tick();
})();

/* =========================================================
   Header theme toggle — dark when hero is visible
   ========================================================= */
(function () {
    const header = document.querySelector('header.site-header');
    const hero = document.querySelector('.hero-dark');
    if (!header || !hero) return;

    function onScroll() {
        const rect = hero.getBoundingClientRect();
        if (rect.bottom > 80) header.classList.add('is-dark');
        else header.classList.remove('is-dark');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();

/* =========================================================
   Tweaks panel
   ========================================================= */
(function () {
    const panel = document.querySelector('.tweaks-panel');
    if (!panel) return;

    // Register listener BEFORE announcing availability
    window.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === '__activate_edit_mode') panel.classList.add('open');
        if (d.type === '__deactivate_edit_mode') panel.classList.remove('open');
    });
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}

    // Wire variant buttons
    panel.querySelectorAll('[data-variant]').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.variant;
            window.setHeroVariant && window.setHeroVariant(v);
            panel.querySelectorAll('[data-variant]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Sync active on load
    const cur = window.getHeroVariant ? window.getHeroVariant() : 'network';
    panel.querySelectorAll('[data-variant]').forEach(b => {
        if (b.dataset.variant === cur) b.classList.add('active');
    });

    // Close button
    const closeBtn = panel.querySelector('.tweaks-close');
    if (closeBtn) closeBtn.addEventListener('click', () => panel.classList.remove('open'));

    // Logo variant wiring
    const hero = document.querySelector('.hero-dark');
    const glyph = document.querySelector('.hero-logo-glyph');
    const watermark = document.querySelector('.hero-logo-watermark');
    const brandBand = document.querySelector('.brand-band');
    const LOGO_KEY = 'eonic-logo-variant';

    function applyLogoVariant(v) {
        if (!hero) return;
        hero.setAttribute('data-logo-variant', v);
        // Watermark is ALWAYS on, except when explicitly off
        if (watermark) watermark.style.display = (v === 'off') ? 'none' : '';
        if (glyph) glyph.style.display = (v === 'glyph-big') ? '' : 'none';
        if (brandBand) {
            // Brand band shows for brand-band OR combined-with-watermark variants
            if (v === 'brand-band' || v === 'watermark') brandBand.removeAttribute('hidden');
            else brandBand.setAttribute('hidden', '');
        }
        try { localStorage.setItem(LOGO_KEY, v); } catch (e) {}
        panel.querySelectorAll('[data-logo]').forEach(b => {
            b.classList.toggle('active', b.dataset.logo === v);
        });
    }

    // Restore from storage (default: watermark, which also shows brand-band)
    let initialLogo = 'watermark';
    try { initialLogo = localStorage.getItem(LOGO_KEY) || 'watermark'; } catch (e) {}
    applyLogoVariant(initialLogo);

    panel.querySelectorAll('[data-logo]').forEach(btn => {
        btn.addEventListener('click', () => applyLogoVariant(btn.dataset.logo));
    });
})();

/* =========================================================
   Contact form (demo) — prevent submit + show success
   ========================================================= */
(function () {
    const form = document.querySelector('.contact-form');
    if (!form) return;
    form.addEventListener('submit', e => {
        e.preventDefault();
        const fb = form.querySelector('.form-feedback');
        if (fb) {
            fb.classList.add('success');
            fb.textContent = 'Thanks — we\'ll get back to you within two business days.';
        }
        form.reset();
    });
})();

/* =========================================================
   Reveal on scroll
   ========================================================= */
(function () {
    const els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || !els.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('revealed');
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
})();
