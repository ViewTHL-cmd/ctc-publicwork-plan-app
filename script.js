// นำ URL ที่ได้จาก GAS มาวางที่นี่
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyQfEQUeqrCkhd61dbftgJf3gtnHWctj2Ap4BAMWMP2f2JNcXkeexWRmuLxlFoGrMY0/exec';

let isAdmin = false;
let globalData = [];
let map, marker, myChart;

// 1. ระบบจัดการหน้าต่าง (SPA Routing)
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    // รีเฟรชแผนที่เมื่อเปิดหน้า Form ป้องกันแผนที่เทา
    if(pageId === 'form' && map) {
        setTimeout(() => { map.invalidateSize(); }, 300);
    }
}

// 2. ระบบ Login ด้วย SweetAlert2
async function toggleLogin() {
    if (isAdmin) {
        isAdmin = false;
        document.getElementById('nav-add').style.display = 'none';
        document.getElementById('nav-login').innerText = 'Admin Login';
        Swal.fire('ออกจากระบบ', 'คุณกลับสู่โหมดผู้ใช้งานทั่วไป', 'info');
        showPage('dashboard');
    } else {
        const { value: formValues } = await Swal.fire({
            title: 'เจ้าหน้าที่เข้าสู่ระบบ',
            html: `
                <input id="swal-user" class="swal2-input" placeholder="Username (เช่น admin)">
                <input id="swal-pass" type="password" class="swal2-input" placeholder="Password">
            `,
            focusConfirm: false,
            background: '#1a2a32',
            color: '#fff',
            preConfirm: () => {
                return { 
                    user: document.getElementById('swal-user').value, 
                    pass: document.getElementById('swal-pass').value 
                }
            }
        });

        if (formValues) {
            Swal.fire({ title: 'กำลังตรวจสอบ...', allowOutsideClick: false, background: '#1a2a32', color: '#fff', didOpen: () => { Swal.showLoading() } });
            try {
                const res = await fetch(WEB_APP_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'login', username: formValues.user, password: formValues.pass })
                });
                const data = await res.json();
                
                if (data.status === 'success') {
                    isAdmin = true;
                    document.getElementById('nav-add').style.display = 'inline-block';
                    document.getElementById('nav-login').innerText = 'Logout';
                    Swal.fire({ title: 'สำเร็จ!', text: 'คุณสามารถเพิ่มข้อมูลได้แล้ว', icon: 'success', background: '#1a2a32', color: '#fff'});
                    showPage('form');
                } else {
                    Swal.fire({ title: 'ปฏิเสธการเข้าถึง', text: data.message, icon: 'error', background: '#1a2a32', color: '#fff'});
                }
            } catch(e) {
                Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
        }
    }
}

// 3. จัดการ Format ตัวเลข (ใส่ลูกน้ำ)
function formatNumber(input) {
    let val = input.value.replace(/,/g, '');
    if (!isNaN(val) && val !== '') {
        input.value = Number(val).toLocaleString('th-TH');
    } else {
        input.value = '';
    }
}

// 4. โหลดข้อมูลเมื่อเปิดหน้าเว็บ & ตั้งค่า Leaflet Map
window.onload = () => {
    // พิกัดเริ่มต้น (กรุงเทพฯ - ปรับเปลี่ยนได้)
    map = L.map('map').setView([13.7563, 100.5018], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // เมื่อคลิกบนแผนที่ ให้ปักหมุด
    map.on('click', function(e) {
        if(marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
        document.getElementById('lat').value = e.latlng.lat;
        document.getElementById('lng').value = e.latlng.lng;
    });

    fetchData(); // ดึงข้อมูลจาก Sheets ทันที
};

// แปลงไฟล์เป็น Base64
const getBase64 = (file) => new Promise((resolve, reject) => {
    if(!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// 5. Submit ฟอร์มและส่งไฟล์ไป GAS
document.getElementById('dataForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ตรวจสอบว่าปักหมุดหรือยัง
    if(!document.getElementById('lat').value) {
        Swal.fire('แจ้งเตือน', 'กรุณาปักหมุดตำแหน่งโครงการบนแผนที่', 'warning');
        return;
    }

    Swal.fire({ title: 'กำลังอัปโหลดข้อมูล...', text: 'อาจใช้เวลา 1-2 นาที หากไฟล์มีขนาดใหญ่', allowOutsideClick: false, background: '#1a2a32', color: '#fff', didOpen: () => { Swal.showLoading() } });
    
    const file1 = document.getElementById('file1').files[0];
    const file2 = document.getElementById('file2').files[0];
    const file3 = document.getElementById('file3').files[0];

    const payload = {
        action: 'saveData',
        projectName: document.getElementById('projectName').value,
        year: document.getElementById('year').value,
        department: document.getElementById('department').value,
        planNo: document.getElementById('planNo').value,
        pages: document.getElementById('pages').value,
        budget: document.getElementById('budget').value.replace(/,/g, ''),
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        file1: file1 ? { base64: await getBase64(file1) } : null,
        file2: file2 ? { base64: await getBase64(file2) } : null,
        file3: file3 ? { base64: await getBase64(file3) } : null
    };

    try {
        const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        
        if(result.status === 'success') {
            Swal.fire({ title: 'สำเร็จ', text: result.message, icon: 'success', background: '#1a2a32', color: '#fff'});
            document.getElementById('dataForm').reset();
            if(marker) map.removeLayer(marker);
            fetchData(); // อัปเดตตารางใหม่
            showPage('search'); // เด้งไปหน้าตาราง
        } else {
            Swal.fire('เกิดข้อผิดพลาด', result.message, 'error');
        }
    } catch(err) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อมูลได้', 'error');
    }
});

// 6. ดึงข้อมูลมาสร้าง Table และ Dashboard
async function fetchData() {
    try {
        const res = await fetch(`${WEB_APP_URL}?action=getData`);
        const result = await res.json();
        if(result.status === 'success') {
            globalData = result.data;
            updateDashboard();
            renderTable(globalData);
        }
    } catch(e) { console.log('Error fetching data:', e); }
}

function renderTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    
    // เรียงจากข้อมูลใหม่สุดไปเก่าสุด (สมมติว่าอิงตามการต่อท้ายแถว)
    const reversedData = [...data].reverse();

    reversedData.forEach(row => {
        let links = '';
        if(row['ไฟล์ขออนุมัติ']) links += `<a href="${row['ไฟล์ขออนุมัติ']}" target="_blank" class="file-btn">📄 ขออนุมัติ</a>`;
        if(row['ไฟล์แบบแปลน']) links += `<a href="${row['ไฟล์แบบแปลน']}" target="_blank" class="file-btn">📐 แบบแปลน</a>`;
        if(row['ไฟล์ประมาณราคา']) links += `<a href="${row['ไฟล์ประมาณราคา']}" target="_blank" class="file-btn">💰 ประมาณราคา</a>`;
        
        // ถ้าไม่มีไฟล์เลย
        if(links === '') links = '<span style="color:#888; font-size:12px;">ไม่มีไฟล์แนบ</span>';

        tbody.innerHTML += `
            <tr>
                <td>${row['ปีงบประมาณ'] || '-'}</td>
                <td>${row['ชื่อโครงการ'] || '-'}</td>
                <td>${row['หน่วยงาน'] || '-'}</td>
                <td>${Number(row['งบประมาณ']).toLocaleString('th-TH') || '0'}</td>
                <td>${links}</td>
            </tr>
        `;
    });
}

// 7. ระบบค้นหา Real-time
document.getElementById('searchInput').addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase();
    const filtered = globalData.filter(row => 
        (row['ชื่อโครงการ'] && row['ชื่อโครงการ'].toLowerCase().includes(text)) || 
        (row['หน่วยงาน'] && row['หน่วยงาน'].toLowerCase().includes(text)) ||
        (row['ปีงบประมาณ'] && row['ปีงบประมาณ'].toString().includes(text))
    );
    renderTable(filtered);
});

// 8. อัปเดตกราฟ Chart.js
function updateDashboard() {
    document.getElementById('total-projects').innerText = globalData.length;
    const totalBudget = globalData.reduce((sum, row) => sum + Number(row['งบประมาณ'] || 0), 0);
    document.getElementById('total-budget').innerText = totalBudget.toLocaleString('th-TH');

    // นับจำนวนโครงการแยกตามหน่วยงาน
    const deptCounts = {};
    globalData.forEach(row => {
        const dept = row['หน่วยงาน'] || 'ไม่ระบุ';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    if(myChart) myChart.destroy(); // ล้างกราฟเก่าก่อนวาดใหม่
    const ctx = document.getElementById('budgetChart').getContext('2d');
    
    // โทนสีเข้ากับ Theme
    const chartColors = ['#4facfe', '#00f2fe', '#8fd3f4', '#f5576c', '#43e97b'];

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(deptCounts),
            datasets: [{
                data: Object.values(deptCounts),
                backgroundColor: chartColors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'right', labels: { color: '#fff', font: { family: 'Prompt' } } },
                title: { display: true, text: 'สัดส่วนโครงการแยกตามหน่วยงาน', color: '#fff', font: { family: 'Prompt', size: 16 } }
            },
            cutout: '65%'
        }
    });
}