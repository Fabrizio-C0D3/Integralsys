document.addEventListener('DOMContentLoaded', function() {

        // --- Intersección para la animación del proyecto actual ---
        try {
            const splitContainer = document.querySelector('.split-layout-container');
            const projectHero = document.querySelector('.project-hero');

            if (splitContainer) {
                    // Mejorar sensibilidad: un poco antes de que el contenedor esté completamente visible
                    // Control de dirección de scroll para suavizar la reversión
                    let revertTimeout = null;
                    let lastScrollY = window.scrollY || 0;
                    window.addEventListener('scroll', () => { lastScrollY = window.scrollY; }, { passive: true });

                    const IO_REVERT_DELAY = 220; // ms cuando detectamos que el usuario está subiendo

                    const io = new IntersectionObserver(entries => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                if (revertTimeout) { clearTimeout(revertTimeout); revertTimeout = null; }
                                splitContainer.classList.add('in-view');
                                if (projectHero) projectHero.classList.add('shrink');
                            } else {
                                // Detectar dirección de scroll: si el usuario está subiendo, retrasar la reversión
                                const currentScrollY = window.scrollY || 0;
                                const scrollingUp = currentScrollY < lastScrollY;
                                if (scrollingUp) {
                                    if (revertTimeout) clearTimeout(revertTimeout);
                                    revertTimeout = setTimeout(() => {
                                        splitContainer.classList.remove('in-view');
                                        if (projectHero) projectHero.classList.remove('shrink');
                                        revertTimeout = null;
                                    }, IO_REVERT_DELAY);
                                } else {
                                    // Si no está subiendo (p. ej. baja o no hay dirección clara), revertir inmediatamente
                                    if (revertTimeout) { clearTimeout(revertTimeout); revertTimeout = null; }
                                    splitContainer.classList.remove('in-view');
                                    if (projectHero) projectHero.classList.remove('shrink');
                                }
                            }
                        });
                    }, { threshold: 0.12, rootMargin: '0px 0px -18% 0px' });

                    io.observe(splitContainer);

                    io.observe(splitContainer);

                    // Fallback para cuando el observer no se dispare (por razones de tamaño/vista)
                    const checkAndActivate = () => {
                        // Si estamos en la parte superior de la página quitamos inmediatamente
                        if (window.scrollY === 0) {
                            splitContainer.classList.remove('in-view');
                            if (projectHero) projectHero.classList.remove('shrink');
                            return false;
                        }

                        const rect = splitContainer.getBoundingClientRect();
                        if (rect.top < window.innerHeight * 0.88) {
                            splitContainer.classList.add('in-view');
                            if (projectHero) projectHero.classList.add('shrink');
                            return true;
                        }
                        return false;
                    };

                    // Ejecutar al cargar y en scroll/resize (con debounce simple)
                    checkAndActivate();
                    let timeoutId = null;
                    const onScrollResize = () => {
                        if (timeoutId) clearTimeout(timeoutId);
                        timeoutId = setTimeout(() => {
                            checkAndActivate();
                        }, 120);
                    };
                    window.addEventListener('scroll', onScrollResize, { passive: true });
                    window.addEventListener('resize', onScrollResize);
                }
        } catch (e) {
            // No detener la ejecución si el observer falla
            console.error('IntersectionObserver error:', e);
        }

                // Al hacer clic en la flecha baja hasta el contenido del proyecto
                try {
                    const chevron = document.querySelector('.scroll-indicator');
                    const split = document.querySelector('.split-layout-container');
                    if (chevron && split) {
                        chevron.addEventListener('click', () => {
                            split.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    }
                } catch (e) {
                    console.error('scroll-to error:', e);
                }
                // CTA button: llevar al usuario a la sección de tipos de apartamentos
                try {
                    // Scroll responsivo hasta la sección de bienvenida, alineando el texto justo debajo del navbar
                    const ctaBtn = document.getElementById('cta-view-apartments');
                    if (ctaBtn) {
                        ctaBtn.addEventListener('click', function (ev) {
                            ev.preventDefault();
                            const bienvenida = document.getElementById('bienvenida');
                            if (bienvenida) {
                                // Detectar altura real del navbar sticky (puede cambiar en móvil)
                                let offset = 0;
                                const navbar = document.querySelector('.navbar.sticky') || document.querySelector('.navbar');
                                if (navbar) {
                                    offset = navbar.offsetHeight || 0;
                                }
                                // Pequeño margen extra para que no quede pegado
                                offset += 12;
                                // Calcular posición destino
                                const top = bienvenida.getBoundingClientRect().top + window.pageYOffset - offset;
                                // Scroll suave
                                window.scrollTo({
                                    top: top,
                                    behavior: 'smooth'
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error('CTA scroll error:', e);
                }






                    // Sticky navbar: show fixed navbar after scrolling past hero (funciona en todas las páginas)
                    try {
                        const navbar = document.querySelector('.navbar');
                        // Usa .project-hero si existe, si no .hero
                        let hero = document.querySelector('.project-hero') || document.querySelector('.hero');
                        if (navbar && hero) {
                            const heroBottom = () => hero.getBoundingClientRect().bottom + window.scrollY;
                            let pinned = false;
                            let hideTimeout = null;
                            const TRANSITION_FALLBACK = 620; // ms

                            const finishHide = () => {
                                navbar.classList.remove('sticky', 'sticky--hide');
                                document.body.style.paddingTop = '';
                                pinned = false;
                                if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
                            };

                            const checkSticky = () => {
                                // recalcula hero por si cambia (SPA o resize)
                                hero = document.querySelector('.project-hero') || document.querySelector('.hero');
                                const bottom = hero ? (hero.getBoundingClientRect().bottom + window.scrollY) : 0;
                                if (window.scrollY > (bottom - 80)) {
                                    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
                                    if (navbar.classList.contains('sticky--hide')) {
                                        navbar.classList.remove('sticky--hide');
                                    }
                                    if (!pinned) {
                                        navbar.classList.add('sticky');
                                        document.body.style.paddingTop = navbar.offsetHeight + 'px';
                                        pinned = true;
                                    }
                                } else {
                                    if (pinned && !navbar.classList.contains('sticky--hide')) {
                                        navbar.classList.add('sticky--hide');
                                        const onTransitionEnd = function (ev) {
                                            if (ev && ev.target === navbar) {
                                                navbar.removeEventListener('transitionend', onTransitionEnd);
                                                finishHide();
                                            }
                                        };
                                        navbar.addEventListener('transitionend', onTransitionEnd);
                                        hideTimeout = setTimeout(() => {
                                            try { navbar.removeEventListener('transitionend', onTransitionEnd); } catch (e) {}
                                            finishHide();
                                        }, TRANSITION_FALLBACK);
                                    }
                                }
                            };

                            window.addEventListener('scroll', checkSticky, { passive: true });
                            window.addEventListener('resize', checkSticky);
                            checkSticky();
                        }
                    } catch (e) { console.error('sticky nav error', e); }
});

// Scroll progress and reveal helper (idempotent)
(function () {
    try {
        var progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            var updateProgress = function () {
                var scrollTop = window.scrollY || window.pageYOffset;
                var docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
                var pct = docHeight > 0 ? Math.max(0, Math.min(100, (scrollTop / docHeight) * 100)) : 0;
                progressBar.style.width = pct + '%';
            };
            window.addEventListener('scroll', updateProgress, { passive: true });
            window.addEventListener('resize', updateProgress);
            updateProgress();
        }

        // IntersectionObserver for .animate-on-scroll
        var animated = document.querySelectorAll('.animate-on-scroll');
        if ('IntersectionObserver' in window && animated.length) {
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                    }
                });
            }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
            animated.forEach(function (el) { obs.observe(el); });
        } else {
            // Fallback: reveal all
            animated.forEach(function (el) { el.classList.add('in-view'); });
        }
    } catch (e) { console.error('progress/reveal error', e); }
})();

// Lógica de pestañas (Tabs) para la sección de detalles del proyecto
(function () {
    try {
        const tabs = document.querySelectorAll('.project-details .tab');
        const panels = document.querySelectorAll('.project-details .tab-panel');

        if (tabs.length && panels.length) {
            tabs.forEach(tab => {
                tab.addEventListener('click', function (ev) {
                    ev.preventDefault();

                    // No hacer nada si la pestaña ya está activa
                    if (tab.classList.contains('active')) {
                        return;
                    }

                    const targetId = tab.getAttribute('data-tab');
                    const targetPanel = document.getElementById(targetId);

                    // Desactivar todas las pestañas y paneles
                    tabs.forEach(t => {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    panels.forEach(p => {
                        p.hidden = true;
                    });

                    // Activar la pestaña y el panel correctos
                    tab.classList.add('active');
                    tab.setAttribute('aria-selected', 'true');
                    if (targetPanel) {
                        targetPanel.hidden = false;
                    }
                });
            });
        }
    } catch (e) { console.error('Tabs logic error:', e); }
})();
/* Request button -> open contact panel behavior */
(function () {
    try {
        // open the tab-panel with id 'contact' when any .request-btn is clicked
        var requestBtns = document.querySelectorAll('.request-btn');
        if (requestBtns.length) {
            requestBtns.forEach(function (btn) {
                btn.addEventListener('click', function (ev) {
                    ev && ev.preventDefault && ev.preventDefault();
                    // capture apartment data (if provided)
                    var aptId = btn.getAttribute('data-apt-id') || '';
                    var aptName = btn.getAttribute('data-apt-name') || '';
                    var aptArea = btn.getAttribute('data-apt-area') || '';
                    var aptPrice = btn.getAttribute('data-apt-price') || '';

                    // hide all tab panels and tabs
                    var tabs = document.querySelectorAll('.project-details .tab');
                    var panels = document.querySelectorAll('.project-details .tab-panel');
                    tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
                    panels.forEach(function (p) { p.hidden = true; });

                    // determine which contact panel to show
                    var targetPanel = null;
                    if (aptId) {
                        targetPanel = document.getElementById('contact-' + aptId);
                    }

                    // fallback: try generic contact id
                    if (!targetPanel) targetPanel = document.getElementById('contact');

                    if (targetPanel) {
                        targetPanel.hidden = false;
                        targetPanel.classList.add('in-view');
                        // populate the summary within the specific panel if present
                        try {
                            var summaryId = 'selectedAptSummary-' + (aptId || '');
                            var summary = document.getElementById(summaryId);
                            if (summary) {
                                var html = '';
                                if (aptName) html += '<div><strong>' + aptName + '</strong></div>';
                                if (aptArea) html += '<div>Área: ' + aptArea + '</div>';
                                if (aptPrice) html += '<div>Valor: <strong>' + aptPrice + '</strong></div>';
                                summary.innerHTML = html;
                            }
                        } catch (e) { /* ignore */ }

                        // scroll into view the contact panel
                        targetPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
        }

        // close behavior
        document.addEventListener('click', function (ev) {
            var close = ev.target.closest && ev.target.closest('.close-contact');
            if (close) {
                // hide any contact panel wrappers
                var contactWrappers = document.querySelectorAll('.contact-panel-wrapper');
                contactWrappers.forEach(function (w) { w.hidden = true; w.classList.remove('in-view'); });
                // activate 'apts' (Apartamentos) tab and show it
                var tabsAll = document.querySelectorAll('.project-details .tab');
                var panels = document.querySelectorAll('.project-details .tab-panel');
                tabsAll.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
                var aptsTab = document.querySelector('.project-details .tab[data-tab="apts"]');
                if (aptsTab) { aptsTab.classList.add('active'); aptsTab.setAttribute('aria-selected','true'); }
                panels.forEach(function (p) { p.hidden = (p.id !== 'apts'); });
                // ensure the apartments panel receives focus for accessibility
                var aptsPanel = document.getElementById('apts');
                if (aptsPanel) { aptsPanel.classList.add('in-view'); aptsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }
        });

        // no form submit handling needed (no submit button)
    } catch (e) { console.error('contact panel error', e); }
})();

// ===== MANEJO DEL FORMULARIO DE CONTACTO =====
(function() {
    try {
        const forms = document.querySelectorAll('.contact-form');
        if (!forms || !forms.length) return;

        // Mostrar mensaje de éxito si viene de redirección (global)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === '1') {
            // mostrar notificación simple en la página
            alert('Registro guardado correctamente. Nos pondremos en contacto pronto.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        forms.forEach(function(form) {
            const feedbackDiv = form.querySelector('.contact-feedback');
            form.addEventListener('submit', function(e) {
                e.preventDefault();

                const btnSubmit = form.querySelector('button[type=submit]');
                if (btnSubmit) {
                    var btnTextOriginal = btnSubmit.innerHTML;
                    btnSubmit.disabled = true;
                    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
                }

                const formData = new FormData(form);

                fetch('guardar_contacto.php', {
                    method: 'POST',
                    body: formData,
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                })
                .then(response => {
                    if (!response.ok) return response.text().then(text => { throw new Error(text || 'Error en el servidor'); });
                    return response.text();
                })
                .then(data => {
                    if (feedbackDiv) {
                        feedbackDiv.className = 'alert alert-success';
                        feedbackDiv.textContent = data || 'Registro guardado correctamente.';
                        feedbackDiv.classList.remove('d-none');
                        feedbackDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                    form.reset();
                })
                .catch(error => {
                    if (feedbackDiv) {
                        feedbackDiv.className = 'alert alert-danger';
                        feedbackDiv.textContent = error.message || 'Error al enviar el formulario.';
                        feedbackDiv.classList.remove('d-none');
                    }
                })
                .finally(() => {
                    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = btnTextOriginal; }
                });
            });
        });

    } catch (e) {
        console.error('Formulario de contacto error:', e);
    }
})();
