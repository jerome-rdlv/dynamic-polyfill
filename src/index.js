function polyfill(
    {
        polyfills,
        url,
        options = '',
        minify = true,
        rum = true,
        agent,
        agentFallback,
        resolve,
    }
) {
    return new Promise(function (resolve, reject) {
        polyfills = polyfills || [];

        if (polyfills.length === 0) {
            console.warn('Polyfills list is empty; forgot polyfills configuration file?');
        }

        polyfills = localPolyfills(polyfills);

        const fillAnyway = options.indexOf('always') >= 0 || agent; // check if 'always' flag or agent is set
        const neededPolyfills = fillAnyway ? polyfills : checkSupport(polyfills);

        if (neededPolyfills.length === 0) {
            resolve();
            return;
        }

        // load script
        agent = agent ? `\&ua=${agent}` : '';
        url = url ? url : 'https://cdnjs.cloudflare.com/polyfill/v3';

        const min = minify ? '.min' : '';
        const features = polyfills ? `features=${neededPolyfills.join(',')}` : '';
        const flags = options ? `\&flags=${options.join(',')}` : '';
        const monitor = rum ? '\&rum=1' : ''; // not set to rum=0 since it loads RUM scripts anyway
        const fallback = agentFallback ? `\&unknown=${agentFallback}` : '';

        const js = document.createElement('script');

        js.src = `${url}/polyfill${min}.js?${features + flags + monitor + agent + fallback}`;
        js.async = true;

        js.onload = resolve;
        js.onerror = () => {
            reject('Error loading polyfills. Open a ticket: https://github.com/PascalAOMS/dynamic-polyfill/issues');
        };

        document.body.appendChild(js);
    });

}

function localPolyfills(polyfills) {

    // local fixes
    if (polyfills) {
        let index = polyfills.indexOf('requestIdleCallback');
        if (index !== -1) {
            // Local polyfill to prevent polyfill request for Safari, for which no version has support
            if (window.requestIdleCallback === undefined) {
                // noinspection JSValidateTypes
                window.requestIdleCallback = window.requestAnimationFrame;
            }
            // drop requestIdleCallback from needed fills
            polyfills.splice(index, 1);
        }
    }

    // :scope polyfill
    (function (doc, proto) {
        try { // check if browser supports :scope natively
            doc.querySelector(':scope body');
        } catch (err) { // polyfill native methods if it doesn't
            ['querySelector', 'querySelectorAll'].forEach(function (method) {
                var nativ = proto[method];
                proto[method] = function (selectors) {
                    if (/(^|,)\s*:scope/.test(selectors)) { // only if selectors contains :scope
                        var hasId = !!this.id;
                        if (!hasId) {
                            this.id = 'ID_' + Date.now(); // assign new unique id
                        }
                        selectors = selectors.replace(/((^|,)\s*):scope/g, '$1#' + this.id); // replace :scope with #ID
                        var result = doc[method](selectors);
                        if (!hasId) {
                            this.removeAttribute('id');
                        }
                        return result;
                    } else {
                        return nativ.call(this, selectors); // use native code for other selectors
                    }
                };
            });
        }
    })(window.document, Element.prototype);

    return polyfills;
}

function checkSupport(polyfills) {
    return polyfills.filter(polyfill => {
        const parts = polyfill.split('.'); // i.e. ['Array', 'prototype', 'includes']
        let obj = window;
        for (const index in parts) {
            if (!(parts[index] in obj)) {
                return true;
            }
            if (index < parts.length - 1) {
                obj = obj[parts[index]];
            }
        }
        return false;
    });
}

module.exports = polyfill;

