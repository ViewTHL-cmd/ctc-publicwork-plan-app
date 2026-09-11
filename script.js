// ==========================================
// ลิงก์ Web App URL (GAS) ของคุณ
const GAS_URL = "https://script.google.com/macros/s/AKfycbxQe_86sY1R6_XdADeFl5ezrVfo4wCw06aFDBakeVsfwjcr6cS-UhX1itg2Sib3CEZt/exec";
// ==========================================

let map;
let marker;
let appData = [];
let chartInstance = null;

// SPA Navigation (ระบบเปลี่ยนหน้า)
function navigate(sectionId) {
    // 1. ซ่อนทุก Section
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
    
    // 2. แสดง Section ที่เลือก
    document.getElementById(sectionId).classList.remove('hidden');
    
    // 3. จัดการการโหลดแผนที่ (แก้บัคแผนที่เทาตอนสลับหน้า)
    if (sectionId === 'add-form') {
        if (!map) {
            initMap();
        } else {
            setTimeout(() => { map.invalidateSize(); }, 200);
        }
    }
    
    // 4. รีเฟรชข้อมูลเมื่อเข้าหน้าแรกหรือหน้าค้นหา
    if (sectionId === 'dashboard' || sectionId === 'search') {
        fetchData(); 
    }
}

// Map Initialization (Leaflet)
function initMap() {
    // ตั้งค่าพิกัดเริ่มต้น (ประเทศไทย)
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

// Format Currency Utility (ใส่ลูกน้ำอัตโนมัติ)
function formatCurrency(input) {
    let value = input.value.replace(/,/g, '');
    if (!isNaN(value) && value !== '') {
        input.value = Number(value).toLocaleString('en-US');
    }
}

// แปลงไฟล์ PDF เป็น Base64
const toBase64 = file => new Promise((resolve, reject) => {
    if (!file) {
        resolve("");
        return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// จัดการฟอร์มเมื่อกดบันทึกข้อมูล
document.getElementById('constructionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "กำลังบันทึกและอัปโหลดไฟล์ (อาจใช้เวลาสักครู่)...";
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
            alert("✅ บันทึกข้อมูลและอัปโหลดไฟล์เรียบร้อยแล้ว");
            document.getElementById('constructionForm').reset();
            if(marker) map.removeLayer(marker);
            navigate('dashboard');
        } else {
            alert("❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: " + result.message);
        }
    } catch (error) {
        alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error);
    } finally {
        btn.innerText = "บันทึกข้อมูล";
        btn.disabled = false;
    }
});

// ดึงข้อมูลมาแสดงผล (Dashboard & Search)
async function fetchData() {
    try {
        const response = await fetch(GAS_URL);
        const data = await response.json();
        
        // ป้องกัน Error กรณี Sheet ยังไม่มีข้อมูล (จะรีเทิร์นเป็น Array ว่าง)
        appData = Array.isArray(data) ? data : [];
        
        // อัปเดต Dashboard
        document.getElementById('total-projects').innerText = appData.length;
        const totalBudget = appData.reduce((sum, item) => sum + Number(item.Budget || 0), 0);
        document.getElementById('total-budget').innerText = totalBudget.toLocaleString('en-US');
        
        renderChart();
        renderTable(appData);
    } catch (error) {
        console.error("Error fetching data: ", error);
        // ไม่ให้โชว์ alert กวนใจตอนเพิ่งเข้าเว็บ แต่ดู error ได้ที่ Console
    }
}

// สร้างกราฟสรุปงบประมาณตามหน่วยงาน
function renderChart() {
    const ctx = document.getElementById('budgetChart');
    if(chartInstance) chartInstance.destroy();

    if(appData.length === 0) return; // ถ้าไม่มีข้อมูลไม่ต้องเรนเดอร์กราฟ

    const deptData = appData.reduce((acc, curr) => {
        const dept = curr.Department || "ไม่ระบุ";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(deptData),
            datasets: [{
                data: Object.values(deptData),
                backgroundColor: ['#004e92', '#3a7bd5', '#a8c0ff', '#ffffff'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: 'white', font: { family: 'Prompt' } } }
            }
        }
    });
}

// เรนเดอร์ตาราง
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ยังไม่มีข้อมูลโครงการ</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.FiscalYear || '-'}</td>
            <td>${item.PlanNo || '-'}</td>
            <td>${item.ProjectName || '-'}</td>
            <td>${Number(item.Budget || 0).toLocaleString('en-US')}</td>
            <td class="file-links">
                ${item.ApprovalFile ? `<a href="${item.ApprovalFile}" target="_blank">📄 ขออนุมัติ</a>` : ''}
                ${item.PlanFile ? `<a href="${item.PlanFile}" target="_blank">📄 แบบแปลน</a>` : ''}
                ${item.EstimateFile ? `<a href="${item.EstimateFile}" target="_blank">📄 ประมาณราคา</a>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ระบบ Filter ค้นหา
function filterData() {
    const searchTxt = document.getElementById('searchInput').value.toLowerCase();
    const yearFilter = document.getElementById('filterYear').value;
    
    const filtered = appData.filter(item => {
        const projectName = (item.ProjectName || "").toLowerCase();
        const planNo = (item.PlanNo || "").toLowerCase();
        const matchSearch = projectName.includes(searchTxt) || planNo.includes(searchTxt);
        const matchYear = yearFilter ? item.FiscalYear == yearFilter : true;
        return matchSearch && matchYear;
    });
    
    renderTable(filtered);
}

// ----------------------------------------------------
// ระบบ Login อย่างง่าย (Session)
// ----------------------------------------------------
function toggleLoginModal() {
    document.getElementById('loginModal').classList.toggle('hidden');
}

async function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
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
            alert("เข้าสู่ระบบสำเร็จ");
        } else {
            alert("รหัสผ่านไม่ถูกต้อง");
        }
    } catch(e) { 
        alert("เกิดข้อผิดพลาดในการเข้าสู่ระบบ"); 
        console.error(e);
    }
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

// ----------------------------------------------------
// ทำงานเมื่อโหลดหน้าเว็บครั้งแรก
// ----------------------------------------------------
window.onload = () => {
    checkAuth();
    fetchData(); // ดึงข้อมูลทันทีเมื่อเปิดหน้าเว็บ
};
