const GAS_URL = "https://script.google.com/macros/s/AKfycbxQe_86sY1R6_XdADeFl5ezrVfo4wCw06aFDBakeVsfwjcr6cS-UhX1itg2Sib3CEZt/exec";

// ==========================================
// 1. STATE MANAGEMENT (จัดการข้อมูลส่วนกลาง)
// ==========================================
const State = {
    data: [],
    map: null,
    marker: null,
    chart: null,
    isAdmin: false
};

// ==========================================
// 2. CORE UTILITIES (ระบบ UI และ Loader)
// ==========================================
const UI = {
    showLoader: (text = "กำลังประมวลผล...") => {
        document.getElementById('loaderText').innerText = text;
        document.getElementById('globalLoader').classList.remove('hidden');
    },
    hideLoader: () => document.getElementById('globalLoader').classList.add('hidden'),
    
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// ==========================================
// 3. API SERVICE (ฟังก์ชันเรียกข้อมูลกลาง ป้องกันเว็บค้าง)
// ==========================================
const API = {
    async call(options = null) {
        try {
            const res = await fetch(GAS_URL, {
                method: options ? 'POST' : 'GET',
                body: options ? JSON.stringify(options) : null
            });
            const result = await res.json();
            if (result.error || result.status === 'error') {
                throw new Error(result.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
            }
            return result;
        } catch (error) {
            UI.showToast(error.message, 'error');
            console.error("API Error:", error);
            return null;
        }
    }
};

// ==========================================
// 4. MAIN APPLICATION LOGIC
// ==========================================
const App = {
    init: async () => {
        App.checkAuth();
        App.attachEventListeners();
        await App.loadData();
    },

    navigate: (sectionId) => {
        document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
        document.getElementById(sectionId).classList.remove('hidden');
        
        if (sectionId === 'add-form') {
            App.initMap();
        } else if (sectionId === 'dashboard') {
            App.renderChart(); // รีเฟรชกราฟ
        }
    },

    // ---------- MAP SYSTEM ----------
    initMap: () => {
        if (!State.map) {
            State.map = L.map('map').setView([13.7563, 100.5018], 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(State.map);

            State.map.on('click', (e) => {
                if (State.marker) State.map.removeLayer(State.marker);
                State.marker = L.marker(e.latlng).addTo(State.map);
                document.getElementById('lat').value = e.latlng.lat.toFixed(6);
                document.getElementById('lng').value = e.latlng.lng.toFixed(6);
            });
        }
        // บังคับเรนเดอร์ขนาดแผนที่ใหม่หลังจากโชว์ DOM (แก้ปัญหาจอดำ/เทา)
        setTimeout(() => State.map.invalidateSize(), 200);
    },

    // ---------- DATA & RENDER ----------
    loadData: async () => {
        UI.showLoader("กำลังดึงข้อมูลโครงการ...");
        const response = await API.call();
        if (response && Array.isArray(response)) {
            State.data = response;
            App.updateDashboard();
            App.renderTable(State.data);
        }
        UI.hideLoader();
    },

    updateDashboard: () => {
        document.getElementById('total-projects').innerText = State.data.length;
        const totalBudget = State.data.reduce((sum, item) => sum + (Number(item.Budget) || 0), 0);
        document.getElementById('total-budget').innerText = totalBudget.toLocaleString('en-US');
        App.renderChart();
    },

    renderChart: () => {
        if (State.data.length === 0) return;
        const ctx = document.getElementById('budgetChart');
        if (State.chart) State.chart.destroy();

        const deptData = State.data.reduce((acc, curr) => {
            const dept = curr.Department || "ไม่ระบุ";
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});

        State.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(deptData),
                datasets: [{
                    data: Object.values(deptData),
                    backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#E91E63'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'white', font: { family: 'Prompt' } } } } }
        });
    },

    renderTable: (dataList) => {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        if (dataList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่พบข้อมูล</td></tr>';
            return;
        }
        dataList.forEach(item => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${item.FiscalYear || '-'}</td>
                    <td>${item.PlanNo || '-'}</td>
                    <td>${item.ProjectName || '-'}</td>
                    <td>${Number(item.Budget || 0).toLocaleString('en-US')}</td>
                    <td class="file-links">
                        ${item.ApprovalFile ? `<a href="${item.ApprovalFile}" target="_blank">📄 อนุมัติ</a>` : ''}
                        ${item.PlanFile ? `<a href="${item.PlanFile}" target="_blank">📄 แบบแปลน</a>` : ''}
                        ${item.EstimateFile ? `<a href="${item.EstimateFile}" target="_blank">📄 ราคา</a>` : ''}
                    </td>
                </tr>
            `);
        });
    },

    filterData: () => {
        const txt = document.getElementById('searchInput').value.toLowerCase();
        const year = document.getElementById('filterYear').value;
        const filtered = State.data.filter(item => {
            const matchTxt = (item.ProjectName || '').toLowerCase().includes(txt) || (item.PlanNo || '').toLowerCase().includes(txt);
            const matchYear = year ? item.FiscalYear == year : true;
            return matchTxt && matchYear;
        });
        App.renderTable(filtered);
    },

    // ---------- FORM & FILE SYSTEM ----------
    formatCurrency: (input) => {
        let val = input.value.replace(/,/g, '');
        if (!isNaN(val) && val !== '') input.value = Number(val).toLocaleString('en-US');
    },

    // ระบบตรวจสอบขนาดไฟล์ (Limit 5MB ต่อไฟล์)
    processFile: async (fileInputId) => {
        const file = document.getElementById(fileInputId).files[0];
        if (!file) return "";
        if (file.size > 5 * 1024 * 1024) throw new Error(`ไฟล์ในช่อง "${fileInputId}" มีขนาดใหญ่เกิน 5MB`);
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    submitForm: async (e) => {
        e.preventDefault();
        UI.showLoader("กำลังอัปโหลดไฟล์และบันทึกข้อมูล\n(อาจใช้เวลา 1-2 นาที ห้ามปิดหน้าจอ)...");

        try {
            const payload = {
                action: "saveData",
                projectName: document.getElementById('projectName').value.trim(),
                fiscalYear: document.getElementById('fiscalYear').value,
                planNo: document.getElementById('planNo').value.trim(),
                pages: document.getElementById('pages').value,
                budget: document.getElementById('budget').value.replace(/,/g, ''),
                department: document.getElementById('department').value,
                lat: document.getElementById('lat').value,
                lng: document.getElementById('lng').value,
                approvalFile: await App.processFile('approvalFile'),
                planFile: await App.processFile('planFile'),
                estimateFile: await App.processFile('estimateFile')
            };

            const result = await API.call(payload);
            if (result && result.status === "success") {
                UI.showToast("บันทึกข้อมูลเรียบร้อยแล้ว!");
                document.getElementById('constructionForm').reset();
                if (State.marker) State.map.removeLayer(State.marker);
                
                await App.loadData(); // รีโหลดข้อมูลใหม่
                App.navigate('dashboard');
            }
        } catch (error) {
            UI.showToast(error.message, 'error'); // แจ้งเตือน Error โดยไม่ทำให้เว็บพัง
        } finally {
            UI.hideLoader();
        }
    },

    // ---------- AUTH SYSTEM ----------
    toggleLogin: () => document.getElementById('loginModal').classList.toggle('hidden'),
    
    login: async () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        if(!user || !pass) return UI.showToast("กรุณากรอกข้อมูลให้ครบ", "error");

        UI.showLoader("กำลังตรวจสอบสิทธิ์...");
        const res = await API.call({ action: "login", username: user, password: pass });
        UI.hideLoader();

        if (res && res.role === "admin") {
            sessionStorage.setItem('role', 'admin');
            App.checkAuth();
            App.toggleLogin();
            UI.showToast("เข้าสู่ระบบสำเร็จ");
            document.getElementById('username').value = "";
            document.getElementById('password').value = "";
        }
    },

    logout: () => {
        sessionStorage.removeItem('role');
        App.checkAuth();
        App.navigate('dashboard');
        UI.showToast("ออกจากระบบแล้ว");
    },

    checkAuth: () => {
        State.isAdmin = sessionStorage.getItem('role') === 'admin';
        document.getElementById('nav-add-btn').classList.toggle('hidden', !State.isAdmin);
        document.getElementById('logout-btn').classList.toggle('hidden', !State.isAdmin);
        document.getElementById('login-btn').classList.toggle('hidden', State.isAdmin);
    },

    // ---------- EVENT LISTENERS ----------
    attachEventListeners: () => {
        document.getElementById('constructionForm').addEventListener('submit', App.submitForm);
        document.getElementById('searchInput').addEventListener('input', App.filterData);
        document.getElementById('filterYear').addEventListener('change', App.filterData);
    }
};

// Bootstrap App
document.addEventListener("DOMContentLoaded", App.init);
