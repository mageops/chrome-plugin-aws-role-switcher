(() => {
	let rolesUrl = null;

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

  			render(getTypeFilter());

  			console.log('Roles URL has been updated, rerendering...');
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
		
		return `<li id="awsc-recent-role-${index}">
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
		</li>`;		
	}
	
	function renderRoles(roles, type) {
		var switcherContainer = document.getElementById('awsc-username-menu-recent-roles');
		
		switcherContainer.style = 'overflow-y: scroll; max-height: 25vh; border-bottom: solid 1px #ccc; margin-bottom: 1rem; width: 17rem; overflow-x: hidden;';
		switcherContainer.innerHTML = '';
		
		if (type !== 'undefined' && type !== 'All') {
			roles = roles.filter(function(r) { return r.type === type; });
		}
		
		roles = roles.sort(function(a, b) { return a.label < b.label ? -1 : 1; });
		
		roles.forEach(function(r, i) {
			switcherContainer.innerHTML += renderRole(i, r.label, r.accountId, r.roleName, r.color, r.icon);
		});
	}
	
	function renderTypeSwitch(container, currentType, types) {
		if (types.length === 1) {
			return;
		}
		
		container.style = 'padding-bottom: 1rem; border-bottom: solid 1px #ccc; text-align: center;';
		container.innerHTML = '';
		
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
			container.appendChild(button);
		});
	}
	
	function render(type) {
		let roleSwitchLink = document.getElementById('awsc-switch-role');
		let recentRolesContainer = document.getElementById('awsc-username-menu-recent-roles');
		let recentRolesLabel = document.getElementById('awsc-recent-roles-label');
		
		let container = document.createElement('div');

		document.body.insertBefore(container, switchLink);

		getRoles(function(roles, types) {
			renderTypeSwitch(container, type, types);
			renderRoles(container, roles, type);
		});
	}

	function hasRecentRole() {
		return null !== document.getElementById('awsc-username-menu-recent-roles');
	}

	function init() {
		registerEventListeners();
		render(getTypeFilter());

		console.log('AWS Role Switcher is initiaized!');
	}

	document.addEventListener("DOMContentLoaded", init);

	if (document.readyState == "complete" || document.readyState == "loaded" || document.readyState == "interactive") { init(); }
})();