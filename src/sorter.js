// sorter.js — Core sorting logic for GitSort rows

var GitSortSorter = (function () {
	'use strict';

	let originalOrder = [];
	let originalNameOrder = [];
	let currentSortMode = 'alphabetical';

	// Reconstruct default alphabetical folders-first directory order.
	function reconstructDefaultOrder(rows) {
		const list = rows.slice();
		list.sort((a, b) => {
			const aDir = GitSortUtils.isDirectoryRow(a);
			const bDir = GitSortUtils.isDirectoryRow(b);

			if (aDir && !bDir) return -1;
			if (!aDir && bDir) return 1;

			const nameA = GitSortUtils.getRowName(a).toLowerCase();
			const nameB = GitSortUtils.getRowName(b).toLowerCase();
			return nameA.localeCompare(nameB, undefined, {
				sensitivity: 'base',
				numeric: true,
			});
		});
		return list;
	}

	function captureOriginalOrder(rows) {
		const defaultSorted = reconstructDefaultOrder(rows);
		originalOrder = defaultSorted;
		originalNameOrder = defaultSorted.map((row) =>
			GitSortUtils.getRowName(row),
		);
	}

	function getOriginalOrder() {
		return originalOrder.slice();
	}

	function hasStaleReferences() {
		return (
			originalOrder.length > 0 &&
			originalOrder.some((row) => !row.isConnected)
		);
	}

	function hasTimestamps(rows) {
		return rows.some((row) => GitSortUtils.extractTimestamp(row) !== null);
	}

	// Sort rows array in-place based on the sorting mode.
	function sortRows(rows, mode) {
		currentSortMode = mode;

		if (mode === 'alphabetical') {
			const orderMap = new Map();
			originalOrder.forEach((row, i) => orderMap.set(row, i));

			const allFound = rows.every((row) => orderMap.has(row));
			if (allFound) {
				rows.sort((a, b) => orderMap.get(a) - orderMap.get(b));
			} else {
				const nameOrderMap = new Map();
				originalNameOrder.forEach((name, i) => {
					if (name) nameOrderMap.set(name, i);
				});

				rows.sort((a, b) => {
					const nameA = GitSortUtils.getRowName(a);
					const nameB = GitSortUtils.getRowName(b);
					const ia = nameOrderMap.get(nameA) ?? 9999;
					const ib = nameOrderMap.get(nameB) ?? 9999;
					return ia - ib;
				});

				captureOriginalOrder(rows);
			}
			return rows;
		}

		const tsMap = new Map();
		rows.forEach((row) => {
			const ts = GitSortUtils.extractTimestamp(row);
			tsMap.set(row, ts ? ts.getTime() : 0);
		});

		rows.sort((a, b) => {
			const ta = tsMap.get(a);
			const tb = tsMap.get(b);

			if (ta === 0 && tb === 0) return 0;
			if (ta === 0) return 1;
			if (tb === 0) return -1;

			return tb - ta;
		});

		return rows;
	}

	// Re-append sorted rows to the tbody element.
	function applyOrder(tbody, sortedRows) {
		if (!tbody || sortedRows.length === 0) return;

		const nonDataRows = [];
		for (const child of Array.from(tbody.children)) {
			if (
				child.tagName === 'TR' &&
				!child.classList.contains('react-directory-row')
			) {
				nonDataRows.push(child);
			}
		}

		const fragment = document.createDocumentFragment();
		nonDataRows.forEach((row) => fragment.appendChild(row));
		sortedRows.forEach((row) => fragment.appendChild(row));
		tbody.appendChild(fragment);
	}

	return {
		captureOriginalOrder,
		getOriginalOrder,
		hasStaleReferences,
		hasTimestamps,
		sortRows,
		applyOrder,
		getCurrentMode: () => currentSortMode,
	};
})();
