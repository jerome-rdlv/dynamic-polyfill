function polyfill({
                      fills,
                      url,
                      options = '',
                      minify = true,
                      rum = true,
                      agent,
                      agentFallback,
                      onSuccess,
                      onError,
                  }) {
    if (!fills) {
        throw new Error('No fills specified.');
    }

    const fillAnyway = options.indexOf('always') >= 0 || agent; // check if 'always' flag or agent is set
    const neededPolyfills = fillAnyway ? fills : checkSupport(fills);


    if (neededPolyfills.length > 0) {
        return loadScript({
            neededPolyfills, minify, fills, options, rum, agent, agentFallback, onSuccess, onError, url
        });
    }

    return onSuccess();
}


function checkSupport(fills) {
    return fills.filter(fill => {
        const parts = fill.split('.'); // i.e. ['Array', 'prototype', 'includes']
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


function loadScript(args) {
    const min = args.minify ? '.min' : '';
    const features = args.fills ? `features=${args.neededPolyfills.join(',')}` : '';
    const flags = args.options ? `\&flags=${args.options.join(',')}` : '';
    const monitor = args.rum ? '\&rum=1' : ''; // not set to rum=0 since it loads RUM scripts anyway
    const agent = args.agent ? `\&ua=${args.agent}` : '';
    const fallback = args.agentFallback ? `\&unknown=${args.agentFallback}` : '';
    const url = args.url ? args.url : 'https://cdnjs.cloudflare.com/polyfill/v3';

    const js = document.createElement('script');

    js.src = `${url}/polyfill${min}.js?${features + flags + monitor + agent + fallback}`;
    js.async = true;

    document.body.appendChild(js);

    js.onload = () => args.onSuccess();
    js.onerror = () => {
        const error = 'Error loading polyfills. Open a ticket: https://github.com/PascalAOMS/dynamic-polyfill/issues';
        if (args.onError) {
            args.onError(error);
        } else {
            throw new Error(error);
        }
    };
}


module.exports = polyfill;

