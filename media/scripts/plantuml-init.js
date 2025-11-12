// PlantUML diagrams - Client-side rendering initialization
(function initializePlantUML() {
    const pendingDiagrams = document.querySelectorAll('.plantuml-pending[data-plantuml-render="post"]');
    if (!pendingDiagrams.length) {
        return;
    }

    const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

    function decodeBase64(base64) {
        try {
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
            if (textDecoder) {
                return textDecoder.decode(bytes);
            }
            // Fallback for environments without TextDecoder
            let result = '';
            for (let i = 0; i < bytes.length; i += 1) {
                result += String.fromCharCode(bytes[i]);
            }
            return decodeURIComponent(escape(result));
        } catch (error) {
            console.error('[PlantUML] Failed to decode base64 source', error);
            return null;
        }
    }

    function createSvgElement(svgText) {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = parsed.documentElement;
        if (!svg || svg.nodeName.toLowerCase() !== 'svg') {
            throw new Error('Invalid SVG response from PlantUML server');
        }
        return document.importNode(svg, true);
    }

    pendingDiagrams.forEach((diagram) => {
        const dataset = diagram.dataset;
        const server = dataset.plantumlServer;
        const encodedSource = dataset.plantumlSource;
        const diagramId = dataset.diagramId;
        const loading = diagram.querySelector('.plantuml-loading');
        const fallback = diagram.querySelector('.plantuml-error-fallback');

        if (!server || !encodedSource) {
            console.warn('[PlantUML] Missing server or source for POST rendering');
            if (loading) {
                loading.style.display = 'none';
            }
            if (fallback) {
                fallback.style.display = 'block';
            }
            return;
        }

        const source = decodeBase64(encodedSource);
        if (source === null) {
            if (loading) {
                loading.style.display = 'none';
            }
            if (fallback) {
                fallback.style.display = 'block';
            }
            return;
        }

        fetch(server, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                Accept: 'image/svg+xml,text/plain,*/*'
            },
            body: source
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const svgText = await response.text();
                const svgElement = createSvgElement(svgText);
                if (diagramId) {
                    svgElement.setAttribute('id', diagramId);
                }
                svgElement.setAttribute('style', 'max-width: 100%; height: auto;');

                diagram.innerHTML = '';
                diagram.appendChild(svgElement);
                diagram.classList.remove('plantuml-pending');
            })
            .catch((error) => {
                console.error('[PlantUML] Failed to render diagram via POST', error);
                if (loading) {
                    loading.style.display = 'none';
                }
                if (fallback) {
                    fallback.style.display = 'block';
                }
            });
    });
})();
