// ui.js — GitSort toolbar component matching GitHub's design system

// eslint-disable-next-line no-var
var GitSortUI = (function () {
	'use strict';

	let toolbar = null;
	let btnAlpha = null;
	let btnRecent = null;
	let btnAbsTime = null;

	let onSortChange = null;
	let onAbsoluteTimeChange = null;

	// Create and insert the toolbar before the table.
	function createToolbar(
		anchorEl,
		currentMode,
		currentAbsoluteTime,
		timestampsAvailable,
		sortCallback,
		absTimeCallback,
	) {
		removeToolbar();

		onSortChange = sortCallback;
		onAbsoluteTimeChange = absTimeCallback;

		toolbar = document.createElement('div');
		toolbar.id = 'gitsort-toolbar';
		toolbar.className = 'gitsort-toolbar';
		toolbar.setAttribute('role', 'toolbar');
		toolbar.setAttribute('aria-label', 'Directory sort options');

		const label = document.createElement('span');
		label.className = 'gitsort-label';
		label.textContent = 'Sort:';
		toolbar.appendChild(label);

		const btnGroup = document.createElement('div');
		btnGroup.className = 'gitsort-btn-group';
		btnGroup.setAttribute('role', 'group');
		btnGroup.setAttribute('aria-label', 'Sort order');

		btnAlpha = createButton(
			'Default',
			'alphabetical',
			currentMode === 'alphabetical',
		);
		btnAlpha.addEventListener('click', () =>
			handleSortClick('alphabetical'),
		);
		btnGroup.appendChild(btnAlpha);

		btnRecent = createButton('Recent', 'recent', currentMode === 'recent');
		if (!timestampsAvailable) {
			btnRecent.disabled = true;
			btnRecent.classList.add('gitsort-btn-disabled');
			btnRecent.title =
				"Commit timestamps haven't loaded yet — the button will enable once they appear.";
		}
		btnRecent.addEventListener('click', () => {
			if (!btnRecent.disabled) {
				handleSortClick('recent');
			}
		});
		btnGroup.appendChild(btnRecent);
		toolbar.appendChild(btnGroup);

		btnAbsTime = document.createElement('button');
		btnAbsTime.type = 'button';
		btnAbsTime.className = 'gitsort-btn gitsort-btn-abstime';
		btnAbsTime.setAttribute('aria-pressed', String(currentAbsoluteTime));
		btnAbsTime.title = currentAbsoluteTime
			? 'Showing exact dates. Click to show relative times.'
			: 'Showing relative times. Click to show exact dates.';
		updateAbsTimeButtonText(currentAbsoluteTime);
		btnAbsTime.addEventListener('click', () => {
			const newVal = btnAbsTime.getAttribute('aria-pressed') !== 'true';
			btnAbsTime.setAttribute('aria-pressed', String(newVal));
			btnAbsTime.title = newVal
				? 'Showing exact dates. Click to show relative times.'
				: 'Showing relative times. Click to show exact dates.';
			updateAbsTimeButtonText(newVal);
			if (onAbsoluteTimeChange) onAbsoluteTimeChange(newVal);
		});
		toolbar.appendChild(btnAbsTime);

		anchorEl.parentNode.insertBefore(toolbar, anchorEl);
	}

	function createButton(text, mode, active) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'gitsort-btn';
		btn.dataset.gitsortMode = mode;

		if (active) {
			btn.classList.add('gitsort-btn-active');
			btn.setAttribute('aria-pressed', 'true');
		} else {
			btn.setAttribute('aria-pressed', 'false');
		}

		btn.textContent = text;
		return btn;
	}

	function handleSortClick(mode) {
		if (onSortChange) onSortChange(mode);
	}

	function setActiveMode(mode) {
		if (btnAlpha) {
			const isAlpha = mode === 'alphabetical';
			btnAlpha.classList.toggle('gitsort-btn-active', isAlpha);
			btnAlpha.setAttribute('aria-pressed', String(isAlpha));
		}
		if (btnRecent) {
			const isRecent = mode === 'recent';
			btnRecent.classList.toggle('gitsort-btn-active', isRecent);
			btnRecent.setAttribute('aria-pressed', String(isRecent));
		}
	}

	function enableRecentButton() {
		if (btnRecent && btnRecent.disabled) {
			btnRecent.disabled = false;
			btnRecent.classList.remove('gitsort-btn-disabled');
			btnRecent.title = '';
		}
	}

	function disableRecentButton(message) {
		if (btnRecent) {
			btnRecent.disabled = true;
			btnRecent.classList.add('gitsort-btn-disabled');
			btnRecent.title =
				message ||
				"GitHub doesn't expose commit timestamps on this page.";
		}
	}

	function updateAbsTimeButtonText(showAbsolute) {
		if (btnAbsTime) {
			const clockSvg =
				'<svg class="gitsort-icon" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7-3.25v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5a.75.75 0 0 1 1.5 0Z"></path></svg>';
			btnAbsTime.innerHTML = showAbsolute
				? clockSvg + ' Timestamp'
				: clockSvg + ' Relative';
		}
	}

	function removeToolbar() {
		if (toolbar && toolbar.parentNode) {
			toolbar.parentNode.removeChild(toolbar);
		}
		toolbar = null;
		btnAlpha = null;
		btnRecent = null;
		btnAbsTime = null;
	}

	function isToolbarPresent() {
		return !!document.getElementById('gitsort-toolbar');
	}

	return {
		createToolbar,
		removeToolbar,
		isToolbarPresent,
		setActiveMode,
		enableRecentButton,
		disableRecentButton,
	};
})();
