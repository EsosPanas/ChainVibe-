let currentPage = 1;
const tableBody = document.querySelector('#tokensTable tbody');

function loadTokens(page) {
  const apiUrl = `https://api.allorigins.win/raw?url=https://www.clanker.world/api/tokens?page=${page}`;
  console.log('Loading page:', page, 'from:', apiUrl);
  fetch(apiUrl)
    .then(response => {
      console.log('Response received:', response.status);
      if (!response.ok) {
        throw new Error('Request error: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      console.log('Data received:', data);
      const tokens = data.data;
      if (!tokens || tokens.length === 0) {
        console.log('No tokens found on page:', page);
        tableBody.innerHTML = '<tr><td colspan="5">No tokens found</td></tr>';
        return;
      }
      tableBody.innerHTML = ''; // Clear the table
      tokens.forEach(token => {
        const row = `<tr>
          <td>${token.name}</td>
          <td>${token.symbol}</td>
          <td><a href="https://basescan.org/address/${token.contract_address}" target="_blank">View</a></td>
          <td>${new Date(token.created_at).toLocaleDateString()}</td>
          <td><a href="https://basescan.org/address/${token.pool_address}" target="_blank">View</a></td>
        </tr>`;
        tableBody.innerHTML += row;
      });
    })
    .catch(error => {
      console.error('Error loading tokens:', error);
      tableBody.innerHTML = '<tr><td colspan="5">Error loading tokens: ' + error.message + '</td></tr>';
    });
}

// Load the first page on start
loadTokens(currentPage);

// Pagination buttons
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

// Search functionality
document.getElementById('search').addEventListener('input', function() {
  const searchTerm = this.value.toLowerCase();
  const rows = document.querySelectorAll('#tokensTable tbody tr');
  rows.forEach(row => {
    const name = row.cells[0].textContent.toLowerCase();
    const symbol = row.cells[1].textContent.toLowerCase();
    row.style.display = (name.includes(searchTerm) || symbol.includes(searchTerm)) ? '' : 'none';
  });
});