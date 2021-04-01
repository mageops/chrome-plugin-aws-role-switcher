
async function fetchUrl(url) {
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    const type = response.headers.get('Content-Type');
    const encoded = btoa(String.fromCharCode(...new Uint8Array(data)));
    return {
        blob: `data:${type};base64,${encoded}`
    }
}


export function main() {
    browser.runtime.onMessage.addListener((msg, sender) => {
        if (sender.id !== browser.runtime.id) {
            console.error('Invalid extension id: ', sender.id);
            return;
        }

        switch (msg.name) {
            case 'fetch-request':
                return fetchUrl(msg.data?.url ?? "");
        }
    });
}
