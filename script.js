// URL ของ Apps Script (อัปเดตถ้ามีการ Deploy ใหม่)
const API_URL = "https://script.google.com/macros/s/AKfycbytaSlxPmMYtF6JWfpXD50WFeoPPd1tkFtb4_ZBScSSp_M_e3P85gdrpldL8vxqcFEO/exec";

let appData = { tasks: [], settings: { clients: [], types: [], platforms: [] } };
let viewedDate = new Date(); 
let currentSelectedDate = ""; 
let summaryChart = null;

async function init() {
    try {
        const res = await fetch(API_URL);
        appData = await res.json();
        setupDropdowns();
        renderCalendar();
    } catch (e) {
        document.getElementById('calendarGrid').innerHTML = '<div class="loading-state"><p style="color:red;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p></div>';
    }
}

function setupDropdowns() {
    const clientSel = document.getElementById('clientName');
    const typeSel = document.getElementById('taskType');
    const platSel = document.getElementById('platform');

    clientSel.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    typeSel.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    platSel.innerHTML = '<option value="">-- ไม่ระบุ --</option>';

    appData.settings.clients.forEach(c => clientSel.innerHTML += `<option value="${c[0]}">${c[0]}</option>`);
    appData.settings.types.forEach(t => typeSel.innerHTML += `<option value="${t}">${t}</option>`);
    appData.settings.platforms.forEach(p => platSel.innerHTML += `<option value="${p}">${p}</option>`);
}

function resetToToday() { viewedDate = new Date(); renderCalendar(); }
function changeMonth(step) { viewedDate.setMonth(viewedDate.getMonth() + step); renderCalendar(); }

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const year = viewedDate.getFullYear();
    const month = viewedDate.getMonth();
    const today = new Date();
    
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    document.getElementById('currentMonthLabel').innerText = `${monthNames[month]} ${year + 543}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'day-cell empty';
        grid.appendChild(div);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        // ไฮไลต์วันปัจจุบัน
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }

        dayCell.innerHTML = `<div class="day-num">${i}</div><div class="task-container"></div>`;

        const dailyTasks = appData.tasks.filter(t => t.PostDate && t.PostDate.startsWith(dateStr));

        dailyTasks.forEach(task => {
            const clientColor = (appData.settings.clients.find(c => c[0] === task.ClientName) || ["", "#64748b"])[1];
            const tag = document.createElement('div');
            tag.className = 'task-tag';
            tag.style.backgroundColor = clientColor;
            tag.innerText = `${task.ClientName}: ${task.TaskType}`;
            dayCell.querySelector('.task-container').appendChild(tag);
        });

        dayCell.onclick = () => openDayDetail(dateStr);
        grid.appendChild(dayCell);
    }
}

// ==== ระบบจัดการ Modal ประจำวัน ====
function openDayDetail(dateStr) {
    currentSelectedDate = dateStr;
    const d = new Date(dateStr);
    const mNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    document.getElementById('detailDateTitle').innerText = `คิวงาน ${d.getDate()} ${mNames[d.getMonth()]} ${d.getFullYear() + 543}`;
    const list = document.getElementById('detailTaskList');
    list.innerHTML = '';

    const tasksToday = appData.tasks.filter(t => t.PostDate && t.PostDate.startsWith(dateStr));

    if (tasksToday.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#9ca3af; padding: 20px;">ไม่มีคิวงานในวันนี้ 🌴</p>';
    } else {
        tasksToday.forEach(task => {
            const clientColor = (appData.settings.clients.find(c => c[0] === task.ClientName) || ["", "#64748b"])[1];
            
            const card = document.createElement('div');
            card.className = 'task-item-card';
            card.style.borderLeftColor = clientColor;
            
            // ข้อมูลงาน
            let html = `<h4>${task.ClientName} - ${task.TaskType}</h4>`;
            if (task.Platform) html += `<p><strong>แพลตฟอร์ม:</strong> ${task.Platform}</p>`;
            if (task.Notes) html += `<p><strong>หมายเหตุ:</strong> ${task.Notes}</p>`;
            if (task.ContentLink) html += `<p><a href="${task.ContentLink}" target="_blank" style="color:var(--primary); text-decoration:none;">🔗 เปิดดูลิงก์ผลงาน</a></p>`;
            
            // ปุ่มแก้ไข / ลบ โดยแนบ TaskID ไปด้วย
            html += `
                <div class="task-card-actions">
                    <button class="btn-outline" style="padding: 4px 12px; font-size:12px;" onclick="editTask('${task.TaskID}')">✏️ แก้ไข</button>
                    <button class="btn-danger-sm" onclick="deleteTask('${task.TaskID}')">🗑️ ลบ</button>
                </div>
            `;
            card.innerHTML = html;
            list.appendChild(card);
        });
    }
    document.getElementById('dayDetailModal').style.display = 'flex';
}

function openAddNewTaskFromDetail() {
    closeModal('dayDetailModal');
    openModal(currentSelectedDate); // เปิดโหมดสร้างใหม่
}

// ==== ระบบเพิ่ม และ แก้ไข ====
function openModal(dateStr = "", taskIdToEdit = null) {
    const form = document.getElementById('taskForm');
    form.reset();
    document.getElementById('editTaskId').value = ""; // รีเซ็ต ID

    if (taskIdToEdit) {
        // โหมดแก้ไข: ดึงข้อมูลเดิมมาใส่ฟอร์ม
        document.getElementById('modalTitle').innerText = "แก้ไขคิวงาน";
        const task = appData.tasks.find(t => String(t.TaskID) === String(taskIdToEdit));
        if (task) {
            document.getElementById('editTaskId').value = task.TaskID;
            document.getElementById('postDate').value = task.PostDate ? task.PostDate.split('T')[0] : "";
            document.getElementById('clientName').value = task.ClientName;
            document.getElementById('taskType').value = task.TaskType;
            document.getElementById('platform').value = task.Platform || "";
            document.getElementById('contentLink').value = task.ContentLink || "";
            document.getElementById('notes').value = task.Notes || "";
        }
    } else {
        // โหมดสร้างใหม่
        document.getElementById('modalTitle').innerText = "บันทึกคิวงานใหม่";
        if (dateStr) document.getElementById('postDate').value = dateStr;
    }
    
    document.getElementById('taskModal').style.display = 'flex';
}

function editTask(taskId) {
    closeModal('dayDetailModal');
    openModal("", taskId);
}

// ==== ระบบลบงาน ====
async function deleteTask(taskId) {
    if(!confirm("คุณต้องการลบคิวงานนี้ใช่หรือไม่? ข้อมูลที่ลบจะไม่สามารถกู้คืนได้")) return;
    
    try {
        closeModal('dayDetailModal');
        // แสดง loading ง่ายๆ บน UI หลัก
        document.getElementById('calendarGrid').innerHTML = '<div class="loading-state"><div class="spinner"></div><p>กำลังลบข้อมูล...</p></div>';
        
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", taskID: taskId })
        });
        
        location.reload(); // โหลดข้อมูลใหม่
    } catch (e) {
        alert("เกิดข้อผิดพลาดในการลบ");
        location.reload();
    }
}

// ==== ส่งข้อมูลฟอร์ม (Add / Edit) ====
document.getElementById('taskForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "กำลังซิงค์ข้อมูล..."; btn.disabled = true;

    const editId = document.getElementById('editTaskId').value;
    
    // กำหนดว่าเป็นการ add หรือ edit
    const payload = {
        action: editId ? "edit" : "add",
        taskID: editId,
        postDate: document.getElementById('postDate').value,
        clientName: document.getElementById('clientName').value,
        taskType: document.getElementById('taskType').value,
        platform: document.getElementById('platform').value,
        contentLink: document.getElementById('contentLink').value,
        notes: document.getElementById('notes').value
    };

    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        location.reload();
    } catch (err) {
        alert("บันทึกไม่สำเร็จ");
        btn.innerText = "บันทึกข้อมูล"; btn.disabled = false;
    }
};

// ==== ระบบ Dashboard ====
function openDashboard() {
    document.getElementById('dashModal').style.display = 'flex';
    
    const monthTasks = appData.tasks.filter(t => {
        if(!t.PostDate) return false;
        const d = new Date(t.PostDate);
        return d.getMonth() === viewedDate.getMonth() && d.getFullYear() === viewedDate.getFullYear();
    });

    let contentCount = 0; let otherCount = 0; const typeGroup = {};

    monthTasks.forEach(t => {
        if (t.Platform) contentCount++; else otherCount++;
        typeGroup[t.TaskType] = (typeGroup[t.TaskType] || 0) + 1;
    });

    document.getElementById('statTotal').innerText = monthTasks.length;
    document.getElementById('statContent').innerText = contentCount;
    document.getElementById('statOther').innerText = otherCount;

    if (summaryChart) summaryChart.destroy();
    const ctx = document.getElementById('summaryChart').getContext('2d');
    summaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeGroup),
            datasets: [{
                data: Object.values(typeGroup),
                backgroundColor: ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    });
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

init();
