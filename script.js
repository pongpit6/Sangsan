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
        document.getElementById('calendarGrid').innerHTML = "<p style='padding:20px;color:red'>เชื่อมต่อล้มเหลว</p>";
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
    
    pSel.innerHTML = '<option value="">-- แพลตฟอร์ม (ถ้ามี) --</option>';
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
    
    const mNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    document.getElementById('currentMonthLabel').innerText = `${mNames[month]} ${year + 543}`;

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
        if(i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) dayCell.classList.add('today');

        dayCell.innerHTML = `<div class="day-num">${i}</div><div class="task-container" id="day-tasks-${i}"></div>`;

        // กรองและเรียงตามเวลา
        const tasks = appData.tasks.filter(t => t.PostDate && t.PostDate.startsWith(dateStr))
                                   .sort((a,b) => (a.PostTime || "00:00").localeCompare(b.PostTime || "00:00"));

        tasks.forEach(task => {
            const clientColor = (appData.settings.clients.find(c => c[0] === task.ClientName) || ["", "#999"])[1];
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

// ระบบ Modal & Overlay Click
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function handleOverlayClick(e, id) {
    if (e.target.id === id) closeModal(id);
}

function openDayDetail(dateStr) {
    const d = new Date(dateStr);
    document.getElementById('detailDateTitle').innerText = `คิวงาน ${d.getDate()} / ${d.getMonth()+1} / ${d.getFullYear()+543}`;
    const list = document.getElementById('detailTaskList');
    list.innerHTML = '';
    
    const tasks = appData.tasks.filter(t => t.PostDate && t.PostDate.startsWith(dateStr))
                               .sort((a,b) => (a.PostTime || "00:00").localeCompare(b.PostTime || "00:00"));

    if (tasks.length === 0) {
        list.innerHTML = '<p style="text-align:center;padding:30px;color:#aaa">ไม่มีงานในวันนี้</p>';
    } else {
        tasks.forEach(t => {
            const color = (appData.settings.clients.find(c => c[0] === t.ClientName) || ["", "#3498db"])[1];
            const card = document.createElement('div');
            card.className = 'task-card';
            card.style.borderLeftColor = color;
            card.innerHTML = `
                ${t.PostTime ? `<span class="time-badge">⏰ ${t.PostTime} น.</span>` : ''}
                <h4>${t.ClientName} - ${t.TaskType}</h4>
                <p><b>📍 แพลตฟอร์ม:</b> ${t.Platform || '-'}</p>
                <p><b>📝 หมายเหตุ:</b> ${t.Notes || '-'}</p>
                ${t.ContentLink ? `<a href="${t.ContentLink}" target="_blank" style="color:var(--primary);font-size:12px;">🔗 เปิดลิงก์งาน</a>` : ''}
                <div class="task-actions">
                    <button class="btn-cancel" style="padding:5px 10px;font-size:11px" onclick="editTask('${t.TaskID}')">แก้ไข</button>
                    <button class="btn-cancel" style="padding:5px 10px;font-size:11px;color:red" onclick="deleteTask('${t.TaskID}')">ลบ</button>
                </div>
            `;
            list.appendChild(card);
        });
    }
    window.currentSelectedDate = dateStr;
    document.getElementById('dayDetailModal').style.display = 'flex';
}

function openModal(dateStr = "", editId = null) {
    const form = document.getElementById('taskForm');
    form.reset();
    document.getElementById('editTaskId').value = editId || "";
    document.getElementById('modalTitle').innerText = editId ? "แก้ไขงาน" : "บันทึกคิวงานใหม่";

    if (editId) {
        const t = appData.tasks.find(x => String(x.TaskID) === String(editId));
        if (t) {
            document.getElementById('postDate').value = t.PostDate ? t.PostDate.split('T')[0] : "";
            document.getElementById('postTime').value = t.PostTime || "";
            document.getElementById('clientName').value = t.ClientName;
            document.getElementById('taskType').value = t.TaskType;
            document.getElementById('platform').value = t.Platform || "";
            document.getElementById('contentLink').value = t.ContentLink || "";
            document.getElementById('notes').value = t.Notes || "";
        }
    } else if (dateStr) {
        document.getElementById('postDate').value = dateStr;
    }
    document.getElementById('taskModal').style.display = 'flex';
}

function openAddNewTaskFromDetail() { closeModal('dayDetailModal'); openModal(window.currentSelectedDate); }

function editTask(id) { closeModal('dayDetailModal'); openModal("", id); }

async function deleteTask(id) {
    if (!confirm("ลบงานนี้ใช่หรือไม่?")) return;
    try {
        closeModal('dayDetailModal');
        await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "delete", taskID: id }) });
        location.reload();
    } catch (e) { alert("ลบไม่สำเร็จ"); }
}

document.getElementById('taskForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;
    const editId = document.getElementById('editTaskId').value;
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
    } catch (err) { alert("ล้มเหลว"); btn.innerText = "บันทึก"; btn.disabled = false; }
};

// Dashboard
function openDashboard() {
    document.getElementById('dashModal').style.display = 'flex';
    const mTasks = appData.tasks.filter(t => {
        const d = new Date(t.PostDate);
        return d.getMonth() === viewedDate.getMonth() && d.getFullYear() === viewedDate.getFullYear();
    });
    let cCount = 0; let oCount = 0; const types = {};
    mTasks.forEach(t => { if (t.Platform) cCount++; else oCount++; types[t.TaskType] = (types[t.TaskType] || 0) + 1; });
    document.getElementById('statTotal').innerText = mTasks.length;
    document.getElementById('statContent').innerText = cCount;
    document.getElementById('statOther').innerText = oCount;
    if (chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('summaryChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(types), datasets: [{ data: Object.values(types), backgroundColor: ['#4361ee', '#f72585', '#4cc9f0', '#7209b7', '#ff9f1c'] }] },
        options: { cutout: '70%' }
    });
}

init();
