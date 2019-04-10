(() => {
	let rolesUrl = null,
		containerEl = null;

	function $(what, data) {
		let match = null;

		if (match = what.match(/<([a-z]+)\/>/)) {
			const el = document.createElement(match[1]);

			if (typeof data !== 'undefined') {
				if (typeof data.classNames !== 'undefined') {
					el.classNames = data.classNames;
				}

				if (typeof data.attrs !== 'undefined') {
					Object.keys(data.attrs).forEach(function(key) {
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

	function getRolesUrl() {
		if (null === rolesUrl) {
			rolesUrl = localStorage.getItem('cs-aws-roles-url');
		}

		return rolesUrl;
	}
	
	function registerEventListeners() {
  		window.addEventListener('message', function(evt) {
			if (evt.source != window) {
    			return;
    		}

    		if (typeof evt.data.name === 'undefined') {
    			return;
    		}

    		if (evt.data.name === 'cs:awsrs:set-json-url') {
    			onSetJsonUrl(evt.data.url);
    		}
		}, false);
  	}

  	function onSetJsonUrl(url) {
  		if (url !== rolesUrl) {
  			rolesUrl = url;
  			localStorage.setItem('cs-aws-roles-url', url);

  			console.log('Roles URL has been updated, rerendering...');	

  			render();
  		}
  	}

	function getTypes(roles) {
		var types = roles.map(role => role.type)
					.filter((value, index, self) => self.indexOf(value) === index);
					
		types.unshift('All');

		return types;
	}
	
	function getRoles(callback) {
		if (!rolesUrl) {
			console.log('Roles URL is absent, skipping');
			return;
		}

		roles = JSON.parse(sessionStorage.getItem('cs-aws-roles'));
		
		if (roles) {
			return callback(roles, getTypes(roles));
		}

		console.log('Fetching AWS roles...');
		
		fetch(rolesUrl).then((response) => {
			response.json().then((roles) => { 
				sessionStorage.setItem('cs-aws-roles', JSON.stringify(roles));
				
				callback(roles, getTypes(roles));
			})
		})
	}

	function getTypeFilter() {
		const filter = localStorage.getItem('cs-aws-filter-type');

		return filter ? filter : 'All';
	}

	function saveTypeFilter(type) {
		localStorage.setItem('cs-aws-filter-type', type);
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
		
		if (typeof icon === 'undefined') {
			icon = 'http://www.creativestyle.pl/wp-content/themes/creativestyle/cs/img/favicon.png';
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
				<input type="submit" class="awsc-role-submit awsc-role-display-name" id="awsc-recent-role-switch-${index}" name="displayName" value="${label}">
			</form>
		`;		

		return el;
	}
	
	function renderRoles(roles, type) {
		var roleContainer = $('<div/>');
		
		roleContainer.style = 'overflow-y: scroll; max-height: 25vh; border-bottom: solid 1px #ccc; margin-bottom: 1rem; width: 17rem; overflow-x: hidden;';

		if (type !== 'undefined' && type !== 'All') {
			roles = roles.filter(function(r) { return r.type === type; });
		}
		
		roles = roles.sort(function(a, b) { return a.label < b.label ? -1 : 1; });
		
		roles.forEach(function(r, i) {
			roleContainer.appendChild(renderRole(i, r.label, r.accountId, r.roleName, r.color, r.icon));
		});

		return roleContainer;
	}
	
	function renderTypeSwitch(currentType, types) {
		if (types.length < 2) {
			return;
		}

		var typeContainer = $('<div/>');
		
		typeContainer.style = 'padding-bottom: 1rem; border-bottom: solid 1px #ccc; text-align: center;';
		
		types.forEach((t, i) => {
			var button = document.createElement('span');
			
			var style = 'color: #232E3E; display: inline-block; margin-right: 0.2rem; cursor: pointer; border-radius: 0.3rem;  padding: 0.2rem 0.4rem;';
			
			if (t === currentType) {
				style += 'background: #232E3E; color: #FFF;'
			}
			
			button.style = style;
			
			button.addEventListener('click', () => {
				saveTypeFilter(t);
				render(t);
			});
			
			button.appendChild(document.createTextNode(t));
			typeContainer.appendChild(button);
		});

		return typeContainer;
	}
	
	function render() {
		const type = getTypeFilter();

		let roleSwitchLink = document.getElementById('awsc-switch-role');

		let recentRolesContainer = document.getElementById('awsc-username-menu-recent-roles');
		let recentRolesLabel = document.getElementById('awsc-recent-roles-label');

		if (recentRolesContainer) {
			recentRolesContainer.parentNode.removeChild(recentRolesContainer);
		}

		if (recentRolesLabel) {
			recentRolesLabel.parentNode.removeChild(recentRolesLabel);
		}

		if (null === containerEl) {
			containerEl = $('<div/>');
			roleSwitchLink.parentNode.insertBefore(containerEl, roleSwitchLink);		
		}

		getRoles(function(roles, types) {
			containerEl.innerHTML = '';

			const typesEl = renderTypeSwitch(type, types);
			const rolesEl = renderRoles(roles, type);

			containerEl.appendChild(typesEl);
			containerEl.appendChild(rolesEl);
		});
	}

	function init() {
		registerEventListeners();
		render();

		console.log('AWS Role Switcher is initiaized!');
	}

	document.addEventListener("DOMContentLoaded", init);

	if (document.readyState == "complete" || document.readyState == "loaded" || document.readyState == "interactive") { init(); }
})();