import { SimpleRpc } from './rpc.js';

const ROLES_CACHE_TIME_MS = 2 * 60 * 60 * 1000; // 2h
const DEFAULT_ICON_SRC = 'https://s3.eu-central-1.amazonaws.com/cs-creativeshop-rpms/favicons/creativeshop.png';

function injectScript(scriptName, onScriptLoad) {
	var s = document.createElement('script');

	s.type = "module";
	s.src = chrome.extension.getURL(scriptName);
	s.onload = function () {
		onScriptLoad;
		this.remove;
	};

	(document.head || document.documentElement).appendChild(s);
}

async function getRoles() {
	const rolesUrl = (await browser.storage.sync.get('configJsonUrl'))
		.configJsonUrl;
	if (!rolesUrl) {
		throw Error('Config url is not configured!');
	}

	let cachedRoles = (await browser.storage.local.get('rolesCache'))
		.rolesCache;
	let cacheExpired = false;

	if (!!cachedRoles) {
		const ttl = cachedRoles.ttl ?? 0;
		// invalidate if roles url changed
		if (cachedRoles.url !== rolesUrl) {
			cachedRoles = undefined;
		}
		// Cache expired
		if (ttl < Date.now()) {
			cacheExpired = true;
			// Was cached in the future, something in time messed up
		} else if (ttl > Date.now() + ROLES_CACHE_TIME_MS) {
			cacheExpired = true;
		}
	}

	if (!cachedRoles || cacheExpired) {
		// Try to refresh cache
		try {
			const response = await fetch(rolesUrl);
			let nextId = 0;
			const roles = (await response.json()).map(r => {
				r.id = nextId++;
				return r;
			});
			console.log(roles);
			await browser.storage.local.set({
				rolesCache: {
					roles,
					url: rolesUrl,
					ttl: Date.now() + ROLES_CACHE_TIME_MS,
				},
			});
			return roles;
		} catch (e) {
			// Refresh failed, try to use expired version
			console.error('Unable to refresh roles configuration', e);
			if (!!cachedRoles) {
				console.warn("Using expired roles configuration");
				return cachedRoles.roles;
			}
		}
	}

	return cachedRoles.roles;
}

async function fetchIcon(id, url) {
	const resp = await browser.runtime.sendMessage({
		name: 'fetch-request',
		data: {
			url
		}
	});

	return {
		id, blob: resp.blob
	}
}

async function handleFetchIcons({ roleIds }) {
	const roles = (await getRoles()).reduce((acc, item) => {
		acc[item.id] = item;
		return acc;
	}, {});
	// fetch all icons in parallel
	let icons = await Promise.all(roleIds.map(async (id) => {
		const iconSrc = (() => {
			if (roles.hasOwnProperty(id)) {
				const roleInfo = roles[id];
				const iconSrc = roleInfo.icon;
				if (!!iconSrc) {
					return iconSrc;
				}
			}
			return DEFAULT_ICON_SRC;
		})();
		try {
			return await fetchIcon(id, iconSrc);
		} catch (e) {
			console.error('Failed to fetch icon for role:', id, e);
			return await fetchIcon(id, DEFAULT_ICON_SRC);
		}
	}));

	// convert array to object
	return icons.filter(x => !!x).reduce((acc, item) => {
		acc[item.id] = item.blob;
		return acc;
	}, {});
}

async function handleGetRoles() {
	return await getRoles();
}

async function handleGetFilterType() {
	return (await browser.storage.sync.get('filterType'))
		.filterType ?? 'All';
}

async function handleSetFilterType({ type }) {
	await browser.storage.sync.set({
		filterType: type,
	});
}


export function main() {
	new SimpleRpc({
		serve: {
			'cs:awsrs:get-roles': {
				handler: handleGetRoles,
			},
			'cs:awsrs:get-filter-type': {
				handler: handleGetFilterType,
			},
			'cs:awsrs:set-filter-type': {
				handler: handleSetFilterType,
			},
			'cs:awsrs:fetch-icons': {
				handler: handleFetchIcons,
			}
		},
	});

	injectScript("injected.js", () => { });
}
