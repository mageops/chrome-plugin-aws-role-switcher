/**
 * Rpc message format:
 * {
 *   name: message name
 *   respondAs: name of event that should be called with response
 *   // only one of response or error is allowed
 *   data: message data
 *   error: error of handled data, only allowed in response
 * }
 *
 *
 * Configuration format:
 * {
 *   // Serve those requests
 *   serve: {
 *     "<messageName>": {
 *       handler: async() -> response, // async function that returns response
 *     }
 *   },
 * }
 */
export class SimpleRpc {
    #configuration;
    #responseHandlers = {};
    #nextId = 0;

    constructor(configuration) {
        this.#configuration = configuration;
        if (!configuration.serve) {
            configuration.serve = {};
        }
        window.addEventListener("message", event => this.#messageHandler(event));
    }

    async #messageHandler(event) {
        if (event.source != window) {
            return;
        }

        const messageName = event.data?.name;
        const data = event.data?.data;
        const error = event.data?.error;
        const respondAs = event.data?.respondAs;
        if (!messageName) {
            return;
        }

        // Handle rpc message
        if (this.#configuration.serve.hasOwnProperty(messageName)) {
            const rpcInfo = this.#configuration.serve[messageName];

            try {
                let result = await rpcInfo.handler(data);

                if (!!respondAs) {
                    window.postMessage({
                        name: respondAs,
                        data: result,
                    });
                }
            } catch (e) {
                window.postMessage({
                    name: respondAs,
                    error: e,
                });
            }
        }
        // Handle rpc response
        else if (this.#responseHandlers.hasOwnProperty(messageName)) {
            let responsePromise = this.#responseHandlers[messageName];

            if (error !== undefined) {
                responsePromise.reject(error);
            } else {
                responsePromise.resolve(data);
            }

            delete this.#responseHandlers[messageName];
        }
    }

    async call(name, data) {
        const responseName = `${name}:${this.#nextId++}.${Math.random()}`;
        let responseHandlers;
        const responsePromise = new Promise((resolve, reject) => {
            responseHandlers = {
                resolve, reject
            };
        });
        this.#responseHandlers[responseName] = responseHandlers;
        window.postMessage({
            name,
            respondAs: responseName,
            data,
        });

        return responsePromise;
    }
}
