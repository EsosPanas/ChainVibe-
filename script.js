let currentPage = 1;
let allTokens = [];
let totalPages = 1;
const tableBody = document.querySelector('#tokensTable tbody');
const pageInfo = document.getElementById('pageInfo');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const toast = document.getElementById('toast');
const tokenCount = document.getElementById('tokenCount');

const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.classList.add(savedTheme);

function showToast(message, type) {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function updatePagination() {
  pageInfo.textContent = `Page ${currentPage}`;
  prevButton.disabled = currentPage === 1;
  nextButton.disabled = allTokens.length < 10;
}

function loadTokens(page) {
  const cacheKey = `tokens_page_${page}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    allTokens = JSON.parse(cachedData);
    displayTokens();
    updatePagination();
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';

  const apiUrl = `https://api.allorigins.win/raw?url=https://www.clanker.world/api/tokens?page=${page}`;
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Request error: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      const tokens = data.data;
      if (!tokens || tokens.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No tokens found</td></tr>';
        showToast('No tokens found', 'error');
        return;
      }
      allTokens = tokens;
      localStorage.setItem(cacheKey, JSON.stringify(tokens));
      displayTokens();
      updatePagination();
    })
    .catch(error => {
      tableBody.innerHTML = '<tr><td colspan="5">Error loading tokens: ' + error.message + '</td></tr>';
      showToast('Error loading tokens: ' + error.message, 'error');
    });
}

function displayTokens() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const dateFilter = document.getElementById('dateFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;

  let filteredTokens = allTokens.filter(token => {
    const name = token.name.toLowerCase();
    const symbol = token.symbol.toLowerCase();
    const matchesSearch = name.includes(searchTerm) || symbol.includes(searchTerm);

    const tokenDate = new Date(token.created_at);
    const now = new Date();
    let matchesDate = true;
    if (dateFilter === 'last7days') {
      const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = tokenDate >= cutoffDate;
    } else if (dateFilter === 'last30days') {
      const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = tokenDate >= cutoffDate;
    }

    const matchesType = typeFilter === 'all' || token.tipo === typeFilter;

    return matchesSearch && matchesDate && matchesType;
  });

  if (sortFilter === 'name-asc') {
    filteredTokens.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortFilter === 'name-desc') {
    filteredTokens.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortFilter === 'symbol-asc') {
    filteredTokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
  } else if (sortFilter === 'symbol-desc') {
    filteredTokens.sort((a, b) => b.symbol.localeCompare(b.symbol));
  } else {
    filteredTokens.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  tableBody.innerHTML = '';
  if (filteredTokens.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">No tokens match your filters</td></tr>';
    tokenCount.textContent = 'Mostrando 0 de ' + allTokens.length + ' tokens';
    return;
  }

  filteredTokens.forEach(token => {
    const row = `<tr>
      <td>${token.name}</td>
      <td>${token.symbol}</td>
      <td><a href="https://basescan.org/address/${token.contract_address}" target="_blank">View</a></td>
      <td>${new Date(token.created_at).toLocaleDateString()}</td>
      <td><a href="https://basescan.org/address/${token.pool_address}" target="_blank">View</a></td>
    </tr>`;
    tableBody.innerHTML += row;
  });

  tokenCount.textContent = `Mostrando ${filteredTokens.length} de ${allTokens.length} tokens`;
}

function clearFilters() {
  document.getElementById('search').value = '';
  document.getElementById('dateFilter').value = 'all';
  document.getElementById('typeFilter').value = 'all';
  document.getElementById('sortFilter').value = 'date-desc';
  displayTokens();
  showToast('Filters cleared!', 'success');
}

function exportToCSV() {
  const rows = document.querySelectorAll('#tokensTable tr');
  let csvContent = 'Name,Symbol,Contract,Creation Date,Liquidity Pool\n';

  rows.forEach(row => {
    if (row.querySelector('td')) {
      const cells = row.querySelectorAll('td');
      const rowData = [
        cells[0].textContent,
        cells[1].textContent,
        cells[2].querySelector('a').href,
        cells[3].textContent,
        cells[4].querySelector('a').href
      ];
      csvContent += rowData.join(',') + '\n';
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'chainvibe_tokens.csv';
  link.click();
  showToast('Exported to CSV successfully!', 'success');
}

loadTokens(currentPage);

document.getElementById('next').addEventListener('click', () => {
  currentPage++;
  loadTokens(currentPage);
});

document.getElementById('prev').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadTokens(currentPage);
  }
});

document.getElementById('search').addEventListener('input', displayTokens);
document.getElementById('dateFilter').addEventListener('change', displayTokens);
document.getElementById('typeFilter').addEventListener('change', displayTokens);
document.getElementById('sortFilter').addEventListener('change', displayTokens);
document.getElementById('exportCSV').addEventListener('click', exportToCSV);
document.getElementById('clearFilters').addEventListener('click', clearFilters);

document.getElementById('themeToggle').addEventListener('click', () => {
  const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.classList.remove(currentTheme);
  document.body.classList.add(newTheme);
  localStorage.setItem('theme', newTheme);
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onscroll = function() {
  const scrollTopBtn = document.getElementById('scrollTop');
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    scrollTopBtn.style.display = 'block';
  } else {
    scrollTopBtn.style.display = 'none';
  }
};