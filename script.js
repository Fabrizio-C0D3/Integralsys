document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.querySelector('.lupa');
    const body = document.body;
    const searchInput = searchForm ? searchForm.querySelector('input[type="search"]') : null;

    // Buscar en todo el documento por defecto (más completo). Evitamos tags peligrosos en el TreeWalker.
    const searchArea = document.body;

    // ======= BÚSQUEDA EN PÁGINA: highlight + navegación =======
    // Evitar búsquedas dentro de ciertos elementos (scripts, style, textarea, inputs)
    const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT']);

    // Eliminamos highlights previos de forma segura
    function removeHighlights() {
        const marks = searchArea.querySelectorAll('mark.copilot-search-hit');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            // reemplazar el <mark> por su contenido de texto
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        // limpiar estado de navegación
        searchState.matches = [];
        searchState.index = -1;
    }

    // escapar texto para usar en RegExp
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // estructura para mantener resultados y posición
    const searchState = { matches: [], index: -1 };

    // Función que recorre nodos de texto y aplica <mark> a las coincidencias
    function findAndHighlight(term) {
        removeHighlights();
        if (!term) return;

        const safe = escapeRegExp(term);
        const regex = new RegExp(safe, 'gi');

        // TreeWalker para nodos de texto, evitando áreas no deseadas
        const walker = document.createTreeWalker(searchArea, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                // ignorar texto vacío
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (SKIP_TAGS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
                // también evitar que el texto dentro de elementos marcados sea procesado
                if (parent.closest && parent.closest('mark')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            const matches = node.nodeValue.match(regex);
            if (matches) {
                const frag = document.createDocumentFragment();
                let remaining = node.nodeValue;
                let lastIndex = 0;
                let match;
                // iterar usando exec para capturar posiciones
                const re = new RegExp(regex.source, 'gi');
                while ((match = re.exec(node.nodeValue)) !== null) {
                    const before = node.nodeValue.substring(lastIndex, match.index);
                    if (before) frag.appendChild(document.createTextNode(before));
                    const mark = document.createElement('mark');
                    mark.className = 'copilot-search-hit';
                    mark.textContent = match[0];
                    frag.appendChild(mark);
                    // guardar referencia para navegación
                    searchState.matches.push(mark);
                    lastIndex = match.index + match[0].length;
                }
                const after = node.nodeValue.substring(lastIndex);
                if (after) frag.appendChild(document.createTextNode(after));
                node.parentNode.replaceChild(frag, node);
            }
        });

        // si hay resultados, enfocar y scrollear al primero
        if (searchState.matches.length) {
            searchState.index = 0;
            scrollToMatch(searchState.index);
        }
    }

    function scrollToMatch(idx) {
        if (!searchState.matches.length) return;
        idx = Math.max(0, Math.min(idx, searchState.matches.length - 1));
        searchState.index = idx;
        const el = searchState.matches[idx];
        // resaltar el actual con clase
        searchState.matches.forEach((m, i) => m.classList.toggle('active-hit', i === idx));
        // asegurar que el elemento sea visible y darle foco para accesibilidad
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
    }

    // Navegar al siguiente/previo
    function nextMatch() {
        if (!searchState.matches.length) return;
        scrollToMatch((searchState.index + 1) % searchState.matches.length);
    }
    function prevMatch() {
        if (!searchState.matches.length) return;
        scrollToMatch((searchState.index - 1 + searchState.matches.length) % searchState.matches.length);
    }

    // Conectar UI: entrada y click en lupa
    if (searchInput) {
        // buscar al presionar Enter
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = searchInput.value.trim();
                findAndHighlight(term);
                updateControls();
            } else if (e.key === 'Escape') {
                removeHighlights();
                searchInput.value = '';
                updateControls();
            } else if (e.key === 'F3') {
                // F3: siguiente resultado
                e.preventDefault(); nextMatch();
            }
        });

        // si el usuario escribe y queremos búsqueda en vivo, se puede activar aquí
        // pero preferimos ejecutar la búsqueda con Enter o con el icono para evitar repintes continuos
    }

    // Si el contenedor .lupa tiene el icono, usar clic en icono para disparar búsqueda
    if (searchForm) {
    // Crear un botón para limpiar la búsqueda dentro del widget .lupa
        let clearBtn = searchForm.querySelector('.lupa-clear');
        if (!clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'lupa-clear';
            clearBtn.setAttribute('aria-label', 'Limpiar búsqueda');
            clearBtn.innerHTML = '&times;';
            searchForm.appendChild(clearBtn);
        }

        // Mostrar/ocultar según contenido
        const updateClearVisibility = () => {
            if (searchInput && searchInput.value.trim()) clearBtn.style.display = 'inline-flex';
            else clearBtn.style.display = 'none';
        };
        updateClearVisibility();

        if (searchInput) {
            searchInput.addEventListener('input', updateClearVisibility);
        }

        // Acción del botón: limpiar input y highlights
        clearBtn.addEventListener('click', function (ev) {
            ev && ev.preventDefault && ev.preventDefault();
            if (searchInput) { searchInput.value = ''; searchInput.focus(); }
            removeHighlights();
            updateClearVisibility();
            updateControls();
        });

        // Crear controles Prev / Counter / Next
        let prevBtn = searchForm.querySelector('.lupa-prev');
        let nextBtn = searchForm.querySelector('.lupa-next');
        let counter = searchForm.querySelector('.lupa-counter');
        if (!prevBtn) {
            prevBtn = document.createElement('button'); prevBtn.type = 'button'; prevBtn.className = 'lupa-prev'; prevBtn.setAttribute('aria-label','Anterior'); prevBtn.textContent = '◀'; searchForm.appendChild(prevBtn);
        }
        if (!counter) {
            counter = document.createElement('div'); counter.className = 'lupa-counter'; counter.setAttribute('aria-live','polite'); counter.textContent = '' ; searchForm.appendChild(counter);
        }
        if (!nextBtn) {
            nextBtn = document.createElement('button'); nextBtn.type = 'button'; nextBtn.className = 'lupa-next'; nextBtn.setAttribute('aria-label','Siguiente'); nextBtn.textContent = '▶'; searchForm.appendChild(nextBtn);
        }

        // Wiring
        prevBtn.addEventListener('click', function(e){ e && e.preventDefault && e.preventDefault(); prevMatch(); updateControls(); });
        nextBtn.addEventListener('click', function(e){ e && e.preventDefault && e.preventDefault(); nextMatch(); updateControls(); });

        function updateControls(){
            const total = searchState.matches.length;
            if (total === 0) {
                counter.textContent = '';
                prevBtn.style.display = 'none'; nextBtn.style.display = 'none';
            } else {
                prevBtn.style.display = 'inline-flex'; nextBtn.style.display = 'inline-flex';
                counter.textContent = (searchState.index + 1) + ' / ' + total;
            }
        }

        searchForm.addEventListener('click', function (e) {
            // si clic dentro del input, dejar que el input gestione el foco
            const target = e.target;
            // si el clic fue en el ícono (o fuera del input), ejecutar la búsqueda
            if (target && (target.classList && target.classList.contains('fa-magnifying-glass') || target.tagName === 'I' || target === searchForm)) {
                const term = searchInput ? searchInput.value.trim() : '';
                findAndHighlight(term);
            }
        });

        // evitar submit del contenedor si alguien presiona Enter
        searchForm.addEventListener('submit', e => e.preventDefault());
    }

    // Teclas globales: Esc limpia, Ctrl+G / Shift+F3 para siguiente/anterior
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            removeHighlights();
        }
        // Ctrl+G -> siguiente (común en editores)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
            e.preventDefault(); nextMatch();
        }
        // Shift+F3 -> anterior
        if (e.key === 'F3' && e.shiftKey) {
            e.preventDefault(); prevMatch();
        }
    });

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
                        // More robust CTA handling: look for explicit id, otherwise fall back to common heroes/buttons
                        var ctaBtn = document.getElementById('cta-view-apartments') || document.querySelector('.hero .cta-btn') || document.querySelector('.cta-btn');
                        var tulipanes = document.getElementById('tulipanes');
                        var welcomeSection = document.querySelector('.welcome-hero');
                        var heroSection = document.querySelector('.hero');
                        if (ctaBtn) {
                            ctaBtn.addEventListener('click', function (ev) {
                                ev && ev.preventDefault && ev.preventDefault();
                                // Preferred target order: #tulipanes -> .welcome-hero -> .hero -> first <main> child
                                if (tulipanes) {
                                    tulipanes.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else if (welcomeSection) {
                                    welcomeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else if (heroSection) {
                                    // If we're on a landing page with a.hero, scroll to the next section after hero
                                    // Try to find the next sibling section to hero in the DOM
                                    var next = heroSection.nextElementSibling;
                                    if (next) {
                                        next.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    } else {
                                        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                } else {
                                    // fallback: scroll to top of main
                                    var main = document.querySelector('main');
                                    if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            });
                        }
                } catch (e) {
                    console.error('CTA scroll error:', e);
                }

                    // Sticky navbar: show fixed navbar after scrolling past hero
                    try {
                        const navbar = document.querySelector('.navbar');
                        const hero = document.querySelector('.project-hero');
                        if (navbar && hero) {
                            const heroBottom = () => hero.getBoundingClientRect().bottom + window.scrollY;
                            let pinned = false;
                            let hideTimeout = null;
                            // how long to wait before forcing the removal if transitionend doesn't fire
                            const TRANSITION_FALLBACK = 620; // ms — should match CSS transition duration + small buffer

                            const finishHide = () => {
                                // fully remove sticky and the hide class
                                navbar.classList.remove('sticky', 'sticky--hide');
                                document.body.style.paddingTop = '';
                                pinned = false;
                                if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
                            };

                            const checkSticky = () => {
                                if (window.scrollY > (heroBottom() - 80)) {
                                    // user scrolled past hero -> ensure navbar is pinned
                                    if (hideTimeout) {
                                        // cancel any pending hide
                                        clearTimeout(hideTimeout);
                                        hideTimeout = null;
                                    }
                                    // if we were in hide animation, remove hide modifier
                                    if (navbar.classList.contains('sticky--hide')) {
                                        navbar.classList.remove('sticky--hide');
                                    }
                                    if (!pinned) {
                                        navbar.classList.add('sticky');
                                        // avoid layout jump
                                        document.body.style.paddingTop = navbar.offsetHeight + 'px';
                                        pinned = true;
                                    }
                                } else {
                                    // user scrolled above hero -> start hide animation (if pinned)
                                    if (pinned && !navbar.classList.contains('sticky--hide')) {
                                        // add hide modifier so CSS can animate out
                                        navbar.classList.add('sticky--hide');

                                        // listen once for transitionend to clean up
                                        const onTransitionEnd = function (ev) {
                                            // only respond to transitions on the navbar element
                                            if (ev && ev.target === navbar) {
                                                navbar.removeEventListener('transitionend', onTransitionEnd);
                                                finishHide();
                                            }
                                        };
                                        navbar.addEventListener('transitionend', onTransitionEnd);

                                        // fallback: ensure we remove sticky even if transitionend doesn't fire
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

// Tabs logic + animate construction progress when visible
(function () {
    try {
        var tabs = document.querySelectorAll('.project-details .tab');
        var panels = document.querySelectorAll('.project-details .tab-panel');
        if (tabs.length) {
                    tabs.forEach(function (btn) {
                        btn.addEventListener('click', function (ev) {
                            if (ev && ev.preventDefault) ev.preventDefault();
                    var target = btn.getAttribute('data-tab');
                    // deactivate
                    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
                    panels.forEach(p => { p.hidden = true; });
                    // activate
                    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
                    var panel = document.getElementById(target);
                    if (panel) { panel.hidden = false; panel.classList.add('in-view'); }
                });
            });
        }

        // Animate construction progress when its parent panel enters view
        var progEls = document.querySelectorAll('.construction-progress');
        if (progEls.length && 'IntersectionObserver' in window) {
            var progObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var fill = entry.target.querySelector('.construction-progress-fill');
                        var pct = entry.target.getAttribute('data-progress') || (fill && parseInt(fill.style.width,10)) || 0;
                        if (fill) {
                            fill.style.width = (pct ? pct + '%' : '0%');
                        }
                        progObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            progEls.forEach(function (el) { progObs.observe(el); });
        } else {
            // fallback set widths
            progEls.forEach(function (el) { var fill = el.querySelector('.construction-progress-fill'); if (fill) { fill.style.width = fill.style.width || '65%'; } });
        }
    } catch (e) { console.error('tabs/progress error', e); }
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
                    // find the contact panel and show it via the same tab mechanism
                    var contactPanel = document.getElementById('contact');
                    var tabs = document.querySelectorAll('.project-details .tab');
                    var panels = document.querySelectorAll('.project-details .tab-panel');

                    // deactivate current
                    tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
                    panels.forEach(function (p) { p.hidden = true; });

                    // show contact panel
                    if (contactPanel) {
                        contactPanel.hidden = false;
                        contactPanel.classList.add('in-view');
                        // add a visual active state on a synthetic tab (if exists)
                        var contactTab = document.querySelector('.project-details .tab[data-tab="contact"]');
                        if (contactTab) { contactTab.classList.add('active'); contactTab.setAttribute('aria-selected','true'); }
                        // scroll into view the tab-panels so user sees it
                        contactPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });
            });
        }

        // close behavior
        document.addEventListener('click', function (ev) {
            var close = ev.target.closest && ev.target.closest('.close-contact');
            if (close) {
                var contactPanel = document.getElementById('contact');
                if (contactPanel) { contactPanel.hidden = true; contactPanel.classList.remove('in-view'); }
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

// Tabs logic + animate construction progress when visible
(function () {
    try {
        var tabs = document.querySelectorAll('.project-details .tab');
        var panels = document.querySelectorAll('.project-details .tab-panel');
        if (tabs.length) {
                    tabs.forEach(function (btn) {
                        btn.addEventListener('click', function (ev) {
                            if (ev && ev.preventDefault) ev.preventDefault();
                    var target = btn.getAttribute('data-tab');
                    // deactivate
                    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
                    panels.forEach(p => { p.hidden = true; });
                    // activate
                    btn.classList.add('active'); btn.setAttribute('aria-selected','true');
                    var panel = document.getElementById(target);
                    if (panel) { panel.hidden = false; panel.classList.add('in-view'); }
                });
            });
        }

        // Animate construction progress when its parent panel enters view
        var progEls = document.querySelectorAll('.construction-progress');
        if (progEls.length && 'IntersectionObserver' in window) {
            var progObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        var fill = entry.target.querySelector('.construction-progress-fill');
                        var pct = entry.target.getAttribute('data-progress') || (fill && parseInt(fill.style.width,10)) || 0;
                        if (fill) {
                            fill.style.width = (pct ? pct + '%' : '0%');
                        }
                        progObs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.2 });
            progEls.forEach(function (el) { progObs.observe(el); });
        } else {
            // fallback set widths
            progEls.forEach(function (el) { var fill = el.querySelector('.construction-progress-fill'); if (fill) { fill.style.width = fill.style.width || '65%'; } });
        }
    } catch (e) { console.error('tabs/progress error', e); }
})();

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

// ===== MANEJO DEL FORMULARIO DE CONTACTO =====
(function() {
    try {
        const form = document.getElementById('formContacto');
        const mensajeDiv = document.getElementById('mensajeRespuesta');
        
        if (!form) return; // Si no existe el formulario, salir
        
        // Mostrar mensaje de �xito si viene de redirecci�n
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === '1') {
            mostrarMensaje(' Registro guardado correctamente. Nos pondremos en contacto pronto.', 'success');
            // Limpiar el par�metro de la URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Deshabilitar el bot�n de env�o
            const btnSubmit = form.querySelector('button[type=submit]');
            const btnTextOriginal = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class=spinner-border spinner-border-sm me-2></span>Enviando...';
            
            // Recoger los datos del formulario
            const formData = new FormData(form);
            
            // Enviar por AJAX
            fetch('guardar_contacto.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text || 'Error en el servidor');
                    });
                }
                return response.text();
            })
            .then(data => {
                // Mostrar mensaje de �xito
                mostrarMensaje(data, 'success');
                
                // Limpiar el formulario
                form.reset();
                
                // Scroll hacia el mensaje
                mensajeDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            })
            .catch(error => {
                // Mostrar mensaje de error
                mostrarMensaje(error.message || ' Error al enviar el formulario. Por favor, intenta de nuevo.', 'danger');
            })
            .finally(() => {
                // Rehabilitar el bot�n
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = btnTextOriginal;
            });
        });
        
        function mostrarMensaje(texto, tipo) {
            if (!mensajeDiv) return;
            
            mensajeDiv.className = 'alert alert-' + tipo;
            mensajeDiv.textContent = texto;
            mensajeDiv.classList.remove('d-none');
            
            // Ocultar el mensaje despu�s de 8 segundos
            setTimeout(() => {
                mensajeDiv.classList.add('d-none');
            }, 8000);
        }
        
    } catch (e) {
        console.error('Formulario de contacto error:', e);
    }
})();
