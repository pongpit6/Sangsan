// ตั้งค่า API และตัวแปรควบคุม
const API_URL = "https://script.google.com/macros/s/AKfycbytaSlxPmMYtF6JWfpXD50WFeoPPd1tkFtb4_ZBScSSp_M_e3P85gdrpldL8vxqcFEO/exec";
let appData = { tasks: [], settings: { clients: [], types: [], platforms: [] } };
let viewedDate = new Date(); // วันที่ที่กำลังดูในปฏิทิน
let chartInstance = null;

// เริ่มต้นแอป
async function init() {
    try {
        const response = await fetch(API_URL);
        appData = await response.json();
        setupDropdowns();
        renderCalendar();
    } catch (err) {
        document.getElementById('calendarGrid').innerHTML = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        console.error(err);
    }
}

// ตั้งค่าข้อมูล Dropdown ในฟอร์ม
function setupDropdowns() {
    const clientSel = document.getElementById('clientName');
    const typeSel = document.getElementById('taskType');
    const platSel = document.getElementById('platform');

    clientSel.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    appData.settings.clients.forEach(c => clientSel.innerHTML += `<option value="${c[0]}">${c[0]}</option>`);

    typeSel.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    appData.settings.types.forEach(t => typeSel.innerHTML += `<option value="${t}">${t}</option>`);

    platSel.innerHTML = '<option value="">-- ไม่มี/ไม่ระบุ --</option>';
    appData.settings.platforms.forEach(p => platSel.innerHTML += `<option value="${p}">${p}</option>`);
}

// ฟังก์ชันเปลี่ยนเดือน
function changeMonth(step) {
    viewedDate.setMonth(viewedDate.getMonth() + step);
    renderCalendar();
}

// วาดปฏิทิน
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const year = viewedDate.getFullYear();
    const month = viewedDate.getMonth();
    
    // อัปเดตชื่อเดือน
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    document.getElementById('currentMonthLabel').innerText = `${monthNames[month]} ${year + 543}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // เติมช่องว่างวันก่อนหน้า
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'day-cell empty';
        grid.appendChild(div);
    }

    // วนลูปสร้างวัน
    for (let i = 1; i <= daysInMonth; i++) {
        const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        dayCell.innerHTML = `<div class="day-num">${i}</div><div class="task-container" id="date-${i}"></div>`;

        // กรองงานของวันนี้
        const dailyTasks = appData.tasks.filter(t => {
            if (!t.PostDate) return false;
            const d = new Date(t.PostDate);
            return d.getDate() === i && d.getMonth() === month && d.getFullYear() === year;
        });

        dailyTasks.forEach(task => {
            const clientInfo = appData.settings.clients.find(c => c[0] === task.ClientName) || ["", "#95a5a6"];
            const tag = document.createElement('a');
            tag.className = 'task-tag';
            tag.style.backgroundColor = clientInfo[1];
            tag.innerText = `${task.ClientName}: ${task.TaskType}`;
            tag.href = task.ContentLink || "#";
            if (task.ContentLink) tag.target = "_blank";
            tag.onclick = (e) => { if(!task.ContentLink) e.stopPropagation(); };
            dayCell.querySelector('.task-container').appendChild(tag);
        });

        dayCell.onclick = () => openModal(fullDateStr);
        grid.appendChild(dayCell);
    }
}

// จัดการ Modal
function openModal(date) {
    if (date) document.getElementById('postDate').value = date;
    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ระบบ Dashboard และกราฟ
function openDashboard() {
    document.getElementById('dashModal').style.display = 'flex';
    document.getElementById('dashTitle').innerText = `สรุปเดือน ${document.getElementById('currentMonthLabel').innerText}`;

    const monthTasks = appData.tasks.filter(t => {
        const d = new Date(t.PostDate);
        return d.getMonth() === viewedDate.getMonth() && d.getFullYear() === viewedDate.getFullYear();
    });

    let contentCount = 0;
    let otherCount = 0;
    const typeGroup = {};

    monthTasks.forEach(t => {
        if (t.Platform && t.Platform !== "") contentCount++; else otherCount++;
        typeGroup[t.TaskType] = (typeGroup[t.TaskType] || 0) + 1;
    });

    document.getElementById('statTotal').innerText = monthTasks.length;
    document.getElementById('statContent').innerText = contentCount;
    document.getElementById('statOther').innerText = otherCount;

    // วาดกราฟ
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('summaryChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeGroup),
            datasets: [{
                data: Object.values(typeGroup),
                backgroundColor: ['#3498db', '#e74c3c', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22']
            }]
        },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
    });
}

// ส่งฟอร์มบันทึกข้อมูล
document.getElementById('taskForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;

    const payload = {
        postDate: document.getElementById('postDate').value,
        clientName: document.getElementById('clientName').value,
        taskType: document.getElementById('taskType').value,
        platform: document.getElementById('platform').value,
        contentLink: document.getElementById('contentLink').value,
        notes: document.getElementById('notes').value
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("บันทึกสำเร็จ!");
        location.reload();
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการบันทึก");
        btn.innerText = "บันทึกลงปฏิทิน"; btn.disabled = false;
    }
};

// รันแอป
init();