const API_URL = "https://script.google.com/macros/s/AKfycbytaSlxPmMYtF6JWfpXD50WFeoPPd1tkFtb4_ZBScSSp_M_e3P85gdrpldL8vxqcFEO/exec";

let appData = { tasks: [], settings: { clients: [], types: [], platforms: [] } };
let viewedDate = new Date(); 
let chartObj = null;

async function init() {
    try {
        const res = await fetch(API_URL);
        appData = await res.json();
        setupForm();
        renderCalendar();
    } catch (e) {
        alert("โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต");
    }
}

function setupForm() {
    const cS = document.getElementById('clientName');
    const tS = document.getElementById('taskType');
    const pS = document.getElementById('platform');

    cS.innerHTML = '<option value="">-- เลือกลูกค้า --</option>';
    appData.settings.clients.forEach(c => cS.innerHTML += `<option value="${c[0]}">${c[0]}</option>`);
    
    tS.innerHTML = '<option value="">-- เลือกประเภท --</option>';
    appData.settings.types.forEach(t => tS.innerHTML += `<option value="${t}">${t}</option>`);
    
    pS.innerHTML = '<option value="">-- แพลตฟอร์ม --</option>';
    appData.settings.platforms.forEach(p => pS.innerHTML += `<option value="${p}">${p}</option>`);
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    const y = viewedDate.getFullYear();
    const m = viewedDate.getMonth();
    
    const mNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    document.getElementById('currentMonthLabel').innerText = `${mNames[m]} ${y + 543}`;

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const d = document.createElement('div'); d.className = 'day-cell empty'; grid.appendChild(d);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        if(i === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear()) dayCell.classList.add('today');

        dayCell.innerHTML = `<div class="day-num">${i}</div><div class="task-box"></div>`;

        // กรองงาน (เทียบสตริงวันที่ตรงๆ)
        const dayTasks = appData.tasks.filter(t => t.PostDate === fullDate)
                                      .sort((a,b) => (a.PostTime || "00:00").localeCompare(b.PostTime || "00:00"));

        dayTasks.forEach(t => {
            const color = (appData.settings.clients.find(c => c[0] === t.ClientName) || ["", "#94a3b8"])[1];
            const tag = document.createElement('div');
            tag.className = 'task-tag';
            tag.style.backgroundColor = color;
            tag.innerText = `${t.PostTime ? t.PostTime + ' ' : ''}${t.ClientName}`;
            dayCell.querySelector('.task-box').appendChild(tag);
        });

        dayCell.onclick = () => openDay(fullDate);
        grid.appendChild(dayCell);
    }
}

// ระบบ Modal (กดปิดที่พื้นหลังได้)
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
window.onclick = (e) => { if(e.target.className === 'modal-overlay') e.target.style.display = 'none'; };

function openDay(date) {
    window.currentDate = date;
    const list = document.getElementById('detailList');
    list.innerHTML = '';
    
    const tasks = appData.tasks.filter(t => t.PostDate === date)
                               .sort((a,b) => (a.PostTime || "00:00").localeCompare(b.PostTime || "00:00"));

    tasks.forEach(t => {
        const color = (appData.settings.clients.find(c => c[0] === t.ClientName) || ["", "#3b82f6"])[1];
        const card = document.createElement('div');
        card.className = 'detail-item';
        card.style.borderLeftColor = color;
        card.innerHTML = `
            ${t.PostTime ? `<span class="time-tag">${t.PostTime} น.</span>` : ''}
            <h3 style="margin:0">${t.ClientName} - ${t.TaskType}</h3>
            <p style="margin:5px 0; color:#64748b">แพลตฟอร์ม: ${t.Platform || '-'}</p>
            <p style="margin:5px 0; font-size:13px">${t.Notes || '-'}</p>
            <div style="margin-top:10px">
                <button onclick="editT('${t.TaskID}')" style="cursor:pointer; padding:5px 10px; border-radius:5px; border:1px solid #ddd">แก้ไข</button>
                <button onclick="deleteT('${t.TaskID}')" style="cursor:pointer; padding:5px 10px; border-radius:5px; border:none; background:#fee2e2; color:#ef4444; margin-left:5px">ลบ</button>
            </div>
        `;
        list.appendChild(card);
    });
    
    document.getElementById('dayModal').style.display = 'flex';
}

function openForm(editId = null) {
    const f = document.getElementById('taskForm');
    f.reset();
    document.getElementById('editId').value = editId || "";
    document.getElementById('formTitle').innerText = editId ? "แก้ไขงาน" : "เพิ่มงานใหม่";
    
    if (editId) {
        const t = appData.tasks.find(x => x.TaskID === editId);
        if (t) {
            document.getElementById('postDate').value = t.PostDate;
            document.getElementById('postTime').value = t.PostTime;
            document.getElementById('clientName').value = t.ClientName;
            document.getElementById('taskType').value = t.TaskType;
            document.getElementById('platform').value = t.Platform;
            document.getElementById('contentLink').value = t.ContentLink;
            document.getElementById('notes').value = t.Notes;
        }
    } else {
        document.getElementById('postDate').value = window.currentDate || "";
    }
    
    closeModal('dayModal');
    document.getElementById('taskModal').style.display = 'flex';
}

async function deleteT(id) {
    if(!confirm("ลบงานนี้?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: "delete", taskID: id }) });
    location.reload();
}

function editT(id) { openForm(id); }

document.getElementById('taskForm').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.innerText = "กำลังบันทึก..."; btn.disabled = true;
    
    const eid = document.getElementById('editId').value;
    const payload = {
        action: eid ? "edit" : "add",
        taskID: eid,
        postDate: document.getElementById('postDate').value,
        postTime: document.getElementById('postTime').value,
        clientName: document.getElementById('clientName').value,
        taskType: document.getElementById('taskType').value,
        platform: document.getElementById('platform').value,
        contentLink: document.getElementById('contentLink').value,
        notes: document.getElementById('notes').value
    };

    await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    location.reload();
};

function changeMonth(s) { viewedDate.setMonth(viewedDate.getMonth() + s); renderCalendar(); }

init();
