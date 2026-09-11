// ==========================================
// ⚠️ ใส่ Web App URL ที่ได้จาก GAS ตรงนี้
const GAS_URL = "https://script.google.com/macros/s/AKfycbxQe_86sY1R6_XdADeFl5ezrVfo4wCw06aFDBakeVsfwjcr6cS-UhX1itg2Sib3CEZt/exec";
// ==========================================

let map;
let marker;
let appData = [];
let chartInstance = null;

// SPA Navigation
function navigate(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    
    if(sectionId === 'add-form' && !map) {
        initMap();
    }
    if(sectionId === 'dashboard') {
        fetchData(); // Refresh data on dashboard load
    }
}

// Map Initialization (Leaflet)
function initMap() {
    // Default location (Thailand center)
    map = L.map('map').setView([13.7563, 100.5018], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', function(e) {
        if(marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
        document.getElementById('lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('lng').value = e.latlng.lng.toFixed(6);
    });
}

// Format Currency Utility
function formatCurrency(input) {
    let value = input.value.replace(/,/g, '');
    if (!isNaN(value) && value !== '') {
        input.value = Number(value).toLocaleString('en-US');
    }
}

// File to Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Form Submit Handler
document.getElementById('constructionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "กำลังบันทึกและอัปโหลดไฟล์...";
    btn.disabled = true;

    try {
        const payload = {
            action: "saveData",
            projectName: document.getElementById('projectName').value,
            fiscalYear: document.getElementById('fiscalYear').value,
            planNo: document.getElementById('planNo').value,
            pages: document.getElementById('pages').value,
            budget: document.getElementById('budget').value.replace(/,/g, ''),
            department: document.getElementById('department').value,
            lat: document.getElementById('lat').value,
            lng: document.getElementById('lng').value,
            approvalFile: await toBase64(document.getElementById('approvalFile').files[0]),
            planFile: await toBase64(document.getElementById('planFile').files[0]),
            estimateFile: await toBase64(document.getElementById('estimateFile').files[0])
        };

        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if(result.status === "success") {
            alert("บันทึกข้อมูลเรียบร้อยแล้ว");
            document.getElementById('constructionForm').reset();
            if(marker) map.removeLayer(marker);
            navigate('dashboard');
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    } finally {
        btn.innerText = "บันทึกข้อมูล";
        btn.disabled = false;
    }
});

// Fetch Data for Dashboard & Search
async function fetchData() {
    try {
        const response = await fetch(GAS_URL);
        appData = await response.json();
        
        // Update Dashboard
        document.getElementById('total-projects').innerText = appData.length;
        const totalBudget = appData.reduce((sum, item) => sum + Number(item.Budget || 0), 0);
        document.getElementById('total-budget').innerText = totalBudget.toLocaleString('en-US');
        
        renderChart();
        renderTable(appData);
    } catch (error) {
        console.error("Error fetching data: ", error);
    }
}

// Render Chart.js
function renderChart() {
    const ctx = document.getElementById('budgetChart');
    if(chartInstance) chartInstance.destroy();

    // Group by Department
    const deptData = appData.reduce((acc, curr) => {
        acc[curr.Department] = (acc[curr.Department] || 0) + 1;
        return acc;
    }, {});

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(deptData),
            datasets: [{
                data: Object.values(deptData),
                backgroundColor: ['#004e92', '#3a7bd5', '#a8c0ff'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Render Table
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.FiscalYear}</td>
            <td>${item.PlanNo}</td>
            <td>${item.ProjectName}</td>
            <td>${Number(item.Budget).toLocaleString('en-US')}</td>
            <td class="file-links">
                ${item.ApprovalFile ? `<a href="${item.ApprovalFile}" target="_blank">📄 ขออนุมัติ</a>` : ''}
                ${item.PlanFile ? `<a href="${item.PlanFile}" target="_blank">📄 แบบแปลน</a>` : ''}
                ${item.EstimateFile ? `<a href="${item.EstimateFile}" target="_blank">📄 ประมาณราคา</a>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter Data
function filterData() {
    const searchTxt = document.getElementById('searchInput').value.toLowerCase();
    const yearFilter = document.getElementById('filterYear').value;
    
    const filtered = appData.filter(item => {
        const matchSearch = item.ProjectName.toLowerCase().includes(searchTxt) || item.PlanNo.toLowerCase().includes(searchTxt);
        const matchYear = yearFilter ? item.FiscalYear == yearFilter : true;
        return matchSearch && matchYear;
    });
    
    renderTable(filtered);
}

// Auth System (Simple SPA Admin logic)
function toggleLoginModal() {
    document.getElementById('loginModal').classList.toggle('hidden');
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    // จำลองการเช็คกับ GAS
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({action: "login", username: user, password: pass})
        });
        const result = await response.json();
        
        if(result.role === "admin") {
            sessionStorage.setItem('role', 'admin');
            toggleLoginModal();
            checkAuth();
        } else {
            alert("รหัสผ่านไม่ถูกต้อง");
        }
    } catch(e) { console.error(e); }
}

function logout() {
    sessionStorage.removeItem('role');
    checkAuth();
    navigate('dashboard');
}

function checkAuth() {
    const isAdmin = sessionStorage.getItem('role') === 'admin';
    if(isAdmin) {
        document.getElementById('nav-add-btn').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('login-btn').classList.add('hidden');
    } else {
        document.getElementById('nav-add-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
        document.getElementById('login-btn').classList.remove('hidden');
    }
}

// Init
window.onload = () => {
    checkAuth();
    fetchData();
};
