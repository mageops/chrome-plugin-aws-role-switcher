import { SimpleRpc } from './rpc.js';

class Api {
	#rpc;
	constructor() {
		this.#rpc = new SimpleRpc({});
	}

	getRoles() {
		return this.#rpc.call('cs:awsrs:get-roles');
	}

	getFilterType() {
		return this.#rpc.call('cs:awsrs:get-filter-type');
	}

	setFilterType(type) {
		return this.#rpc.call('cs:awsrs:set-filter-type', {
			type
		});
	}

	fetchIcons(roleIds) {
		return this.#rpc.call('cs:awsrs:fetch-icons', {
			roleIds
		});
	}
}

(async () => {
	const api = new Api();

	let containerEl = null;
	function $(what, data) {
		let match = null;

		if (match = what.match(/<([a-z]+)\/>/)) {
			const el = document.createElement(match[1]);

			if (typeof data !== 'undefined') {
				if (typeof data.classNames !== 'undefined') {
					el.classNames = data.classNames;
				}

				if (typeof data.attrs !== 'undefined') {
					Object.keys(data.attrs).forEach(function (key) {
						el.setAttribute(key, data.attrs[key]);
					});
				}
			}

			return el;
		}

		const els = document.querySelectorAll(what);

		if (els.length === 0) {
			return null;
		}

		if (els.length === 1) {
			return els[0];
		}

		return els;
	}

	$.remove = (element) => {
		element.parentNode.removeChild(element);
	};

	function getTypes(roles) {
		let types = roles
			.map(role => role.type)
			.filter((value, index, self) => self.indexOf(value) === index);

		types.unshift('All');

		return types;
	}

	function getCsrfToken() {
		return AWSC.Auth.getMbtc();
	}

	function getHomeUri() {
		return AWSC.NavUrl.getRegionLinkHref();
	}

	function renderRole(index, label, accountId, roleName, color, icon) {
		if (typeof color === 'undefined') {
			color = '3552CC';
		}

		let el = $('<div/>', {
			attrs: {
				id: `awsc-recent-role-${index}`,
				style: 'margin: 0.5rem 0;'
			}
		});

		el.innerHTML = `
			<form action="https://signin.aws.amazon.com/switchrole" method="POST" target="_top">
				<input type="hidden" name="action" value="switchFromBasis">
				<input type="hidden" name="src" value="nav">
				<input type="hidden" name="roleName" value="${roleName}">
				<input type="hidden" name="account" value="${accountId}">
				<input type="hidden" name="mfaNeeded" value="0">
				<input type="hidden" name="color" value="${color}">
				<input type="hidden" name="csrf" value="${getCsrfToken()}">
				<input type="hidden" name="redirect_uri" value="${getHomeUri()}">
				<label for="awsc-recent-role-switch-${index}" class="awsc-role-color" style="width:16px;height:16px;border:none;">
					<img src="${icon}" style="width:16px;height:16px;">
				</label>
				<input type="submit" class="awsc-role-submit awsc-role-display-name" id="awsc-recent-role-switch-${index}"
					name="displayName" value="${label}" style="color: #efefef; background-color: #232f3e; border: 0;">
			</form>
		`;

		return el;
	}

	function renderRoles(roles, type, icons) {

		const roleContainer = $('<div/>');

		roleContainer.style = 'overflow-y: scroll; max-height: 25vh; margin-bottom: 1rem; width: 20rem; overflow-x: hidden;';

		if (type !== 'undefined' && type !== 'All') {
			roles = roles.filter(function (r) { return r.type === type; });
		}

		roles = roles.sort(function (a, b) { return a.label < b.label ? -1 : 1; });

		roles.forEach(function (r) {
			roleContainer.appendChild(renderRole(r.id, r.label, r.accountId, r.roleName, r.color, icons[r.id]));
		});

		return roleContainer;
	}

	function renderTypeSwitch(currentType, types) {
		if (types.length < 2) {
			return;
		}

		const typeContainer = $('<div/>');

		typeContainer.style = 'padding-bottom: 1rem; border-bottom: solid 1px #ccc; text-align: center;';

		types.forEach((t, i) => {
			var button = document.createElement('span');

			var style = 'color: #8f9fa1; display: inline-block; margin-right: 0.2rem; cursor: pointer; border-radius: 0.3rem;  padding: 0.2rem 0.4rem;';

			if (t === currentType) {
				style += 'background: #232E3E; color: #FFF;'
			}

			button.style = style;

			button.addEventListener('click', async () => {
				await api.setFilterType(t);
				render(t);
			});

			button.appendChild(document.createTextNode(t));
			typeContainer.appendChild(button);
		});

		return typeContainer;
	}

	async function render() {
		const type = await api.getFilterType();
		const roles = await api.getRoles();
		const icons = await api.fetchIcons(roles.map(a => a.id));

		let roleSwitchLink = $('[data-testid=awsc-switch-roles]');
		let recentRolesContainer = $('#awsc-username-menu-recent-roles');
		let recentRolesLabel = $('#awsc-recent-roles-label');

		if (recentRolesContainer) {
			$.remove(recentRolesContainer);
		}

		if (recentRolesLabel) {
			$.remove(recentRolesLabel);
		}

		if (null === containerEl) {
			containerEl = $('<div/>');
			roleSwitchLink.parentNode.insertBefore(containerEl, roleSwitchLink);
		}

		const types = getTypes(roles);

		containerEl.innerHTML = '';

		const typesEl = renderTypeSwitch(type, types);
		const rolesEl = renderRoles(roles, type, icons);

		containerEl.appendChild(typesEl);
		containerEl.appendChild(rolesEl);
	}

	async function sleep(time) {
	        return new Promise((resolve) => setTimeout(resolve, time * 1000))
        }

	async function init() {
	        let time = 2;
                while($('[data-testid=awsc-switch-roles]') == null) {
                        console.log('AWS Role Switcher is waiting for AWS console load');
                        await sleep(time);
                        time = Math.min(time * 2, 10);
                }
		await render();

		console.log('AWS Role Switcher is initiaized!');
	}

	document.addEventListener("DOMContentLoaded", init);

	if (document.readyState == "complete" || document.readyState == "loaded" || document.readyState == "interactive") { init(); }
})();
