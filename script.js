// URL ของ Apps Script ล่าสุด (ต้องกด Deploy ใหม่ก่อนนำมาใส่)
const API_URL = "https://script.google.com/macros/s/AKfycbytaSlxPmMYtF6JWfpXD50WFeoPPd1tkFtb4_ZBScSSp_M_e3P85gdrpldL8vxqcFEO/exec";

let appData = { tasks: [], settings: { clients: [], types: [], platforms: [] } };
let viewedDate = new Date(); 
let chartInstance = null;

async function init() {
    try {
        const res = await fetch(API_URL);
        appData = await res.json();
        setupDropdowns();
        renderCalendar();
    } catch (e) {
        document.getElementById('calendarGrid').innerHTML = '<div style="padding:20px; text-align:center; color:red;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>';
    }
}

function setupDropdowns() {
    const cSel = document.getElementById('clientName');
    const tSel = document.getElementById('taskType');
    const pSel = document.getElementById('platform');

    cSel.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    appData.settings.clients.forEach(c => cSel.innerHTML += `<option value="${c[0]}">${c[0]}</option>`);
    
    tSel.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    appData.settings.types.forEach(t => tSel.innerHTML += `<option value="${t}">${t}</option>`);
    
    pSel.innerHTML = '<option value="">-- ไม่ระบุแพลตฟอร์ม --</option>';
    appData.settings.platforms.forEach(p => pSel.innerHTML += `<option value="${p}">${p}</option>`);
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
        // สร้าง String วันที่รูปแบบ YYYY-MM-DD เพื่อไปเทียบกับข้อมูลใน Sheet 
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }

        dayCell.innerHTML = `<div class="day-num">${i}</div><div class="task-container"></div>`;

        // กรองงานโดยเทียบ String วันที่ตรงๆ (ตัดปัญหา Timezone)
        const dailyTasks = appData.tasks.filter(t => t.PostDate === dateStr)
                                        .sort((a,b) => (a.PostTime || "23:59").localeCompare(b.PostTime || "23:59"));

        dailyTasks.forEach(task => {
            const clientColor = (appData.settings.clients.find(c => c[0] === task.ClientName) || ["", "#64748b"])[1];
            const tag = document.createElement('div');
            tag.className = 'task-tag';
            tag.style.backgroundColor = clientColor;
            tag.innerText = `${task.PostTime ? task.PostTime + ' ' : ''}${task.ClientName}`;
            dayCell.querySelector('.task-container').appendChild(tag);
        });

        dayCell.onclick = () => openDayDetail(dateStr);
        grid.appendChild(dayCell);
    }
}

// ==========================================
// ระบบ Modal และการคลิกปิด
// ==========================================
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// เพิ่มระบบคลิกพื้นที่ว่าง (Overlay) เพื่อปิดหน้าต่าง
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = "none";
    }
}

function openDayDetail(dateStr) {
    window.currentSelectedDate = dateStr;
    const d = new Date(dateStr);
    const mNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    document.getElementById('dayTitle').innerText = `คิวงาน ${d.getDate()} ${mNames[d.getMonth()]} ${d.getFullYear() + 543}`;
    const list = document.getElementById('detailList');
    list.innerHTML = '';

    const tasksToday = appData.tasks.filter(t => t.PostDate === dateStr)
                                      .sort((a,b) => (a.PostTime || "23:59").localeCompare(b.PostTime || "23:59"));

    if (tasksToday.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#94a3b8; padding: 20px;">ไม่มีคิวงานในวันนี้</p>';
    } else {
        tasksToday.forEach(t => {
            const clientColor = (appData.settings.clients.find(c => c[0] === t.ClientName) || ["", "#64748b"])[1];
            const card = document.createElement('div');
            card.className = 'task-item';
            card.style.borderLeftColor = clientColor;
            
            card.innerHTML = `
                ${t.PostTime ? `<div class="time-badge">⏰ ${t.PostTime} น.</div>` : ''}
                <h4>${t.ClientName} - ${t.TaskType}</h4>
                <p><strong>แพลตฟอร์ม:</strong> ${t.Platform || '-'}</p>
                <p><strong>หมายเหตุ:</strong> ${t.Notes || '-'}</p>
                ${t.ContentLink ? `<p><a href="${t.ContentLink}" target="_blank" style="color:var(--primary); text-decoration:none; font-weight:600;">🔗 เปิดลิงก์ผลงาน</a></p>` : ''}
                <div class="task-actions">
                    <button class="btn-edit" onclick="editTask('${t.TaskID}')">✏️ แก้ไข</button>
                    <button class="btn-delete" onclick="deleteTask('${t.TaskID}')">🗑️ ลบ</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
    document.getElementById('dayModal').style.display = 'flex';
}

function openForm(editId = null) {
    const form = document.getElementById('taskForm');
    form.reset();
    document.getElementById('editId').value = editId || "";
    document.getElementById('formTitle').innerText = editId ? "แก้ไขข้อมูลงาน" : "บันทึกคิวงานใหม่";

    if (editId) {
        const t = appData.tasks.find(x => String(x.TaskID) === String(editId));
        if (t) {
            document.getElementById('postDate').value = t.PostDate;
            document.getElementById('postTime').value = t.PostTime || "";
            document.getElementById('clientName').value = t.ClientName;
            document.getElementById('taskType').value = t.TaskType;
            document.getElementById('platform').value = t.Platform || "";
            document.getElementById('contentLink').value = t.ContentLink || "";
            document.getElementById('notes').value = t.Notes || "";
        }
    } else {
        document.getElementById('postDate').value = window.currentSelectedDate || "";
    }
    
    closeModal('dayModal'); // ปิดหน้า List ก่อนเปิด Form
    document.getElementById('taskModal').style.display = 'flex';
}

function openAddNewTaskFromDetail() { openForm(); }

function editTask(id) { openForm(id); }

async function deleteTask(id) {
    if(!confirm("ยืนยันการลบคิวงานนี้? (ไม่สามารถกู้คืนได้)")) return;
    try {
        closeModal('dayModal');
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "delete", taskID: id }) });
        location.reload();
    } catch (e) {
        alert("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
}

// จัดการการส่งฟอร์ม (Add / Edit)
document.getElementById('taskForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;

    const editId = document.getElementById('editId').value;
    const payload = {
        action: editId ? "edit" : "add",
        taskID: editId,
        postDate: document.getElementById('postDate').value,
        postTime: document.getElementById('postTime').value,
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

// ระบบ Dashboard
function openDashboard() {
    document.getElementById('dashModal').style.display = 'flex';
    
    const monthTasks = appData.tasks.filter(t => {
        if(!t.PostDate) return false;
        const [y, m] = t.PostDate.split('-');
        return parseInt(m) === (viewedDate.getMonth() + 1) && parseInt(y) === viewedDate.getFullYear();
    });

    let contentCount = 0; let otherCount = 0; const typeGroup = {};

    monthTasks.forEach(t => {
        if (t.Platform) contentCount++; else otherCount++;
        typeGroup[t.TaskType] = (typeGroup[t.TaskType] || 0) + 1;
    });

    document.getElementById('statTotal').innerText = monthTasks.length;
    document.getElementById('statContent').innerText = contentCount;
    document.getElementById('statOther').innerText = otherCount;

    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('summaryChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeGroup),
            datasets: [{
                data: Object.values(typeGroup),
                backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, cutout: '65%' }
    });
}

init();
