let currentPage = 1;
let allTokens = [];
let totalPages = 1;
const tableBody = document.querySelector('#tokensTable tbody');
const projectsTableBody = document.querySelector('#projectsTable tbody');
const pageInfo = document.getElementById('pageInfo');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const toast = document.getElementById('toast');
const tokenCount = document.getElementById('tokenCount');
const tokenStats = document.getElementById('tokenStats');
const BASESCAN_API_KEY = '1XJ7DZ5NF8MKVRYCMXTFVEJTXNHMIQGF1N';

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

async function loadTokens(page) {
  const cacheKey = `tokens_page_${page}`;
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    allTokens = JSON.parse(cachedData);
    displayTokens();
    await loadProjectData();
    updatePagination();
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
  projectsTableBody.innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';

  const apiUrl = `https://api.allorigins.win/raw?url=https://www.clanker.world/api/tokens?page=${page}`;
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) throw new Error('Request error: ' + response.status);
      return response.json();
    })
    .then(data => {
      const tokens = data.data || [];
      if (tokens.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No tokens found</td></tr>';
        projectsTableBody.innerHTML = '<tr><td colspan="4">No data available</td></tr>';
        showToast('No tokens found', 'error');
        return;
      }
      allTokens = tokens;
      localStorage.setItem(cacheKey, JSON.stringify(tokens));
      displayTokens();
      loadProjectData();
      updatePagination();
    })
    .catch(error => {
      tableBody.innerHTML = '<tr><td colspan="5">Error: ' + error.message + '</td></tr>';
      projectsTableBody.innerHTML = '<tr><td colspan="4">Error: ' + error.message + '</td></tr>';
      showToast('Error loading tokens: ' + error.message, 'error');
    });
}

async function loadProjectData() {
  projectsTableBody.innerHTML = '<tr><td colspan="4" class="loading">Loading project data...</td></tr>';
  const projectData = [];

  for (const token of allTokens) {
    const contractAddress = token.contract_address;
    const poolAddress = token.pool_address;

    const volume = await fetchVolume(poolAddress);
    const earnings = volume * 0.01 * 0.4; // 1% de tarifas, 40% para creadores
    const rewardsStatus = await checkRewardsStatus(contractAddress);

    projectData.push({
      name: token.name || 'N/A',
      volume: volume.toFixed(2),
      earnings: earnings.toFixed(2),
      status: rewardsStatus
    });
  }

  displayProjects(projectData);
  updateTokenStats(projectData);
  renderVolumeChart(projectData);
}

async function fetchVolume(poolAddress) {
  try {
    const response = await fetch(`https://api.basescan.org/api?module=account&action=txlist&address=${poolAddress}&sort=desc&apikey=${BASESCAN_API_KEY}`);
    const data = await response.json();
    if (data.status === '1' && data.result.length > 0) {
      const totalValue = data.result.reduce((sum, tx) => sum + (parseInt(tx.value) / 1e18), 0);
      return totalValue; // Volumen en ETH
    }
    return 0; // Si no hay transacciones
  } catch (error) {
    console.error('Error fetching volume:', error);
    return 0;
  }
}

async function checkRewardsStatus(contractAddress) {
  try {
    // Usamos el evento estándar de Transfer (0xddf252...) para detectar movimientos de recompensas
    const response = await fetch(`https://api.basescan.org/api?module=logs&action=getLogs&address=${contractAddress}&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&apikey=${BASESCAN_API_KEY}`);
    const data = await response.json();
    return data.status === '1' && data.result.length > 0 ? 'Claimed' : 'Not Claimed';
  } catch (error) {
    console.error('Error checking rewards:', error);
    return 'Unknown';
  }
}

function displayProjects(projectData) {
  projectsTableBody.innerHTML = '';
  if (projectData.length === 0) {
    projectsTableBody.innerHTML = '<tr><td colspan="4">No project data available</td></tr>';
    return;
  }

  projectData.forEach(project => {
    const row = `<tr>
      <td>${project.name}</td>
      <td>${project.volume} ETH</td>
      <td>${project.earnings} ETH</td>
      <td>${project.status}</td>
    </tr>`;
    projectsTableBody.innerHTML += row;
  });
}

function updateTokenStats(projectData) {
  if (projectData.length === 0) {
    tokenStats.innerHTML = '<p>No tokens to display statistics.</p>';
    return;
  }

  const latestToken = allTokens.reduce((latest, current) => {
    return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
  });

  const longestNameToken = allTokens.reduce((longest, current) => {
    return (current.name || '').length > (longest.name || '').length ? current : longest;
  });

  const topVolumeProject = projectData.reduce((top, current) => {
    return parseFloat(current.volume) > parseFloat(top.volume) ? current : top;
  });

  tokenStats.innerHTML = `
    <h3>Token Stats</h3>
    <p><strong>Latest Token:</strong> ${latestToken.name || 'N/A'} (Created: ${new Date(latestToken.created_at).toLocaleDateString()})</p>
    <p><strong>Longest Name:</strong> ${longestNameToken.name || 'N/A'} (${(longestNameToken.name || '').length} chars)</p>
    <p><strong>Top Volume:</strong> ${topVolumeProject.name} (${topVolumeProject.volume} ETH)</p>
  `;
}

function renderVolumeChart(projectData) {
  const ctx = document.getElementById('volumeChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: projectData.map(p => p.name),
      datasets: [{
        label: 'Trading Volume (ETH)',
        data: projectData.map(p => p.volume),
        backgroundColor: '#007bff',
        borderColor: '#0056b3',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function displayTokens() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const dateFilter = document.getElementById('dateFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;
  const lengthFilter = document.getElementById('lengthFilter').value;

  let filteredTokens = allTokens.filter(token => {
    const name = (token.name || '').toLowerCase();
    const symbol = (token.symbol || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm) || symbol.includes(searchTerm);

    const tokenDate = new Date(token.created_at || 0);
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
    const matchesLength = lengthFilter === 'all' || (token.name || '').length > parseInt(lengthFilter);

    return matchesSearch && matchesDate && matchesType && matchesLength;
  });

  if (sortFilter === 'name-asc') {
    filteredTokens.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortFilter === 'name-desc') {
    filteredTokens.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
  } else if (sortFilter === 'symbol-asc') {
    filteredTokens.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  } else if (sortFilter === 'symbol-desc') {
    filteredTokens.sort((a, b) => (b.symbol || '').localeCompare(a.symbol || ''));
  } else {
    filteredTokens.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  tableBody.innerHTML = '';
  if (filteredTokens.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">No tokens match your filters</td></tr>';
    tokenCount.textContent = 'Showing 0 of ' + allTokens.length + ' tokens';
    return;
  }

  filteredTokens.forEach(token => {
    const row = `<tr>
      <td>${token.name || 'N/A'}</td>
      <td>${token.symbol || 'N/A'}</td>
      <td><a href="https://basescan.org/address/${token.contract_address || '#'}" target="_blank">View</a></td>
      <td>${token.created_at ? new Date(token.created_at).toLocaleDateString() : 'N/A'}</td>
      <td><a href="https://basescan.org/address/${token.pool_address || '#'}" target="_blank">View</a></td>
    </tr>`;
    tableBody.innerHTML += row;
  });

  tokenCount.textContent = `Showing ${filteredTokens.length} of ${allTokens.length} tokens`;
}

function clearFilters() {
  document.getElementById('search').value = '';
  document.getElementById('dateFilter').value = 'all';
  document.getElementById('typeFilter').value = 'all';
  document.getElementById('sortFilter').value = 'date-desc';
  document.getElementById('lengthFilter').value = 'all';
  displayTokens();
  showToast('Filters cleared!', 'success');
}

function exportToCSV() {
  const rows = document.querySelectorAll('#projectsTable tr');
  let csvContent = 'Token Name,Trading Volume,Creator Earnings,Rewards Status\n';

  rows.forEach(row => {
    if (row.querySelector('td')) {
      const cells = row.querySelectorAll('td');
      const rowData = [cells[0].textContent, cells[1].textContent, cells[2].textContent, cells[3].textContent];
      csvContent += rowData.join(',') + '\n';
    }
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'chainvibe_projects.csv';
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

document.getElementById('search').addEventListener('click', displayTokens);
document.getElementById('dateFilter').addEventListener('change', displayTokens);
document.getElementById('typeFilter').addEventListener('change', displayTokens);
document.getElementById('sortFilter').addEventListener('change', displayTokens);
document.getElementById('lengthFilter').addEventListener('change', displayTokens);
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

document.getElementById('scrollTop').addEventListener('click', scrollToTop);