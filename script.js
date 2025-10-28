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
        const clearBtn = searchForm.querySelector('.lupa-clear');
        const prevBtn = searchForm.querySelector('.lupa-prev');
        const nextBtn = searchForm.querySelector('.lupa-next');
        const counter = searchForm.querySelector('.lupa-counter');

        // Mostrar/ocultar según contenido
        const updateClearVisibility = () => {
            if (searchInput && clearBtn) {
                clearBtn.classList.toggle('visible', searchInput.value.trim() !== '');
            }
        };
        updateClearVisibility();

        if (searchInput) {
            searchInput.addEventListener('input', updateClearVisibility);
        }
        
        if (clearBtn) {
            // Acción del botón: limpiar input y highlights
            clearBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                if (searchInput) { searchInput.value = ''; searchInput.focus(); }
                removeHighlights();
                updateClearVisibility();
                updateControls();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function(e){ e.preventDefault(); prevMatch(); updateControls(); });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function(e){ e.preventDefault(); nextMatch(); updateControls(); });
        }

        function updateControls(){
            const total = searchState.matches.length;
            if (total === 0) {
                if(counter) counter.textContent = '';
                if(prevBtn) prevBtn.classList.remove('visible');
                if(nextBtn) nextBtn.classList.remove('visible');
                if(counter) counter.style.display = 'none';
            } else {
                if(prevBtn) prevBtn.classList.add('visible');
                if(nextBtn) nextBtn.classList.add('visible');
                if(counter) {
                    counter.textContent = (searchState.index + 1) + ' / ' + total;
                    counter.style.display = 'inline-block';
                }
            }
        }

        searchForm.addEventListener('click', function (e) {
            // si clic dentro del input, dejar que el input gestione el foco
            const target = e.target;
            // si el clic fue en el ícono (o fuera del input), ejecutar la búsqueda
            if (target && (target.classList && target.classList.contains('fa-magnifying-glass') || target.tagName === 'I' || target === searchForm)) {
                const term = searchInput ? searchInput.value.trim() : '';
                findAndHighlight(term);
                updateControls();
            }
        });

        // evitar submit del contenedor si alguien presiona Enter
        searchForm.addEventListener('submit', e => e.preventDefault());
    }

    // Teclas globales: Esc limpia, Ctrl+G / Shift+F3 para siguiente/anterior
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            removeHighlights();
            if (searchInput) searchInput.value = '';
            updateControls();
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
                        const ctaBtn = document.getElementById('cta-view-apartments');
                        const heroSection = document.querySelector('.hero, .project-hero');

                        if (ctaBtn) {
                            ctaBtn.addEventListener('click', function (ev) {
                                ev.preventDefault();
                                // Find the next section after the hero
                                let targetSection = heroSection ? heroSection.nextElementSibling : null;

                                // If the next sibling is not a section, try to find the first section in main
                                if (!targetSection || targetSection.tagName !== 'SECTION') {
                                    targetSection = document.querySelector('main > section');
                                }

                                // If a target is found, scroll to it. Otherwise, do nothing.
                                if (targetSection) {
                                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    // Fallback for pages without a clear next section, like index.html
                                    const apartmentsSection = document.querySelector('.apartments');
                                    if (apartmentsSection) {
                                        apartmentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
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
                    // capture apartment data (if provided) and find the contact panel
                    var aptName = btn.getAttribute('data-apt-name') || '';
                    var aptArea = btn.getAttribute('data-apt-area') || '';
                    var aptPrice = btn.getAttribute('data-apt-price') || '';
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
                        // populate selected apartment summary inside the contact panel
                        try {
                            var contactTitle = contactPanel.querySelector('.contact-title');
                            var summary = document.getElementById('selectedAptSummary');
                            if (contactTitle && aptName) contactTitle.textContent = 'Solicitar información — ' + aptName;
                            if (summary) {
                                var html = '';
                                if (aptName) html += '<div><strong>' + aptName + '</strong></div>';
                                if (aptArea) html += '<div>Área: ' + aptArea + '</div>';
                                if (aptPrice) html += '<div>Valor: <strong>' + aptPrice + '</strong></div>';
                                summary.innerHTML = html;
                            }
                        } catch (e) { /* ignore if elements not present */ }
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
