// Inventory Data
let groupData = [];
let filteredData = [];
let activeType = '';
let activeCategory = '';
let searchQuery = '';

// Separate catalogues by groups
const GROUP_CONFIG = {
  'ensemble': {
    name: 'Ensemble',
    url: 'https://script.google.com/macros/s/AKfycbwdRHLILnY9v7ZBY607JBrRhLxdhV6hFSOkCZQrhKQ42_vuHaDHiehrftk2Hrvn48m4fA/exec',
    types: ['Props', 'Equipment', 'Hats', 'Costumes', 'Accessories']
  },
  'musicalforum': {
    name: 'MF',
    url: 'https://script.google.com/macros/s/AKfycbws_PeLtRVyZZLePCGrzWMvztMiuY2SZbJFv_IBCB6rFdJzd5x7Ywx9-Hf11G3AKVO8nA/exec',
    types: ['Resources', 'Props', 'Costumes', 'Lights/Sound', 'Instruments/Music']
  },
  'btc': {
    name: 'BTC',
    url: '',
    types: ['Props', 'Costumes', 'Set Pieces']
  }
};

// Check groups by URL
const params = new URLSearchParams(window.location.search);
const slug = params.get('group');

if (slug && !GROUP_CONFIG[slug]) {
    document.body.innerHTML = '<p>Page not found.</p>';
    throw new Error('Unknown group');
}

const isAllGroups = !slug ||  !GROUP_CONFIG[slug];
const config = isAllGroups ? null : GROUP_CONFIG[slug];
const currentGroup = config?.name ?? 'All Groups';

const typeSelect = document.getElementById('type-filter');
const categorySelect = document.getElementById('category-filter');
const searchInput = document.getElementById('search');

// Filter type
if (typeSelect) {
    typeSelect.addEventListener('change', () => {
        activeType = typeSelect.value;
        buildCategoryDropDown();
        applyUserFilters();
    });
}

// Filter search
if (searchInput) {
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        applyUserFilters();
    });
}

async function loadInventory() {
    try {
        if (isAllGroups) {
            const results = await Promise.all(
                Object.values(GROUP_CONFIG).filter(g => g.url).map(g => fetch(g.url).then(r => r.json()))
            );
            groupData = results.flatMap(sheetData =>
                Object.values(sheetData).flat()
            );
        } else {
            const res = await fetch(config.url);
            const sheetData = await res.json();
            groupData = Object.values(sheetData).flat()
        }

        groupData = groupData.filter(item => {
            const name = item.item;
            return name && name.toString().trim() !== '' &&
                !name.toString().toLowerCase().includes('null');
        });

        groupData.sort((a,b) => (a.item || '').localeCompare(b.item || ''));

        buildDropDown();
        applyUserFilters();
    } catch (err) {
        console.error("Failed to load inventory:", err);
    }
}

// Dropdown
function buildDropDown() {
    const types = [...new Set(groupData.map(item => item._type))];
    typeSelect.innerHTML = '<option value="">All types</option>';
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
}

function buildCategoryDropDown() {
    const sourceItems = activeType ? groupData.filter(item => item._type === activeType) : groupData;
    const categories = [...new Set(sourceItems.map(item => item.category).filter(cat => cat && cat.toString().trim() !== ''))].sort();
    
    categorySelect.innerHTML = '<option value="">All categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    activeCategory = '';
    categorySelect.value = '';
}
// User filter for type
function applyUserFilters() {
    filteredData = groupData.filter(item => {
        const matchesType =!activeType || item._type === activeType;
        const matchesCategory =!activeCategory || item.category === activeCategory;
        const matchesSearch = !searchQuery || [
            item.item,
            item.tags,
        ].some(field =>
            field && field.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
        return matchesType && matchesCategory && matchesSearch;
    });
    displayInventory(filteredData);
}

// Get images
function getDriveImageUrl(url) {
    if(!url) return '';

    // Extract the file ID from the share link
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
    }

    // If they already stored just the ID
    return `https://drive.google.com/thumbnail?id=${url}&sz=w400`;
}

// Display inventory in cards and modals
function displayInventory(items) {

    const container =
        document.getElementById("inventory-container");

    container.innerHTML = "";

    items.forEach((item, index) => {
        const globalIndex = groupData.indexOf(item);

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML += `
            <img src="${getDriveImageUrl(item.image)}" "alt="${item.item}" >
            <h2>${item.item}</h2>
            <p>${item._type}</p>
            ${fieldValue(item.location)}
            ${fieldValue(item.status)}
            ${item.tags ? `<p style="font-size: 0.8rem;"><strong>Tags: </strong>${item.tags}</p>` :""}
        `;

        card.addEventListener('click', () => openModal(globalIndex));
        container.appendChild(card);
    });
}

function fieldValue(value) {
    return value ? `<p>${value}</p>`
    : "";
}

// Modal
function openModal(index) {
    if (index === null || index === undefined) {
        return;
    }
    const item = groupData[index];
    if (!item) {
        return;
    }
    
    const defaultFields = ['item', 'image', '_type', 'quantity'];

    const fields = Object.entries(item)
        .filter(([key]) => !defaultFields.includes(key))
        .map(([key,value]) => field(
            key.charAt(0).toUpperCase() + key.slice(1), value))
            .join('');

    document.getElementById("modal-details").innerHTML = `

        <h2>${item.item}</h2>
        <p><i>${item._type}</i><p>
        <img
            src="${getDriveImageUrl(item.image)}"
            style="max-width:100%" 
        >
        <p><strong>Quantity:</strong> ${item.quantity}</p>
        ${fields}
    `;
    modal.style.display = "block";
}

function field(label, value) {
    return value ? `<p><strong>${label}:</strong> ${value}</p>`
    : "";
}

var modal = document.getElementById("item-modal");
modal.style.display = "none";
var closeButton = document.getElementById("close");


closeButton.addEventListener("click", () => {
    modal.style.display = "none";
});

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

document.addEventListener("keydown", (event) => {
    if(event.key === "Escape") {
        modal.style.display = "none";
    }
});

loadInventory();